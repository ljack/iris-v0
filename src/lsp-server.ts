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
import { Expr, IrisType, Program, SourceSpan } from "./types";
import { getBuiltinDoc } from "./lsp-docs";

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
const importProgramsByUri = new Map<
  string,
  Map<string, { uri: string; program: Program }>
>();
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
      declarationProvider: true,
      typeDefinitionProvider: true,
      implementationProvider: true,
      referencesProvider: true,
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
  const name = symbolAtPosition(document, params.position);
  if (!name) {
    return null;
  }

  const builtin = getBuiltinDoc(name);
  if (builtin) {
    return {
      contents: {
        kind: "markdown",
        value: builtin.markdown,
      },
    };
  }

  const program = programsByUri.get(params.textDocument.uri);
  const imports = importProgramsByUri.get(params.textDocument.uri);
  const doc = findDocForSymbol(name, program, imports);
  if (!doc) {
    return null;
  }

  return {
    contents: {
      kind: "markdown",
      value: doc,
    },
  };
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

  if (program && !name.includes(".")) {
    const localDef = program.defs.find(
      (d) =>
        (d.kind === "DefFn" || d.kind === "DefTool" || d.kind === "TypeDef") &&
        d.name === name &&
        d.nameSpan,
    );
    if (localDef?.nameSpan) {
      return [
        {
          uri: params.textDocument.uri,
          range: spanToRange(localDef.nameSpan),
        },
      ];
    }
  }

  if (program && name.includes(".")) {
    const [alias, fnName] = name.split(".");
    const imports = importProgramsByUri.get(params.textDocument.uri);
    const imported = imports?.get(alias);
    if (imported) {
      const def = imported.program.defs.find(
        (d) =>
          (d.kind === "DefFn" || d.kind === "DefTool") &&
          d.name === fnName &&
          d.nameSpan,
      );
      if (def?.nameSpan) {
        return [{ uri: imported.uri, range: spanToRange(def.nameSpan) }];
      }
      if (imported.program.module?.nameSpan) {
        return [
          {
            uri: imported.uri,
            range: spanToRange(imported.program.module.nameSpan),
          },
        ];
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
      const local = locations.find(
        (loc) => loc.uri === params.textDocument.uri,
      );
      if (local) {
        return [local];
      }
      return locations;
    }
  }

  const builtinDoc = getBuiltinDoc(name);
  if (builtinDoc) {
    const docsLocation = findBuiltinDocLocation(name);
    if (docsLocation) {
      return [docsLocation];
    }
  }
  return null;
});

connection.onDeclaration((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return null;
  }
  const name = symbolAtPosition(doc, params.position);
  if (!name) {
    return null;
  }
  const program = programsByUri.get(params.textDocument.uri);
  const locations = resolveDefinitionLocations(
    name,
    params.textDocument.uri,
    program,
  );
  return locations ?? null;
});

connection.onTypeDefinition((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return null;
  }
  const name = symbolAtPosition(doc, params.position);
  if (!name) {
    return null;
  }
  const program = programsByUri.get(params.textDocument.uri);
  const typeDefs = resolveTypeDefinitionLocations(
    name,
    params.textDocument.uri,
    program,
  );
  if (typeDefs && typeDefs.length > 0) {
    return typeDefs;
  }
  return resolveDefinitionLocations(name, params.textDocument.uri, program) ?? null;
});

connection.onImplementation((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return null;
  }
  const name = symbolAtPosition(doc, params.position);
  if (!name) {
    return null;
  }
  const program = programsByUri.get(params.textDocument.uri);
  return resolveDefinitionLocations(name, params.textDocument.uri, program) ?? null;
});

