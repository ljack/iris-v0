import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Range,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Expr, Program, SourceSpan } from "./types";

type IrisErrorKind = "ParseError" | "TypeError" | "RuntimeError" | "InternalError";

const IDENT_CHARS = /[A-Za-z0-9_!?\\.-]/;
const TOKEN_PATTERN = /[A-Za-z0-9_!?\\.-]+/;

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

export function buildDiagnosticsForError(
  errorMsg: string,
  textDocument: TextDocument,
  program?: Program,
): Diagnostic[] {
  const primary = buildDiagnostic(errorMsg, textDocument);
  const extras = buildRelatedDiagnostics(errorMsg, textDocument, program);
  if (extras.related.length > 0) {
    primary.relatedInformation = extras.related;
  }
  return [primary, ...extras.diagnostics];
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

function buildRelatedDiagnostics(
  errorMsg: string,
  textDocument: TextDocument,
  program?: Program,
): { related: DiagnosticRelatedInformation[]; diagnostics: Diagnostic[] } {
  const related: DiagnosticRelatedInformation[] = [];
  const diagnostics: Diagnostic[] = [];

  const extraClose = parseExtraClosingParen(errorMsg);
  if (extraClose) {
    const range = rangeFromLineCol(
      textDocument,
      extraClose.line,
      extraClose.character,
    );
    related.push({
      location: Location.create(textDocument.uri, range),
      message: `Section '${extraClose.section}' closed here`,
    });
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range,
      message: `Extra ')' closes '${extraClose.section}' before ${extraClose.nextSection}`,
      source: "iris",
      code: "IRIS_PARSE_EXTRA_RPAREN",
    });
  }

  if (!program) {
    return { related, diagnostics };
  }

    const returnMismatch = errorMsg.match(/Function ([A-Za-z0-9_!?\\.-]+) return type mismatch/);
  if (returnMismatch) {
    const fnName = returnMismatch[1];
    const def = program.defs.find(
      (d) =>
        (d.kind === "DefFn" || d.kind === "DefTool") &&
        d.name === fnName,
    );
    if (def?.nameSpan) {
      const range = spanToRange(def.nameSpan);
      related.push({
        location: Location.create(textDocument.uri, range),
        message: `Function name: ${fnName}`,
      });
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range,
        message: `Return type mismatch in ${fnName}`,
        source: "iris",
        code: "IRIS_RETURN_NAME",
      });
    }

    const bodySpan =
      def && def.kind === "DefFn" ? extractExprSpan(def.body) : undefined;
    if (bodySpan) {
      const range = spanToRange(bodySpan);
      related.push({
        location: Location.create(textDocument.uri, range),
        message: `Return value for ${fnName}`,
      });
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range,
        message: `Return value for ${fnName}`,
        source: "iris",
        code: "IRIS_RETURN_VALUE",
      });
    }

    const retSpan = def && def.kind === "DefFn" ? def.ret?.span : undefined;
    if (retSpan) {
      const range = spanToRange(retSpan);
      related.push({
        location: Location.create(textDocument.uri, range),
        message: `Declared return type for ${fnName}`,
      });
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range,
        message: `Declared return type for ${fnName}`,
        source: "iris",
        code: "IRIS_RETURN_DECL",
      });
    }
  }

  return { related, diagnostics };
}

function parseExtraClosingParen(
  errorMsg: string,
): { line: number; character: number; section: string; nextSection: string } | null {
  if (!errorMsg.includes("Unknown program section")) {
    return null;
  }
  const prevMatch = errorMsg.match(
    /Previous section '([^']+)' closed at (\d+):(\d+)/,
  );
  const nextMatch = errorMsg.match(
    /Unknown program section: ([A-Za-z0-9_!?\\.-]+) at line (\d+)/,
  );
  if (!prevMatch || !nextMatch) {
    return null;
  }
  const prevSection = prevMatch[1];
  const nextSection = nextMatch[1];
  if (prevSection !== "defs" || !nextSection.startsWith("def")) {
    return null;
  }
  const line = Math.max(0, parseInt(prevMatch[2], 10) - 1);
  const character = Math.max(0, parseInt(prevMatch[3], 10) - 1);
  return { line, character, section: prevSection, nextSection };
}

function extractExprSpan(expr: Expr): SourceSpan | undefined {
  const direct = (expr as { span?: SourceSpan }).span;
  if (direct) return direct;
  if (expr.kind === "Call") {
    return expr.fnSpan;
  }
  return undefined;
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
  if (/Match (target|arms)/i.test(errorMsg)) {
    return "match";
  }

  const patterns = [
    new RegExp(`Function (${TOKEN_PATTERN.source})`),
    new RegExp(`Unknown variable: (${TOKEN_PATTERN.source})`),
    new RegExp(`Unknown function call: (${TOKEN_PATTERN.source})`),
    new RegExp(`Arity mismatch for (${TOKEN_PATTERN.source})`),
    new RegExp(`Duplicate argument name: (${TOKEN_PATTERN.source})`),
    new RegExp(`Unknown field (${TOKEN_PATTERN.source})`),
    new RegExp(`Cannot access field (${TOKEN_PATTERN.source})`),
    new RegExp(`no variant (${TOKEN_PATTERN.source})`, "i"),
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
