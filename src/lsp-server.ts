#!/usr/bin/env node

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  Location,
  Range,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { check } from "./main";
import path from "path";
import fs from "fs";
import { buildDiagnosticsForError } from "./lsp-diagnostics";
import {
  collectIrisFiles,
  uriToPath,
  resolveImportFile,
  loadImportModules,
} from "./lsp-workspace";
import { pathToFileURL } from "url";
import { Parser } from "./sexp/parser";
import { Program, SourceSpan } from "./types";

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let workspaceRoots: string[] = [];
let clientSupportsWatch = false;
const definitionIndex = new Map<string, Location[]>();
const definitionsByUri = new Map<string, Set<string>>();
const programsByUri = new Map<string, Program>();
const modulesByUri = new Map<string, Record<string, string>>();
const qualifiedDefinitionsByUri = new Map<string, Map<string, Location[]>>();

connection.onInitialize((params: InitializeParams) => {
  workspaceRoots = getWorkspaceRoots(params);
  clientSupportsWatch = !!params.capabilities.workspace?.didChangeWatchedFiles
    ?.dynamicRegistration;
  const versions = getVersionInfo();
  const result: InitializeResult = {
    serverInfo: {
      name: "Iris LSP",
      version: versions.lspVersion,
    },
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", "("],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: false,
    },
  };
  return result;
});

connection.onInitialized(() => {
  const versions = getVersionInfo();
  connection.console.log(
    `IRIS Language Server initialized (iris-v0 ${versions.irisVersion}, lsp ${versions.lspVersion})`,
  );
  publishWorkspaceDiagnostics().catch((err) => {
    connection.console.error(`Workspace diagnostics failed: ${err?.message ?? err}`);
  });
  registerFileWatcher().catch((err) => {
    connection.console.error(`File watcher registration failed: ${err?.message ?? err}`);
  });
});

// Provide completions for IRIS keywords and types
connection.onCompletion((_textDocumentPosition) => {
  const keywords: CompletionItem[] = [
    { label: "program", kind: CompletionItemKind.Keyword },
    { label: "module", kind: CompletionItemKind.Keyword },
    { label: "imports", kind: CompletionItemKind.Keyword },
    { label: "import", kind: CompletionItemKind.Keyword },
    { label: "defs", kind: CompletionItemKind.Keyword },
    { label: "deffn", kind: CompletionItemKind.Keyword },
    { label: "deftool", kind: CompletionItemKind.Keyword },
    { label: "deftype", kind: CompletionItemKind.Keyword },
    { label: "defconst", kind: CompletionItemKind.Keyword },
    { label: "let", kind: CompletionItemKind.Keyword },
    { label: "if", kind: CompletionItemKind.Keyword },
    { label: "call", kind: CompletionItemKind.Keyword },
    { label: "match", kind: CompletionItemKind.Keyword },
    { label: "case", kind: CompletionItemKind.Keyword },
    { label: "tag", kind: CompletionItemKind.Keyword },
    { label: "name", kind: CompletionItemKind.Property },
    { label: "args", kind: CompletionItemKind.Property },
    { label: "ret", kind: CompletionItemKind.Property },
    { label: "eff", kind: CompletionItemKind.Property },
    { label: "body", kind: CompletionItemKind.Property },
  ];

  const types: CompletionItem[] = [
    { label: "I64", kind: CompletionItemKind.TypeParameter },
    { label: "Bool", kind: CompletionItemKind.TypeParameter },
    { label: "Str", kind: CompletionItemKind.TypeParameter },
    { label: "List", kind: CompletionItemKind.TypeParameter },
    { label: "Tuple", kind: CompletionItemKind.TypeParameter },
    { label: "Record", kind: CompletionItemKind.TypeParameter },
    { label: "Option", kind: CompletionItemKind.TypeParameter },
    { label: "Result", kind: CompletionItemKind.TypeParameter },
    { label: "Fn", kind: CompletionItemKind.TypeParameter },
  ];

  return [...keywords, ...types];
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// Provide hover information
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const position = params.position;
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 },
  });

  // Simple hover: show information about keywords
  if (line.includes("deffn")) {
    return {
      contents: {
        kind: "markdown",
        value:
          "**deffn**: Define a function\n\n```iris\n(deffn (name foo) (args (x I64)) (ret I64) (eff !Pure) (body ...))\n```",
      },
    };
  }

  return null;
});

// Document change events
documents.onDidChangeContent((change) => {
  updateIndexForUri(change.document.uri, change.document.getText());
  validateIrisDocument(change.document);
});