connection.onReferences(async (params) => {
  const doc =
    documents.get(params.textDocument.uri) ??
    loadDocumentFromUri(params.textDocument.uri);
  if (!doc) {
    return null;
  }
  const name = symbolAtPosition(doc, params.position);
  if (!name) {
    return null;
  }

  await ensureWorkspaceIndexed();

  const references: Location[] = [];
  const seen = new Set<string>();
  const refsByUri = new Map<string, number>();

  const addLocation = (uri: string, range: Range) => {
    const key = `${uri}:${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
    if (seen.has(key)) return;
    seen.add(key);
    references.push({ uri, range });
    refsByUri.set(uri, (refsByUri.get(uri) ?? 0) + 1);
  };

  for (const [uri, program] of programsByUri.entries()) {
    collectReferencesFromProgram(program, name, uri, addLocation);
  }

  for (const [uri, program] of programsByUri.entries()) {
    if ((refsByUri.get(uri) ?? 0) > 0) continue;
    const text = loadTextForUri(uri, program);
    if (!text) continue;
    for (const range of findTextOccurrences(text, name)) {
      addLocation(uri, range);
    }
  }

  return references;
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

function resolveDefinitionLocations(
  name: string,
  uri: string,
  program?: Program,
): Location[] | null {
  if (program && !name.includes(".")) {
    const localDef = program.defs.find(
      (d) =>
        (d.kind === "DefFn" ||
          d.kind === "DefTool" ||
          d.kind === "DefConst" ||
          d.kind === "TypeDef") &&
        d.name === name &&
        d.nameSpan,
    );
    if (localDef?.nameSpan) {
      return [{ uri, range: spanToRange(localDef.nameSpan) }];
    }
  }

  if (program && name.includes(".")) {
    const [alias, fnName] = name.split(".");
    const imports = importProgramsByUri.get(uri);
    const imported = imports?.get(alias);
    if (imported) {
      const def = imported.program.defs.find(
        (d) =>
          (d.kind === "DefFn" ||
            d.kind === "DefTool" ||
            d.kind === "DefConst" ||
            d.kind === "TypeDef") &&
          d.name === fnName &&
          d.nameSpan,
      );
      if (def?.nameSpan) {
        return [{ uri: imported.uri, range: spanToRange(def.nameSpan) }];
      }
      if (imported.program.module?.nameSpan) {
        return [
          {
            uri: imported.uri,
            range: spanToRange(imported.program.module.nameSpan),
          },
        ];
      }
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
      const local = locations.find((loc) => loc.uri === uri);
      if (local) {
        return [local];
      }
      return locations;
    }
  }

  const builtinDoc = getBuiltinDoc(name);
  if (builtinDoc) {
    const docsLocation = findBuiltinDocLocation(name);
    if (docsLocation) {
      return [docsLocation];
    }
  }

  return null;
}

function resolveTypeDefinitionLocations(
  name: string,
  uri: string,
  program?: Program,
): Location[] | null {
  if (program && !name.includes(".")) {
    const localDef = program.defs.find(
      (d) => d.kind === "TypeDef" && d.name === name && d.nameSpan,
    );
    if (localDef?.nameSpan) {
      return [{ uri, range: spanToRange(localDef.nameSpan) }];
    }
  }

  if (program && name.includes(".")) {
    const [alias, typeName] = name.split(".");
    const imports = importProgramsByUri.get(uri);
    const imported = imports?.get(alias);
    if (imported) {
      const def = imported.program.defs.find(
        (d) => d.kind === "TypeDef" && d.name === typeName && d.nameSpan,
      );
      if (def?.nameSpan) {
        return [{ uri: imported.uri, range: spanToRange(def.nameSpan) }];
      }
    }
  }

  return null;
}

async function ensureWorkspaceIndexed(): Promise<void> {
  for (const root of workspaceRoots) {
    const irisFiles = await collectIrisFiles(root);
    for (const filePath of irisFiles) {
      const uri = pathToFileURL(filePath).toString();
      if (programsByUri.has(uri)) continue;
      let text = "";
      try {
        text = await fs.promises.readFile(filePath, "utf8");
      } catch {
        continue;
      }
      updateIndexForUri(uri, text);
    }
  }
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
  importProgramsByUri.delete(uri);
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
  const byAlias = new Map<string, { uri: string; program: Program }>();

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
    byAlias.set(imp.alias, { uri: importedUri, program: importedProgram });
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
  if (byAlias.size > 0) {
    importProgramsByUri.set(uri, byAlias);
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

function collectReferencesFromProgram(
  program: Program,
  name: string,
  uri: string,
  addLocation: (uri: string, range: Range) => void,
): void {
  if (program.module?.name === name && program.module.nameSpan) {
    addLocation(uri, spanToRange(program.module.nameSpan));
  }

  for (const def of program.defs) {
    if (def.name === name && def.nameSpan) {
      addLocation(uri, spanToRange(def.nameSpan));
    }
    if ("type" in def && def.type) {
      collectTypeReferences(def.type, name, uri, addLocation);
    }
    if (def.kind === "DefFn") {
      for (const arg of def.args) {
        collectTypeReferences(arg.type, name, uri, addLocation);
      }
      collectTypeReferences(def.ret, name, uri, addLocation);
      collectExprReferences(def.body, name, uri, addLocation);
    }
    if (def.kind === "DefTool") {
      for (const arg of def.args) {
        collectTypeReferences(arg.type, name, uri, addLocation);
      }
      collectTypeReferences(def.ret, name, uri, addLocation);
    }
    if (def.kind === "DefConst") {
      collectExprReferences(def.value, name, uri, addLocation);
    }
    if (def.kind === "TypeDef") {
      collectTypeReferences(def.type, name, uri, addLocation);
    }
  }
}

function collectExprReferences(
  expr: Expr,
  name: string,
  uri: string,
  addLocation: (uri: string, range: Range) => void,
): void {
  if (!expr) return;
  switch (expr.kind) {
    case "Literal":
      return;
    case "Var":
      if (expr.name === name && expr.span) {
        addLocation(uri, spanToRange(expr.span));
      }
      return;
    case "Let":
      collectExprReferences(expr.value, name, uri, addLocation);
      collectExprReferences(expr.body, name, uri, addLocation);
      return;
    case "If":
      collectExprReferences(expr.cond, name, uri, addLocation);
      collectExprReferences(expr.then, name, uri, addLocation);
      collectExprReferences(expr.else, name, uri, addLocation);
      return;
    case "Match":
      collectExprReferences(expr.target, name, uri, addLocation);
      for (const c of expr.cases) {
        if (c.tag === name && c.tagSpan) {
          addLocation(uri, spanToRange(c.tagSpan));
        }
        collectExprReferences(c.body, name, uri, addLocation);
      }
      return;
    case "Call":
      if (expr.fn === name && expr.fnSpan) {
        addLocation(uri, spanToRange(expr.fnSpan));
      }
      for (const arg of expr.args) {
        collectExprReferences(arg, name, uri, addLocation);
      }
      return;
    case "Intrinsic":
      for (const arg of expr.args) {
        collectExprReferences(arg, name, uri, addLocation);
      }
      return;
    case "List":
      for (const item of expr.items) {
        collectExprReferences(item, name, uri, addLocation);
      }
      if (expr.typeArg) {
        collectTypeReferences(expr.typeArg, name, uri, addLocation);
      }
      return;
    case "Tuple":
      for (const item of expr.items) {
        collectExprReferences(item, name, uri, addLocation);
      }
      return;
    case "Fold":
      collectExprReferences(expr.list, name, uri, addLocation);
      collectExprReferences(expr.init, name, uri, addLocation);
      collectExprReferences(expr.fn, name, uri, addLocation);
      return;
    case "Lambda":
      for (const arg of expr.args) {
        collectTypeReferences(arg.type, name, uri, addLocation);
      }
      collectTypeReferences(expr.ret, name, uri, addLocation);
      collectExprReferences(expr.body, name, uri, addLocation);
      return;
    case "Record":
      for (const field of expr.fields) {
        collectExprReferences(field, name, uri, addLocation);
      }
      return;
    case "Tagged":
      collectExprReferences(expr.value, name, uri, addLocation);
      return;
    default:
      return;
  }
}

function collectTypeReferences(
  type: IrisType,
  name: string,
  uri: string,
  addLocation: (uri: string, range: Range) => void,
): void {
  if (!type) return;
  const typeName = "type" in type ? type.type : undefined;
  if (typeName && typeName === name && type.span) {
    addLocation(uri, spanToRange(type.span));
  }
  if ("type" in type && type.type === "Named" && type.name === name && type.span) {
    addLocation(uri, spanToRange(type.span));
  }

  switch (type.type) {
    case "Option":
      collectTypeReferences(type.inner, name, uri, addLocation);
      return;
    case "Result":
      collectTypeReferences(type.ok, name, uri, addLocation);
      collectTypeReferences(type.err, name, uri, addLocation);
      return;
    case "List":
      collectTypeReferences(type.inner, name, uri, addLocation);
      return;
    case "Tuple":
      for (const item of type.items) {
        collectTypeReferences(item, name, uri, addLocation);
      }
      return;
    case "Record":
      for (const value of Object.values(type.fields)) {
        collectTypeReferences(value, name, uri, addLocation);
      }
      return;
    case "Map":
      collectTypeReferences(type.key, name, uri, addLocation);
      collectTypeReferences(type.value, name, uri, addLocation);
      return;
    case "Fn":
      for (const arg of type.args) {
        collectTypeReferences(arg, name, uri, addLocation);
      }
      collectTypeReferences(type.ret, name, uri, addLocation);
      return;
    case "Union":
      for (const value of Object.values(type.variants)) {
        collectTypeReferences(value, name, uri, addLocation);
      }
      return;
    default:
      return;
  }
}

function loadTextForUri(uri: string, program?: Program): string | null {
  const doc = documents.get(uri);
  if (doc) return doc.getText();
  const filePath = uriToPath(uri);
  if (!filePath) return null;
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function loadDocumentFromUri(uri: string): TextDocument | null {
  const text = loadTextForUri(uri);
  if (text == null) return null;
  return TextDocument.create(uri, "iris", 1, text);
}

function findTextOccurrences(text: string, name: string): Range[] {
  if (!name) return [];
  const ranges: Range[] = [];
  const isIdent = (ch: string) => /[A-Za-z0-9_!?\\.-]/.test(ch);
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      lineStarts.push(i + 1);
    }
  }

  const positionAt = (index: number) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= index) {
        if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > index) {
          return { line: mid, character: index - lineStarts[mid] };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return { line: 0, character: index };
  };

  let index = 0;
  while (index <= text.length - name.length) {
    const found = text.indexOf(name, index);
    if (found === -1) break;
    const before = found > 0 ? text[found - 1] : "";
    const after = found + name.length < text.length ? text[found + name.length] : "";
    if ((before === "" || !isIdent(before)) && (after === "" || !isIdent(after))) {
      const start = positionAt(found);
      const end = positionAt(found + name.length);
      ranges.push({ start, end });
    }
    index = found + name.length;
  }

  return ranges;
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

function findBuiltinDocLocation(name: string): Location | null {
  if (workspaceRoots.length === 0) {
    return null;
  }
  for (const root of workspaceRoots) {
    const docPath = path.join(root, "docs", "stdlib_types.md");
    let text = "";
    try {
      text = fs.readFileSync(docPath, "utf8");
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    const heading = `## ${name}`;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === heading) {
        return {
          uri: pathToFileURL(docPath).toString(),
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: lines[i].length },
          },
        };
      }
    }
  }
  return null;
}

function findDocForSymbol(
  name: string,
  program?: Program,
  imports?: Map<string, { uri: string; program: Program }>,
): string | null {
  if (!program) return null;

  if (name.includes(".") && imports) {
    const [alias, fnName] = name.split(".");
    const imported = imports.get(alias);
    if (imported) {
      const def = imported.program.defs.find(
        (d) => (d.kind === "DefFn" || d.kind === "DefTool") && d.name === fnName,
      );
      if (def && "doc" in def && def.doc) {
        return `**${name}**\\n\\n${def.doc}`;
      }
    }
  }

  const def = program.defs.find(
    (d) => (d.kind === "DefFn" || d.kind === "DefTool") && d.name === name,
  );
  if (def && "doc" in def && def.doc) {
    return `**${name}**\\n\\n${def.doc}`;
  }

  return null;
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
