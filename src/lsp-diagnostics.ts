import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

type IrisErrorKind = "ParseError" | "TypeError" | "RuntimeError" | "InternalError";

const IDENT_CHARS = /[A-Za-z0-9_!?-]/;

export function buildDiagnostic(
  errorMsg: string,
  textDocument: TextDocument,
  fallbackMessage?: string,
): Diagnostic {
  const kind = detectErrorKind(errorMsg);
  const message = cleanMessage(errorMsg, fallbackMessage);
  const range =
    inferRangeFromError(errorMsg, textDocument) ??
    fallbackRange(textDocument);

  return {
    severity: DiagnosticSeverity.Error,
    range,
    message,
    source: "iris",
    code: codeForKind(kind),
  };
}

function detectErrorKind(errorMsg: string): IrisErrorKind {
  if (errorMsg.startsWith("ParseError:")) return "ParseError";
  if (errorMsg.startsWith("TypeError:")) return "TypeError";
  if (errorMsg.startsWith("RuntimeError:")) return "RuntimeError";
  return "InternalError";
}

function cleanMessage(errorMsg: string, fallback?: string): string {
  if (!errorMsg) return fallback ?? "Unknown error";
  return errorMsg.replace(/^(ParseError|TypeError|RuntimeError):\s*/, "");
}

function codeForKind(kind: IrisErrorKind): string {
  switch (kind) {
    case "ParseError":
      return "IRIS_PARSE";
    case "TypeError":
      return "IRIS_TYPE";
    case "RuntimeError":
      return "IRIS_RUNTIME";
    case "InternalError":
      return "IRIS_INTERNAL";
  }
}

function inferRangeFromError(
  errorMsg: string,
  textDocument: TextDocument,
): Range | null {
  const lineCol = parseLineCol(errorMsg);
  if (lineCol) {
    return rangeFromLineCol(textDocument, lineCol.line, lineCol.character);
  }

  const token = extractTokenCandidate(errorMsg);
  if (token) {
    const index = textDocument.getText().indexOf(token);
    if (index !== -1) {
      const start = textDocument.positionAt(index);
      const end = textDocument.positionAt(index + token.length);
      return normalizeRange(textDocument, { start, end });
    }
  }

  return null;
}

function parseLineCol(
  errorMsg: string,
): { line: number; character: number } | null {
  const lineMatch = errorMsg.match(/line\s+(\d+)(?::(\d+))?/i);
  if (lineMatch) {
    const line = Math.max(0, parseInt(lineMatch[1], 10) - 1);
    const character = lineMatch[2]
      ? Math.max(0, parseInt(lineMatch[2], 10) - 1)
      : 0;
    return { line, character };
  }

  const atMatch = errorMsg.match(/at\s+(\d+):(\d+)/i);
  if (atMatch) {
    const line = Math.max(0, parseInt(atMatch[1], 10) - 1);
    const character = Math.max(0, parseInt(atMatch[2], 10) - 1);
    return { line, character };
  }

  const genericMatch = errorMsg.match(/\b(\d+):(\d+)\b/);
  if (genericMatch) {
    const line = Math.max(0, parseInt(genericMatch[1], 10) - 1);
    const character = Math.max(0, parseInt(genericMatch[2], 10) - 1);
    return { line, character };
  }

  return null;
}

function extractTokenCandidate(errorMsg: string): string | null {
  const patterns = [
    /Unknown variable: ([A-Za-z0-9_!?-]+)/,
    /Unknown function call: ([A-Za-z0-9_!?-]+)/,
    /Arity mismatch for ([A-Za-z0-9_!?-]+)/,
    /Duplicate argument name: ([A-Za-z0-9_!?-]+)/,
    /Unknown field ([A-Za-z0-9_!?-]+)/,
    /Cannot access field ([A-Za-z0-9_!?-]+)/,
    /no variant ([A-Za-z0-9_!?-]+)/,
  ];

  for (const pattern of patterns) {
    const match = errorMsg.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function rangeFromLineCol(
  textDocument: TextDocument,
  line: number,
  character: number,
): Range {
  const clampedLine = clampLine(textDocument, line);
  const lineText = getLineText(textDocument, clampedLine);
  const clampedChar = clampCharacter(lineText, character);
  const tokenRange = tokenRangeAt(lineText, clampedChar);

  return normalizeRange(textDocument, {
    start: { line: clampedLine, character: tokenRange.start },
    end: { line: clampedLine, character: tokenRange.end },
  });
}

function fallbackRange(textDocument: TextDocument): Range {
  const line = 0;
  const lineText = getLineText(textDocument, line);
  const end = Math.max(1, Math.min(lineText.length, 1));
  return normalizeRange(textDocument, {
    start: { line, character: 0 },
    end: { line, character: end },
  });
}

function clampLine(textDocument: TextDocument, line: number): number {
  if (textDocument.lineCount === 0) return 0;
  return Math.max(0, Math.min(textDocument.lineCount - 1, line));
}

function clampCharacter(lineText: string, character: number): number {
  return Math.max(0, Math.min(lineText.length, character));
}

function getLineText(textDocument: TextDocument, line: number): string {
  const text = textDocument.getText({
    start: { line, character: 0 },
    end: { line: line + 1, character: 0 },
  });
  return text.replace(/\r?\n$/, "");
}

function tokenRangeAt(
  lineText: string,
  character: number,
): { start: number; end: number } {
  let start = Math.min(character, lineText.length);
  let end = start;

  while (start > 0 && IDENT_CHARS.test(lineText[start - 1])) {
    start -= 1;
  }

  while (end < lineText.length && IDENT_CHARS.test(lineText[end])) {
    end += 1;
  }

  if (end === start && lineText.length > start) {
    end = start + 1;
  }

  return { start, end };
}

function normalizeRange(textDocument: TextDocument, range: Range): Range {
  const clampedStartLine = clampLine(textDocument, range.start.line);
  const startLineText = getLineText(textDocument, clampedStartLine);
  const clampedStartChar = clampCharacter(
    startLineText,
    range.start.character,
  );

  const clampedEndLine = clampLine(textDocument, range.end.line);
  const endLineText = getLineText(textDocument, clampedEndLine);
  let clampedEndChar = clampCharacter(endLineText, range.end.character);

  if (
    clampedEndLine < clampedStartLine ||
    (clampedEndLine === clampedStartLine && clampedEndChar < clampedStartChar)
  ) {
    clampedEndChar = clampedStartChar;
  }

  if (
    clampedEndLine === clampedStartLine &&
    clampedEndChar === clampedStartChar &&
    clampedEndChar < endLineText.length
  ) {
    clampedEndChar = clampedStartChar + 1;
  }

  return {
    start: { line: clampedStartLine, character: clampedStartChar },
    end: { line: clampedEndLine, character: clampedEndChar },
  };
}