// Also validate when document is opened
documents.onDidOpen((event) => {
  updateIndexForUri(event.document.uri, event.document.getText());
  validateIrisDocument(event.document);
});

connection.onDidChangeWatchedFiles((event) => {
  handleWatchedFiles(event.changes).catch((err) => {
    connection.console.error(`Watched files handling failed: ${err?.message ?? err}`);
  });
});

connection.onDefinition((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return null;
  }
  const name = symbolAtPosition(doc, params.position);
  if (!name) {
    return null;
  }
  const program = programsByUri.get(params.textDocument.uri);

  if (program && name.includes(".")) {
    const [alias, fnName] = name.split(".");
    const importDecl = program.imports.find((imp) => imp.alias === alias);
    if (importDecl) {
      const filePath = uriToPath(params.textDocument.uri);
      if (filePath) {
        const resolved = resolveImportFile(
          importDecl.path,
          filePath,
          workspaceRoots,
        );
        if (resolved) {
          const text = fs.readFileSync(resolved, "utf8");
          const importedProgram = parseProgram(text);
          if (importedProgram) {
            const importedUri = pathToFileURL(resolved).toString();
            const def = importedProgram.defs.find(
              (d) =>
                (d.kind === "DefFn" || d.kind === "DefTool") &&
                d.name === fnName &&
                d.nameSpan,
            );
            if (def?.nameSpan) {
              return [
                { uri: importedUri, range: spanToRange(def.nameSpan) },
              ];
            }
            if (importedProgram.module?.nameSpan) {
              return [
                {
                  uri: importedUri,
                  range: spanToRange(importedProgram.module.nameSpan),
                },
              ];
            }
          }
        }
      }
    }
  }
  const byUri = qualifiedDefinitionsByUri.get(params.textDocument.uri);
  if (byUri && name.includes(".")) {
    const qualified = byUri.get(name);
    if (qualified && qualified.length > 0) {
      return qualified;
    }
  }

  const candidates = new Set<string>();
  candidates.add(name);
  if (name.includes(".")) {
    candidates.add(name.split(".").pop() || name);
  }
  for (const candidate of candidates) {
    const locations = definitionIndex.get(candidate);
    if (locations && locations.length > 0) {
      return locations;
    }
  }
  return null;
});

// Validate IRIS document using the actual parser and type checker
async function validateIrisDocument(textDocument: TextDocument): Promise<void> {
  const diagnostics = computeDiagnostics(textDocument);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);
connection.listen();

function computeDiagnostics(textDocument: TextDocument): Diagnostic[] {
  const text = textDocument.getText();
  const modules = modulesByUri.get(textDocument.uri) || {};
  try {
    const result = check(text, modules, false);
    if (!result.success) {
      const errorMsg = result.error as string;
      const program = programsByUri.get(textDocument.uri);
      return buildDiagnosticsForError(errorMsg, textDocument, program);
    }
    return [];
  } catch (e: any) {
    const program = programsByUri.get(textDocument.uri);
    return buildDiagnosticsForError(`InternalError: ${e.message}`, textDocument, program);
  }
}

async function publishWorkspaceDiagnostics(): Promise<void> {
  for (const root of workspaceRoots) {
    const irisFiles = await collectIrisFiles(root);
    for (const filePath of irisFiles) {
      let text = "";
      try {
        text = await fs.promises.readFile(filePath, "utf8");
      } catch {
        continue;
      }
      const uri = pathToFileURL(filePath).toString();
      updateIndexForUri(uri, text);
      const doc = TextDocument.create(uri, "iris", 1, text);
      const diagnostics = computeDiagnostics(doc);
      connection.sendDiagnostics({ uri, diagnostics });
    }
  }
}

async function registerFileWatcher(): Promise<void> {
  if (!clientSupportsWatch) {
    return;
  }
  await connection.client.register(DidChangeWatchedFilesNotification.type, {
    watchers: [{ globPattern: "**/*.iris" }],
  });
}

