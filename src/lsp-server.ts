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
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { check } from "./main";
import { buildDiagnostic } from "./lsp-diagnostics";

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", "("],
      },
      hoverProvider: true,
      definitionProvider: false,
      referencesProvider: false,
    },
  };
  return result;
});

connection.onInitialized(() => {
  connection.console.log("IRIS Language Server initialized");
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
  validateIrisDocument(change.document);
});

// Also validate when document is opened
documents.onDidOpen((event) => {
  validateIrisDocument(event.document);
});

// Validate IRIS document using the actual parser and type checker
async function validateIrisDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    // Run the IRIS parser and type checker
    const result = check(text, {}, false);

    if (!result.success) {
      // Parse the error message to extract useful information
      const errorMsg = result.error as string;
      diagnostics.push(buildDiagnostic(errorMsg, textDocument));
    }
  } catch (e: any) {
    // If there's an unexpected error, report it as a diagnostic
    diagnostics.push({
      ...buildDiagnostic(`InternalError: ${e.message}`, textDocument),
    });
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);
connection.listen();