async function handleWatchedFiles(
  changes: { uri: string; type: FileChangeType }[],
): Promise<void> {
  for (const change of changes) {
    if (change.type === FileChangeType.Deleted) {
      connection.sendDiagnostics({ uri: change.uri, diagnostics: [] });
      removeIndexForUri(change.uri);
      continue;
    }

    const openDoc = documents.get(change.uri);
    if (openDoc) {
      connection.sendDiagnostics({
        uri: change.uri,
        diagnostics: computeDiagnostics(openDoc),
      });
      continue;
    }

    const filePath = uriToPath(change.uri);
    if (!filePath) {
      continue;
    }

    let text = "";
    try {
      text = await fs.promises.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    updateIndexForUri(change.uri, text);
    const doc = TextDocument.create(change.uri, "iris", 1, text);
    connection.sendDiagnostics({
      uri: change.uri,
      diagnostics: computeDiagnostics(doc),
    });
  }
}

function updateIndexForUri(uri: string, text: string): void {
  removeIndexForUri(uri);
  const program = parseProgram(text);
  if (!program) {
    return;
  }
  programsByUri.set(uri, program);
  const filePath = uriToPath(uri);
  if (filePath) {
    modulesByUri.set(uri, loadImportModules(filePath, program, workspaceRoots));
  }
  const defs = new Set<string>();
  for (const def of program.defs) {
    if (!def.nameSpan) continue;
    const range = spanToRange(def.nameSpan);
    const location: Location = { uri, range };
    const existing = definitionIndex.get(def.name) || [];
    existing.push(location);
    definitionIndex.set(def.name, existing);
    defs.add(def.name);
  }
  if (defs.size > 0) {
    definitionsByUri.set(uri, defs);
  }
  indexImportedDefinitions(uri, program);
}

function removeIndexForUri(uri: string): void {
  const existing = definitionsByUri.get(uri);
  if (!existing) return;
  for (const name of existing) {
    const locations = definitionIndex.get(name);
    if (!locations) continue;
    const remaining = locations.filter((loc) => loc.uri !== uri);
    if (remaining.length > 0) {
      definitionIndex.set(name, remaining);
    } else {
      definitionIndex.delete(name);
    }
  }
  definitionsByUri.delete(uri);
  programsByUri.delete(uri);
  modulesByUri.delete(uri);
  qualifiedDefinitionsByUri.delete(uri);
}

function parseProgram(text: string): Program | null {
  try {
    const parser = new Parser(text, false);
    return parser.parse();
  } catch {
    return null;
  }
}

function indexImportedDefinitions(uri: string, program: Program): void {
  const filePath = uriToPath(uri);
  if (!filePath || workspaceRoots.length === 0) {
    return;
  }

  const byUri = new Map<string, Location[]>();

  for (const imp of program.imports) {
    const resolved = resolveImportFile(imp.path, filePath, workspaceRoots);
    if (!resolved) {
      continue;
    }
    let text = "";
    try {
      text = fs.readFileSync(resolved, "utf8");
    } catch {
      continue;
    }
    const importedProgram = parseProgram(text);
    if (!importedProgram) {
      continue;
    }
    const importedUri = pathToFileURL(resolved).toString();
    for (const def of importedProgram.defs) {
      if (!def.nameSpan) continue;
      const range = spanToRange(def.nameSpan);
      const location: Location = { uri: importedUri, range };
      const qualifiedName = `${imp.alias}.${def.name}`;
      const existing = byUri.get(qualifiedName) || [];
      existing.push(location);
      byUri.set(qualifiedName, existing);
    }
  }

  if (byUri.size > 0) {
    qualifiedDefinitionsByUri.set(uri, byUri);
  }
}

function spanToRange(span: SourceSpan): Range {
  const line = Math.max(0, span.line - 1);
  const startChar = Math.max(0, span.col - 1);
  const endChar = Math.max(startChar + 1, startChar + span.len);
  return {
    start: { line, character: startChar },
    end: { line, character: endChar },
  };
}

function symbolAtPosition(
  doc: TextDocument,
  position: { line: number; character: number },
): string | null {
  const lineText = doc
    .getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line + 1, character: 0 },
    })
    .replace(/\r?\n$/, "");
  const isIdent = (ch: string) => /[A-Za-z0-9_!?\\.-]/.test(ch);
  let start = Math.min(position.character, lineText.length);
  let end = start;
  while (start > 0 && isIdent(lineText[start - 1])) {
    start -= 1;
  }
  while (end < lineText.length && isIdent(lineText[end])) {
    end += 1;
  }
  if (start === end) return null;
  return lineText.slice(start, end);
}

function getWorkspaceRoots(params: InitializeParams): string[] {
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    return params.workspaceFolders
      .map((folder) => uriToPath(folder.uri))
      .filter((root): root is string => !!root);
  }
  if (params.rootUri) {
    const root = uriToPath(params.rootUri);
    return root ? [root] : [];
  }
  return [];
}

function getVersionInfo(): { irisVersion: string; lspVersion: string } {
  const fallback = { irisVersion: "unknown", lspVersion: "unknown" };
  try {
    const pkgPath = path.join(__dirname, "..", "..", "package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    const version = pkg.version ?? "unknown";
    return { irisVersion: version, lspVersion: version };
  } catch {
    return fallback;
  }
}
