"use strict";
var IrisBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/web-entry.ts
  var web_entry_exports = {};
  __export(web_entry_exports, {
    runIris: () => runIris
  });

  // src/sexp/lexer.ts
  function tokenize(input) {
    const tokens = [];
    let pos = 0;
    let line = 1;
    let col = 1;
    while (pos < input.length) {
      const char = input[pos];
      if (/\s/.test(char)) {
        if (char === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
        pos++;
        continue;
      }
      if (char === ";") {
        while (pos < input.length && input[pos] !== "\n") {
          pos++;
        }
        continue;
      }
      if (char === "(") {
        tokens.push({ kind: "LParen", line, col });
        pos++;
        col++;
        continue;
      }
      if (char === ")") {
        tokens.push({ kind: "RParen", line, col });
        pos++;
        col++;
        continue;
      }
      if (char === '"') {
        const startLine = line;
        const startCol = col;
        pos++;
        col++;
        let strVal = "";
        while (pos < input.length && input[pos] !== '"') {
          const c = input[pos];
          if (c === "\\") {
            if (pos + 1 < input.length) {
              const next = input[pos + 1];
              if (next === '"') strVal += '"';
              else if (next === "n") strVal += "\n";
              else if (next === "t") strVal += "	";
              else if (next === "r") strVal += "\r";
              else if (next === "\\") strVal += "\\";
              else strVal += next;
              pos += 2;
              col += 2;
              continue;
            }
          }
          if (c === "\n") {
            line++;
            col = 1;
          } else {
            col++;
          }
          strVal += c;
          pos++;
        }
        if (pos >= input.length) {
          throw new Error(`Unterminated string starting at ${startLine}:${startCol}`);
        }
        pos++;
        col++;
        tokens.push({ kind: "Str", value: strVal, line: startLine, col: startCol });
        continue;
      }
      if (char === "-" && pos + 1 < input.length && /\d/.test(input[pos + 1])) {
        let buf = "-";
        pos++;
        col++;
        while (pos < input.length && /\d/.test(input[pos])) {
          buf += input[pos];
          pos++;
          col++;
        }
        tokens.push({ kind: "Int", value: BigInt(buf), line, col: col - buf.length });
        continue;
      }
      if (/\d/.test(char)) {
        let buf = "";
        const startCol = col;
        while (pos < input.length && /\d/.test(input[pos])) {
          buf += input[pos];
          pos++;
          col++;
        }
        tokens.push({ kind: "Int", value: BigInt(buf), line, col: startCol });
        continue;
      }
      if (/[^()\s"]/.test(char)) {
        let buf = "";
        const startCol = col;
        while (pos < input.length && /[^()\s"]/.test(input[pos])) {
          buf += input[pos];
          pos++;
          col++;
        }
        if (buf === "true") {
          tokens.push({ kind: "Bool", value: true, line, col: startCol });
        } else if (buf === "false") {
          tokens.push({ kind: "Bool", value: false, line, col: startCol });
        } else {
          tokens.push({ kind: "Symbol", value: buf, line, col: startCol });
        }
        continue;
      }
      throw new Error(`Unexpected character '${char}' at ${line}:${col}`);
    }
    tokens.push({ kind: "EOF", line, col });
    return tokens;
  }

  // src/sexp/parse-type.ts
  function parseType(ctx) {
    const token = ctx.peek();
    if (token.kind === "Symbol") {
      const w = token.value;
      ctx.consume();
      if (w === "I64") return { type: "I64" };
      if (w === "Bool") return { type: "Bool" };
      if (w === "Str") return { type: "Str" };
      if (w === "Union") {
        const variants = {};
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          ctx.expectSymbol("tag");
          const tagName = ctx.expectString();
          const content = parseType(ctx);
          ctx.expect("RParen");
          variants[tagName] = content;
        }
        ctx.expect("RParen");
        return { type: "Union", variants };
      }
      if (w === "Record" || w === "record") {
        const fields = {};
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          const key = ctx.expectSymbol();
          const val = parseType(ctx);
          ctx.expect("RParen");
          fields[key] = val;
        }
        ctx.expect("RParen");
        return { type: "Record", fields };
      }
      return { type: "Named", name: w };
    }
    if (token.kind === "LParen") {
      ctx.consume();
      const head = ctx.peek();
      if (head.kind !== "Symbol") throw new Error("Expected type constructor");
      const tMap = head.value;
      ctx.consume();
      if (tMap === "Option") {
        const inner = parseType(ctx);
        ctx.expect("RParen");
        return { type: "Option", inner };
      }
      if (tMap === "Result") {
        const ok = parseType(ctx);
        const err = parseType(ctx);
        ctx.expect("RParen");
        return { type: "Result", ok, err };
      }
      if (tMap === "List") {
        const inner = parseType(ctx);
        ctx.expect("RParen");
        return { type: "List", inner };
      }
      if (tMap === "Record" || tMap === "record") {
        const fields = {};
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          const name = ctx.expectSymbol();
          const type = parseType(ctx);
          ctx.expect("RParen");
          fields[name] = type;
        }
        ctx.expect("RParen");
        return { type: "Record", fields };
      }
      if (tMap === "Map") {
        const key = parseType(ctx);
        const value = parseType(ctx);
        ctx.expect("RParen");
        return { type: "Map", key, value };
      }
      if (tMap === "Tuple") {
        const items = [];
        while (!ctx.check("RParen")) {
          items.push(parseType(ctx));
        }
        ctx.expect("RParen");
        return { type: "Tuple", items };
      }
      if (tMap === "Union") {
        const variants = {};
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          ctx.expectSymbol("tag");
          const tagName = ctx.expectString();
          const content = parseType(ctx);
          ctx.expect("RParen");
          variants[tagName] = content;
        }
        ctx.expect("RParen");
        return { type: "Union", variants };
      }
      if (tMap === "union") {
        const variants = {};
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          ctx.expectSymbol("tag");
          const tagName = ctx.expectString();
          let args = [];
          if (ctx.check("LParen")) {
            ctx.expect("LParen");
            while (!ctx.check("RParen")) {
              args.push(parseType(ctx));
            }
            ctx.expect("RParen");
          }
          ctx.expect("RParen");
          if (args.length === 1) {
            variants[tagName] = args[0];
          } else {
            variants[tagName] = { type: "Tuple", items: args };
          }
        }
        ctx.expect("RParen");
        return { type: "Union", variants };
      }
      if (tMap === "Fn") {
        const args = [];
        ctx.expect("LParen");
        while (!ctx.check("RParen")) {
          args.push(parseType(ctx));
        }
        ctx.expect("RParen");
        const ret = parseType(ctx);
        let eff = "!Pure";
        const next = ctx.peek();
        if (next.kind === "Symbol" && next.value.startsWith("!")) {
          eff = parseEffect(ctx);
        }
        ctx.expect("RParen");
        return { type: "Fn", args, ret, eff };
      }
      ctx.expect("RParen");
      throw new Error(`Unknown type constructor: ${tMap}`);
    }
    throw new Error(`Unexpected token in type`);
  }
  function parseEffect(ctx) {
    const t = ctx.peek();
    if (t.kind === "Symbol" && t.value.startsWith("!")) {
      ctx.consume();
      if (["!Pure", "!IO", "!Net", "!Any", "!Infer"].includes(t.value)) {
        return t.value;
      }
      throw new Error(`Unknown effect: ${t.value}`);
    }
    throw new Error("Expected effect starting with !");
  }

  // src/sexp/parse-expr.ts
  function parseExpr(ctx) {
    const token = ctx.peek();
    if (token.kind === "Int") {
      ctx.consume();
      return { kind: "Literal", value: { kind: "I64", value: token.value } };
    }
    if (token.kind === "Bool") {
      ctx.consume();
      return { kind: "Literal", value: { kind: "Bool", value: token.value } };
    }
    if (token.kind === "Str") {
      ctx.consume();
      return { kind: "Literal", value: { kind: "Str", value: token.value } };
    }
    if (token.kind === "Symbol") {
      if (token.value === "None") {
        ctx.consume();
        return { kind: "Literal", value: { kind: "Option", value: null } };
      }
      if (token.value === "nil") {
        ctx.consume();
        return { kind: "Literal", value: { kind: "List", items: [] } };
      }
      ctx.consume();
      return { kind: "Var", name: token.value };
    }
    if (token.kind === "LParen") {
      ctx.consume();
      const head = ctx.peek();
      if (head.kind !== "Symbol") {
        const items = [];
        while (!ctx.check("RParen")) {
          items.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        if (items.length === 1) return items[0];
        return { kind: "Tuple", items };
      }
      const op = head.value;
      ctx.consume();
      if (op === "let") {
        ctx.expect("LParen");
        const name = ctx.expectSymbol();
        const val = parseExpr(ctx);
        ctx.expect("RParen");
        const body = parseExpr(ctx);
        ctx.expect("RParen");
        return { kind: "Let", name, value: val, body };
      }
      if (op === "lambda") {
        ctx.expect("LParen");
        ctx.expectSymbol("args");
        const args2 = [];
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          const argName = ctx.expectSymbol();
          const argType = parseType(ctx);
          ctx.expect("RParen");
          args2.push({ name: argName, type: argType });
        }
        ctx.expect("RParen");
        ctx.expect("LParen");
        ctx.expectSymbol("ret");
        const ret = parseType(ctx);
        ctx.expect("RParen");
        ctx.expect("LParen");
        ctx.expectSymbol("eff");
        const eff = parseEffect(ctx);
        ctx.expect("RParen");
        ctx.expect("LParen");
        ctx.expectSymbol("body");
        const body = parseExpr(ctx);
        ctx.expect("RParen");
        return { kind: "Lambda", args: args2, ret, eff, body };
      }
      if (op === "record") {
        const fields = [];
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          const key = ctx.expectSymbol();
          const val = parseExpr(ctx);
          ctx.expect("RParen");
          const keyExpr = { kind: "Literal", value: { kind: "Str", value: key } };
          const fieldTuple = { kind: "Tuple", items: [keyExpr, val] };
          fields.push(fieldTuple);
        }
        ctx.expect("RParen");
        return { kind: "Record", fields };
      }
      if (op === "if") {
        const cond = parseExpr(ctx);
        const thenBr = parseExpr(ctx);
        const elseBr = parseExpr(ctx);
        ctx.expect("RParen");
        return { kind: "If", cond, then: thenBr, else: elseBr };
      }
      if (op === "match") {
        const target = parseExpr(ctx);
        const cases = [];
        while (!ctx.check("RParen")) {
          ctx.expect("LParen");
          ctx.expectSymbol("case");
          ctx.expect("LParen");
          ctx.expectSymbol("tag");
          const tag = ctx.expectString();
          const vars = [];
          if (ctx.check("LParen")) {
            ctx.expect("LParen");
            while (!ctx.check("RParen")) {
              vars.push(ctx.expectSymbol());
            }
            ctx.expect("RParen");
          }
          ctx.expect("RParen");
          const body = parseExpr(ctx);
          ctx.expect("RParen");
          const varsValue = {
            kind: "List",
            items: vars.map((v) => ({ kind: "Str", value: v }))
          };
          cases.push({ tag, vars: varsValue, body });
        }
        ctx.expect("RParen");
        return { kind: "Match", target, cases };
      }
      if (op === "call") {
        const fn = ctx.expectSymbol();
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Call", fn, args: args2 };
      }
      if (["+", "-", "*", "/", "%", "<=", "<", "=", ">=", ">", "&&", "||", "!", "Some", "Ok", "Err", "cons", "tuple.get", "record.get", "io.print", "io.read_file", "io.write_file", "i64.from_string", "i64.to_string"].includes(op)) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("io.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("net.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("http.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("str.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("sys.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("map.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("list.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("tuple.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op.startsWith("record.")) {
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Intrinsic", op, args: args2 };
      }
      if (op === "list") {
        const items = [];
        while (!ctx.check("RParen")) {
          items.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "List", items };
      }
      if (op === "list-of") {
        const typeArg = parseType(ctx);
        const items = [];
        while (!ctx.check("RParen")) {
          items.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "List", items, typeArg };
      }
      if (op === "tuple") {
        const items = [];
        while (!ctx.check("RParen")) {
          items.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Tuple", items };
      }
      if (op === "union") {
        const tagName = ctx.expectString();
        const args2 = [];
        while (!ctx.check("RParen")) {
          args2.push(parseExpr(ctx));
        }
        ctx.expect("RParen");
        return { kind: "Tuple", items: [{ kind: "Literal", value: { kind: "Str", value: tagName } }, ...args2] };
      }
      if (op === "tag") {
        const tagName = ctx.expectString();
        let value;
        if (ctx.check("RParen")) {
          value = { kind: "Tuple", items: [] };
        } else {
          value = parseExpr(ctx);
        }
        ctx.expect("RParen");
        return { kind: "Tagged", tag: tagName, value };
      }
      const args = [];
      while (!ctx.check("RParen")) {
        args.push(parseExpr(ctx));
      }
      ctx.expect("RParen");
      return { kind: "Call", fn: op, args };
    }
    throw new Error(`Unexpected token for expression: ${token.kind} at ${token.line}:${token.col}`);
  }

  // src/sexp/parser.ts
  var Parser = class {
    constructor(input, debug = false) {
      this.pos = 0;
      this.debug = false;
      this.lastClosedSection = null;
      this.tokens = tokenize(input);
      this.debug = debug;
    }
    log(msg) {
      if (this.debug) {
        console.log(`[Parser] ${msg}`);
      }
    }
    parse() {
      this.expect("LParen");
      this.expectSymbol("program");
      let moduleDecl = { name: "unknown", version: 0 };
      const imports = [];
      const defs = [];
      while (!this.check("RParen")) {
        this.log(`Parsing section loop. Peek: ${this.peek().kind} '${this.peek().value || ""}'`);
        this.expect("LParen");
        const section = this.expectSymbol();
        this.log(`Start section: ${section}`);
        if (section === "module") {
          this.expect("LParen");
          this.expectSymbol("name");
          const name = this.expectString();
          this.expect("RParen");
          this.expect("LParen");
          this.expectSymbol("version");
          const version = Number(this.expectInt());
          this.expect("RParen");
          this.expect("RParen");
          moduleDecl = { name, version };
          this.log(`Parsed module: ${name} v${version}`);
          this.lastClosedSection = { name: "module", line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
        } else if (section === "imports") {
          this.log("Parsing imports...");
          while (!this.check("RParen")) {
            this.expect("LParen");
            this.expectSymbol("import");
            const path = this.expectString();
            let alias = "";
            if (this.check("LParen")) {
              this.expect("LParen");
              this.expectSymbol("as");
              alias = this.expectString();
              this.expect("RParen");
            } else {
              throw new Error("Import must have alias currently");
            }
            this.expect("RParen");
            imports.push({ path, alias });
          }
          this.expect("RParen");
          this.log(`Parsed ${imports.length} imports`);
          this.lastClosedSection = { name: "imports", line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
        } else if (section === "defs") {
          this.log("Parsing defs...");
          while (!this.check("RParen")) {
            const t = this.peek();
            this.log(`Parsing definition. Peek: ${t.kind} '${t.value || ""}' at ${t.line}:${t.col}`);
            if (t.kind === "RParen") {
              this.log("Saw RParen explicitly in loop check (should not happen due to while condition)");
            }
            defs.push(this.parseDefinition());
          }
          const endT = this.peek();
          this.log(`Finished parsing defs. Peek is: ${endT.kind} at ${endT.line}:${endT.col}`);
          this.expect("RParen");
          this.lastClosedSection = { name: "defs", line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
        } else {
          this.log(`Unknown section: ${section}`);
          let msg = `Unknown program section: ${section} at line ${this.tokens[this.pos].line}`;
          if (this.lastClosedSection) {
            msg += `. Note: Previous section '${this.lastClosedSection.name}' closed at ${this.lastClosedSection.line}:${this.lastClosedSection.col}`;
          }
          throw new Error(msg);
        }
      }
      this.expect("RParen");
      return { module: moduleDecl, imports, defs };
    }
    parseMetaSection(meta, allowed) {
      const save = this.pos;
      this.expect("LParen");
      const tagTok = this.peek();
      if (tagTok.kind !== "Symbol") {
        this.pos = save;
        this.skipSExp();
        return;
      }
      const tag = this.expectSymbol();
      if (tag === "doc" && allowed.doc) {
        meta.doc = this.expectString();
        this.expect("RParen");
        return;
      }
      if (tag === "requires" && allowed.requires) {
        meta.requires = this.expectString();
        this.expect("RParen");
        return;
      }
      if (tag === "ensures" && allowed.ensures) {
        meta.ensures = this.expectString();
        this.expect("RParen");
        return;
      }
      if (tag === "caps" && allowed.caps) {
        const caps = [];
        while (!this.check("RParen")) {
          this.expect("LParen");
          const name = this.expectSymbol();
          const type = parseType(this);
          this.expect("RParen");
          caps.push({ name, type });
        }
        this.expect("RParen");
        meta.caps = caps;
        return;
      }
      this.pos = save;
      this.skipSExp();
    }
    parseDefinition() {
      this.expect("LParen");
      const kind = this.expectSymbol();
      if (kind === "defconst") {
        this.expect("LParen");
        this.expectSymbol("name");
        const name = this.expectSymbol();
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("type");
        const type = parseType(this);
        this.expect("RParen");
        const meta = {};
        while (this.check("LParen")) {
          const save = this.pos;
          this.expect("LParen");
          const tag = this.peek();
          if (tag.kind === "Symbol" && tag.value === "value") {
            this.pos = save;
            break;
          }
          this.pos = save;
          this.parseMetaSection(meta, { doc: true });
        }
        this.expect("LParen");
        this.expectSymbol("value");
        const value = parseExpr(this);
        this.expect("RParen");
        this.expect("RParen");
        return { kind: "DefConst", name, type, value, doc: meta.doc };
      } else if (kind === "deffn") {
        this.expect("LParen");
        this.expectSymbol("name");
        const name = this.expectSymbol();
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("args");
        const args = [];
        while (!this.check("RParen")) {
          this.expect("LParen");
          const argName = this.expectSymbol();
          const argType = parseType(this);
          this.expect("RParen");
          args.push({ name: argName, type: argType });
        }
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("ret");
        const ret = parseType(this);
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("eff");
        const eff = parseEffect(this);
        this.expect("RParen");
        const meta = {};
        while (this.check("LParen")) {
          const save = this.pos;
          this.expect("LParen");
          const tag = this.peek();
          if (tag.kind === "Symbol" && tag.value === "body") {
            this.pos = save;
            break;
          }
          this.pos = save;
          this.parseMetaSection(meta, { doc: true, requires: true, ensures: true, caps: true });
        }
        this.expect("LParen");
        this.expectSymbol("body");
        const body = parseExpr(this);
        this.expect("RParen");
        this.expect("RParen");
        return { kind: "DefFn", name, args, ret, eff, body, ...meta };
      } else if (kind === "deftool") {
        this.expect("LParen");
        this.expectSymbol("name");
        const name = this.expectSymbol();
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("args");
        const args = [];
        while (!this.check("RParen")) {
          this.expect("LParen");
          const argName = this.expectSymbol();
          const argType = parseType(this);
          this.expect("RParen");
          args.push({ name: argName, type: argType });
        }
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("ret");
        const ret = parseType(this);
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("eff");
        const eff = parseEffect(this);
        this.expect("RParen");
        const meta = {};
        while (this.check("LParen")) {
          this.parseMetaSection(meta, { doc: true, requires: true, ensures: true, caps: true });
        }
        this.expect("RParen");
        return { kind: "DefTool", name, args, ret, eff, ...meta };
      } else if (kind === "type" || kind === "deftype") {
        const name = this.expectSymbol();
        const type = parseType(this);
        const meta = {};
        while (this.check("LParen")) {
          this.parseMetaSection(meta, { doc: true });
        }
        this.expect("RParen");
        return { kind: "TypeDef", name, type, doc: meta.doc };
      } else {
        throw new Error(`Unknown definition kind: ${kind}`);
      }
    }
    parseExpr() {
      return parseExpr(this);
    }
    peek() {
      if (this.pos >= this.tokens.length) return { kind: "EOF", line: 0, col: 0 };
      return this.tokens[this.pos];
    }
    consume() {
      this.pos++;
    }
    check(kind) {
      const t = this.peek();
      return t.kind === kind;
    }
    expect(kind) {
      const t = this.peek();
      if (t.kind !== kind) {
        throw new Error(`Expected ${kind} at ${t.line}:${t.col}, got ${t.kind} '${t.value || ""}'`);
      }
      this.consume();
    }
    expectSymbol(val) {
      const t = this.peek();
      if (t.kind !== "Symbol") {
        throw new Error(`Expected Symbol at ${t.line}:${t.col}, got ${t.kind}`);
      }
      if (val && t.value !== val) {
        throw new Error(`Expected symbol '${val}' at ${t.line}:${t.col}, got '${t.value}'`);
      }
      this.consume();
      return t.value;
    }
    expectString() {
      const t = this.peek();
      if (t.kind !== "Str") {
        throw new Error(`Expected String at ${t.line}:${t.col}, got ${t.kind}`);
      }
      this.consume();
      return t.value;
    }
    expectInt() {
      const t = this.peek();
      if (t.kind !== "Int") {
        throw new Error(`Expected Int at ${t.line}:${t.col}, got ${t.kind}`);
      }
      this.consume();
      return t.value;
    }
    skipSExp() {
      let depth = 0;
      if (this.check("LParen")) {
        this.consume();
        depth = 1;
        while (depth > 0 && this.pos < this.tokens.length) {
          if (this.check("LParen")) depth++;
          else if (this.check("RParen")) depth--;
          this.consume();
        }
      } else {
        this.consume();
      }
    }
  };

  // src/sexp/printer.ts
  function escapeStr(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");
  }
  function printValue(v) {
    switch (v.kind) {
      case "I64":
        return v.value.toString();
      case "Bool":
        return v.value.toString();
      case "Str":
        return `"${escapeStr(v.value)}"`;
      case "Option":
        return v.value === null ? "None" : `(Some ${printValue(v.value)})`;
      case "Result":
        return v.isOk ? `(Ok ${printValue(v.value)})` : `(Err ${printValue(v.value)})`;
      case "List":
        return `(list ${v.items.map(printValue).join(" ")})`;
      case "Tuple":
        return `(tuple ${v.items.map(printValue).join(" ")})`;
      case "Record": {
        const keys = Object.keys(v.fields).sort();
        const content = keys.map((k) => `(${k} ${printValue(v.fields[k])})`).join(" ");
        return `(record${content ? " " + content : ""})`;
      }
      case "Map":
        return `(map)`;
      // Simplified for now
      case "Tagged":
        return `(tag "${v.tag}" ${printValue(v.value)})`;
      case "Lambda":
        return "Lambda";
    }
    return `UnknownValue(${v.kind})`;
  }

  // src/typecheck/utils.ts
  function effectOrder(eff) {
    switch (eff) {
      case "!Pure":
        return 0;
      case "!IO":
        return 1;
      case "!Net":
        return 2;
      case "!Any":
        return 3;
      case "!Infer":
        return -1;
    }
    return 0;
  }
  function joinEffects(e1, e2) {
    if (e1 === "!Infer" || e2 === "!Infer") return "!Pure";
    if (e1 === "!Any" || e2 === "!Any") return "!Any";
    if (e1 === "!Net" || e2 === "!Net") return "!Net";
    if (e1 === "!IO" || e2 === "!IO") return "!IO";
    return "!Pure";
  }
  function checkEffectSubtype(ctx, required, declared, message) {
    if (declared === "!Infer") return;
    if (declared === "!Any") return;
    const ordReq = effectOrder(required);
    const ordDecl = effectOrder(declared);
    if (ordReq > ordDecl) {
      throw new Error(`TypeError: EffectMismatch: ${message}: Inferred ${required} but declared ${declared}`);
    }
  }
  function resolve(ctx, t) {
    if (t.type === "Named") {
      if (ctx.types.has(t.name)) {
        return resolve(ctx, ctx.types.get(t.name));
      }
      return t;
    }
    return t;
  }
  function fmt(ctx, t) {
    if (!t) return "undefined";
    if (t.type === "Named") return t.name;
    const resolved = resolve(ctx, t);
    if (resolved !== t && resolved.type !== "Named") return fmt(ctx, resolved);
    switch (t.type) {
      case "I64":
        return "I64";
      case "Bool":
        return "Bool";
      case "Str":
        return "Str";
      case "Option":
        return `(Option ${fmt(ctx, t.inner)})`;
      case "Result":
        return `(Result ${fmt(ctx, t.ok)} ${fmt(ctx, t.err)})`;
      case "List":
        return `(List ${fmt(ctx, t.inner)})`;
      case "Tuple":
        return `(Tuple ${t.items.map((i) => fmt(ctx, i)).join(" ")})`;
      case "Map":
        return `(Map ${fmt(ctx, t.key)} ${fmt(ctx, t.value)})`;
      case "Record":
        return `(Record ${Object.keys(t.fields).map((k) => `(${k} ${fmt(ctx, t.fields[k])})`).join(" ")})`;
      case "Union":
        return `(Union ${Object.keys(t.variants).map((k) => `(tag "${k}" ${fmt(ctx, t.variants[k])})`).join(" ")})`;
      case "Fn":
        return `(Fn (${t.args.map((a) => fmt(ctx, a)).join(" ")}) ${fmt(ctx, t.ret)})`;
      // Should we show Effect? Maybe.
      default:
        return "Unknown";
    }
  }
  function typesEqual(ctx, t1, t2) {
    const origT1 = t1;
    const origT2 = t2;
    t1 = resolve(ctx, t1);
    t2 = resolve(ctx, t2);
    if (t1 === t2) return true;
    if (t1.type !== t2.type) {
      if (t1.type === "Union" && t2.type === "Tuple") {
        if (t2.items.length === 1) {
          const content = t2.items[0];
          for (const variantType of Object.values(t1.variants)) {
            if (typesEqual(ctx, variantType, content)) return true;
          }
        }
        if (t2.items.length === 2 && t2.items[0].type === "Str") {
          const content = t2.items[1];
          for (const variantType of Object.values(t1.variants)) {
            if (typesEqual(ctx, variantType, content)) return true;
          }
        }
      }
      return false;
    }
    if (t1.type === "Named") return t1.name === t2.name;
    if (t1.type === "I64") return true;
    if (t1.type === "Bool") return true;
    if (t1.type === "Str") return true;
    if (t1.type === "Union" && t2.type === "Union") {
      const t1Vars = t1.variants;
      const t2Vars = t2.variants;
      for (const [tag, type] of Object.entries(t2Vars)) {
        if (!t1Vars[tag]) return false;
        if (!typesEqual(ctx, t1Vars[tag], type)) return false;
      }
      return true;
    }
    if (t1.type === "Record" && t2.type === "Record") {
      const k1 = Object.keys(t1.fields).sort();
      const k2 = Object.keys(t2.fields).sort();
      if (k1.length !== k2.length) return false;
      for (let i = 0; i < k1.length; i++) {
        if (k1[i] !== k2[i]) return false;
        if (!typesEqual(ctx, t1.fields[k1[i]], t2.fields[k2[i]])) return false;
      }
      return true;
    }
    if (t1.type === "Option") {
      if (!t1.inner || !t2.inner) return false;
      return typesEqual(ctx, t1.inner, t2.inner);
    }
    if (t1.type === "Result") {
      if (!t1.ok || !t1.err || !t2.ok || !t2.err) return false;
      return typesEqual(ctx, t1.ok, t2.ok) && typesEqual(ctx, t1.err, t2.err);
    }
    if (t1.type === "List") {
      if (!t1.inner || !t2.inner) return false;
      return typesEqual(ctx, t1.inner, t2.inner);
    }
    if (t1.type === "Map") {
      if (!t1.key || !t1.value || !t2.key || !t2.value) return false;
      return typesEqual(ctx, t1.key, t2.key) && typesEqual(ctx, t1.value, t2.value);
    }
    if (t1.type === "Tuple") {
      const i1 = t1.items;
      const i2 = t2.items;
      if (!i1 || !i2 || i1.length !== i2.length) return false;
      for (let i = 0; i < i1.length; i++) {
        if (!typesEqual(ctx, i1[i], i2[i])) return false;
      }
      return true;
    }
    if (t1.type === "Fn" && t2.type === "Fn") {
      if (t1.args.length !== t2.args.length) return false;
      for (let i = 0; i < t1.args.length; i++) {
        if (!typesEqual(ctx, t1.args[i], t2.args[i])) return false;
      }
      if (!typesEqual(ctx, t1.ret, t2.ret)) return false;
      return t1.eff === t2.eff;
    }
    return false;
  }
  function expectType(ctx, expected, actual, message) {
    if (!typesEqual(ctx, expected, actual)) {
      throw new Error(`TypeError: ${message}: Expected ${fmt(ctx, expected)}, got ${fmt(ctx, actual)}`);
    }
  }
  function qualifyType(ctx, t, alias, exported) {
    if (t.type === "Named") {
      if (exported.has(t.name)) {
        return { type: "Named", name: `${alias}.${t.name}` };
      }
      return t;
    }
    if (t.type === "Option") return { ...t, inner: qualifyType(ctx, t.inner, alias, exported) };
    if (t.type === "Result") return { ...t, ok: qualifyType(ctx, t.ok, alias, exported), err: qualifyType(ctx, t.err, alias, exported) };
    if (t.type === "List") return { ...t, inner: qualifyType(ctx, t.inner, alias, exported) };
    if (t.type === "Tuple") return { ...t, items: t.items.map((i) => qualifyType(ctx, i, alias, exported)) };
    if (t.type === "Record") {
      const newFields = {};
      for (const k in t.fields) newFields[k] = qualifyType(ctx, t.fields[k], alias, exported);
      return { ...t, fields: newFields };
    }
    if (t.type === "Union") {
      const newVars = {};
      for (const k in t.variants) newVars[k] = qualifyType(ctx, t.variants[k], alias, exported);
      return { ...t, variants: newVars };
    }
    if (t.type === "Map") return { ...t, key: qualifyType(ctx, t.key, alias, exported), value: qualifyType(ctx, t.value, alias, exported) };
    if (t.type === "Fn") return {
      ...t,
      args: t.args.map((a) => qualifyType(ctx, a, alias, exported)),
      ret: qualifyType(ctx, t.ret, alias, exported)
    };
    return t;
  }

  // src/typecheck/checks/literal.ts
  function checkLiteral(check2, ctx, expr, env, expectedType) {
    if (expr.kind !== "Literal") throw new Error("Internal: checkLiteral called on non-Literal");
    const val = expr.value;
    if (val.kind === "I64") return { type: { type: "I64" }, eff: "!Pure" };
    if (val.kind === "Bool") return { type: { type: "Bool" }, eff: "!Pure" };
    if (val.kind === "Str") return { type: { type: "Str" }, eff: "!Pure" };
    if (val.kind === "Option") {
      if (val.value === null) return { type: { type: "Option", inner: { type: "I64" } }, eff: "!Pure" };
      const inner = check2(ctx, { kind: "Literal", value: val.value }, env);
      return { type: { type: "Option", inner: inner.type }, eff: inner.eff };
    }
    if (val.kind === "Result") {
      const v = check2(ctx, { kind: "Literal", value: val.value }, env);
      return { type: { type: "Result", ok: val.isOk ? v.type : { type: "Str" }, err: val.isOk ? { type: "Str" } : v.type }, eff: v.eff };
    }
    if (val.kind === "List") {
      if (expectedType && expectedType.type === "List") {
        return { type: expectedType, eff: "!Pure" };
      }
      return { type: { type: "List", inner: { type: "I64" } }, eff: "!Pure" };
    }
    if (val.kind === "Tuple") return { type: { type: "Tuple", items: [] }, eff: "!Pure" };
    if (val.kind === "Record") return { type: { type: "Record", fields: {} }, eff: "!Pure" };
    throw new Error(`Unknown literal kind: ${val.kind}`);
  }

  // src/typecheck/checks/control.ts
  function checkControl(check2, ctx, expr, env, expectedType) {
    if (expr.kind === "Let") {
      const letExpr = expr;
      if (!letExpr.value) console.log("Let expr missing value:", JSON.stringify(letExpr));
      const valRes = check2(ctx, letExpr.value, env);
      const newEnv = new Map(env);
      newEnv.set(letExpr.name, valRes.type);
      const bodyRes = check2(ctx, letExpr.body, newEnv, expectedType);
      return { type: bodyRes.type, eff: joinEffects(valRes.eff, bodyRes.eff) };
    }
    if (expr.kind === "If") {
      const cond = check2(ctx, expr.cond, env, { type: "Bool" });
      expectType(ctx, { type: "Bool" }, cond.type, "Type Error in If condition");
      const thenBr = check2(ctx, expr.then, env, expectedType);
      const elseBr = check2(ctx, expr.else, env, expectedType || thenBr.type);
      expectType(ctx, thenBr.type, elseBr.type, "If branches mismatch");
      return { type: expectedType || thenBr.type, eff: joinEffects(cond.eff, joinEffects(thenBr.eff, elseBr.eff)) };
    }
    if (expr.kind === "Match") {
      const target = check2(ctx, expr.target, env);
      let retType = null;
      let joinedEff = target.eff;
      let resolvedTarget = resolve(ctx, target.type);
      if (resolvedTarget.type === "Option") {
        for (const c of expr.cases) {
          const newEnv = new Map(env);
          const vars = [];
          if (c.vars.kind === "List") {
            for (const item of c.vars.items) {
              if (item.kind === "Str") vars.push(item.value);
            }
          }
          if (c.tag === "Some") {
            if (vars.length !== 1) throw new Error("Some case expects 1 variable");
            if (!resolvedTarget.inner) throw new Error("Internal error: Option type missing inner type");
            newEnv.set(vars[0], resolvedTarget.inner);
          } else if (c.tag === "None") {
            if (vars.length !== 0) throw new Error("None case expects 0 variables");
          } else throw new Error(`Unknown option match tag: ${c.tag}`);
          const body = check2(ctx, c.body, newEnv, retType || expectedType);
          if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
          else retType = body.type;
          joinedEff = joinEffects(joinedEff, body.eff);
        }
      } else if (resolvedTarget.type === "Result") {
        for (const c of expr.cases) {
          const newEnv = new Map(env);
          const vars = [];
          if (c.vars.kind === "List") {
            for (const item of c.vars.items) {
              if (item.kind === "Str") vars.push(item.value);
            }
          }
          if (c.tag === "Ok") {
            if (vars.length !== 1) throw new Error("Ok case expects 1 variable");
            if (!resolvedTarget.ok) throw new Error("Internal error: Result type missing ok type");
            newEnv.set(vars[0], resolvedTarget.ok);
          } else if (c.tag === "Err") {
            if (vars.length !== 1) throw new Error("Err case expects 1 variable");
            if (!resolvedTarget.err) throw new Error("Internal error: Result type missing err type");
            newEnv.set(vars[0], resolvedTarget.err);
          } else throw new Error(`Unknown result match tag: ${c.tag}`);
          const body = check2(ctx, c.body, newEnv, retType || expectedType);
          if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
          else retType = body.type;
          joinedEff = joinEffects(joinedEff, body.eff);
        }
      } else if (resolvedTarget.type === "List") {
        for (const c of expr.cases) {
          const newEnv = new Map(env);
          const vars = [];
          if (c.vars.kind === "List") {
            for (const item of c.vars.items) {
              if (item.kind === "Str") vars.push(item.value);
            }
          }
          if (c.tag === "nil") {
            if (vars.length !== 0) throw new Error("nil case expects 0 variables");
          } else if (c.tag === "cons") {
            if (vars.length !== 2) throw new Error("cons case expects 2 variables (head tail)");
            if (!resolvedTarget.inner) throw new Error("Internal List missing inner");
            newEnv.set(vars[0], resolvedTarget.inner);
            newEnv.set(vars[1], resolvedTarget);
          } else throw new Error(`Unknown list match tag: ${c.tag}`);
          const body = check2(ctx, c.body, newEnv, retType || expectedType);
          if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
          else retType = body.type;
          joinedEff = joinEffects(joinedEff, body.eff);
        }
      } else if (resolvedTarget.type === "Union") {
        for (const c of expr.cases) {
          const newEnv = new Map(env);
          const vars = [];
          if (c.vars.kind === "List") {
            for (const item of c.vars.items) {
              if (item.kind === "Str") vars.push(item.value);
            }
          }
          if (c.tag === "_") {
            if (vars.length !== 0) throw new Error("Wildcard match cannot bind variables");
          } else {
            const variantType = resolvedTarget.variants[c.tag];
            if (!variantType) throw new Error(`TypeError: Union ${fmt(ctx, resolvedTarget)} has no variant ${c.tag}`);
            if (vars.length === 1) {
              newEnv.set(vars[0], variantType);
            } else if (vars.length === 0) {
            } else {
              throw new Error(`Match case ${c.tag} expects 1 variable (payload binding)`);
            }
          }
          const body = check2(ctx, c.body, newEnv, retType || expectedType);
          if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
          else retType = body.type;
          joinedEff = joinEffects(joinedEff, body.eff);
        }
      } else {
        throw new Error(`Match target must be Option, Result, List, or Union (got ${resolvedTarget.type})`);
      }
      return { type: retType, eff: joinedEff };
    }
    throw new Error(`Internal: checkControl called on non-control expr ${expr.kind}`);
  }
  function checkLambda(check2, ctx, expr, env, expectedType) {
    if (expr.kind !== "Lambda") throw new Error("Internal: checkLambda called on non-Lambda");
    const newEnv = new Map(env);
    const argTypes = [];
    for (const arg of expr.args) {
      newEnv.set(arg.name, arg.type);
      argTypes.push(arg.type);
    }
    const bodyRes = check2(ctx, expr.body, newEnv, expr.ret);
    expectType(ctx, expr.ret, bodyRes.type, "Lambda body type mismatch");
    const canEffectFit = (actual, declared) => {
      if (declared === "!Any") return true;
      if (declared === "!Net") return ["!Pure", "!IO", "!Net", "!Infer"].includes(actual);
      if (declared === "!IO") return ["!Pure", "!IO", "!Infer"].includes(actual);
      if (declared === "!Pure") return actual === "!Pure";
      return false;
    };
    if (!canEffectFit(bodyRes.eff, expr.eff)) {
      throw new Error(`Type Error: Lambda declared ${expr.eff} but body is ${bodyRes.eff}`);
    }
    return {
      type: { type: "Fn", args: argTypes, ret: expr.ret, eff: expr.eff },
      eff: "!Pure"
      // Creating a lambda is Pure
    };
  }

  // src/typecheck/checks/data.ts
  function checkData(check2, ctx, expr, env, expectedType) {
    if (expr.kind === "Record") {
      const fields = {};
      let eff = "!Pure";
      let expectedFields;
      if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (resolved.type === "Record") {
          expectedFields = resolved.fields;
        }
      }
      if (!Array.isArray(expr.fields)) {
        throw new Error("Compiler Error: Record fields must be an array of Tuples");
      }
      for (const fieldExpr of expr.fields) {
        if (fieldExpr.kind !== "Tuple" || fieldExpr.items.length !== 2) {
          throw new Error("TypeError: Record field must be a Tuple (key, value)");
        }
        const keyExpr = fieldExpr.items[0];
        const valExpr = fieldExpr.items[1];
        if (keyExpr.kind !== "Literal" || keyExpr.value.kind !== "Str") {
          throw new Error("TypeError: Record keys must be string literals provided directly");
        }
        const key = keyExpr.value.value;
        const expectedFieldType = expectedFields ? expectedFields[key] : void 0;
        const res = check2(ctx, valExpr, env, expectedFieldType);
        fields[key] = res.type;
        eff = joinEffects(eff, res.eff);
      }
      return { type: { type: "Record", fields }, eff };
    }
    if (expr.kind === "Tagged") {
      let expectHint;
      let resolvedExpect;
      if (expectedType) {
        resolvedExpect = resolve(ctx, expectedType);
        if (resolvedExpect.type === "Union") {
          const variantType = resolvedExpect.variants[expr.tag];
          if (variantType) {
            expectHint = variantType;
          }
        } else if (resolvedExpect.type === "Result") {
          if (expr.tag === "Ok") expectHint = resolvedExpect.ok;
          else if (expr.tag === "Err") expectHint = resolvedExpect.err;
        } else if (resolvedExpect.type === "Option") {
          if (expr.tag === "Some") expectHint = resolvedExpect.inner;
        }
      }
      const valRes = check2(ctx, expr.value, env, expectHint);
      if (resolvedExpect) {
        if (resolvedExpect.type === "Union") {
          if (resolvedExpect.variants[expr.tag]) return { type: expectedType, eff: valRes.eff };
        } else if (resolvedExpect.type === "Result") {
          if (expr.tag === "Ok") return { type: expectedType, eff: valRes.eff };
          if (expr.tag === "Err") return { type: expectedType, eff: valRes.eff };
        } else if (resolvedExpect.type === "Option") {
          if (expr.tag === "Some") return { type: expectedType, eff: valRes.eff };
          if (expr.tag === "None") return { type: expectedType, eff: valRes.eff };
        }
      }
      const retType = { type: "Union", variants: { [expr.tag]: valRes.type } };
      return { type: retType, eff: valRes.eff };
    }
    if (expr.kind === "Tuple") {
      const items = [];
      let eff = "!Pure";
      let expectedItems;
      if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (resolved.type === "Tuple") {
          expectedItems = resolved.items;
        }
      }
      for (let i = 0; i < expr.items.length; i++) {
        const item = expr.items[i];
        const expect = expectedItems ? expectedItems[i] : void 0;
        const res = check2(ctx, item, env, expect);
        items.push(res.type);
        eff = joinEffects(eff, res.eff);
      }
      const retType = { type: "Tuple", items };
      if (expectedType && fmt(ctx, expectedType).includes("List Str")) {
      }
      return { type: retType, eff };
    }
    if (expr.kind === "List") {
      const items = [];
      let eff = "!Pure";
      let expectedInner;
      if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (resolved.type === "List") {
          expectedInner = resolved.inner;
        }
      }
      if (expr.items.length === 0) {
        if (expectedInner) {
          return { type: { type: "List", inner: expectedInner }, eff: "!Pure" };
        }
        if (expr.typeArg) {
          return { type: { type: "List", inner: expr.typeArg }, eff: "!Pure" };
        }
        return { type: { type: "List", inner: { type: "I64" } }, eff: "!Pure" };
      }
      let innerType = expectedInner;
      for (const item of expr.items) {
        const res = check2(ctx, item, env, innerType);
        if (!innerType) innerType = res.type;
        else expectType(ctx, innerType, res.type, "List item type mismatch");
        eff = joinEffects(eff, res.eff);
      }
      return { type: { type: "List", inner: innerType }, eff };
    }
    throw new Error(`Internal: checkData called on non-data expr ${expr.kind}`);
  }

  // src/typecheck/checks/call.ts
  function checkCall(check2, ctx, expr, env, expectedType) {
    if (expr.kind === "Var") {
      if (env.has(expr.name)) return { type: env.get(expr.name), eff: "!Pure" };
      if (ctx.constants.has(expr.name)) return { type: ctx.constants.get(expr.name), eff: "!Pure" };
      if (expr.name.includes(".")) {
        const parts = expr.name.split(".");
        let currentType = env.get(parts[0]) || ctx.constants.get(parts[0]);
        if (currentType) {
          for (let i = 1; i < parts.length; i++) {
            currentType = resolve(ctx, currentType);
            if (currentType.type === "Tuple") {
              const index = parseInt(parts[i]);
              if (isNaN(index)) throw new Error(`TypeError: Tuple index must be number: ${parts[i]}`);
              if (!currentType.items) throw new Error("Internal: Tuple missing items");
              if (index < 0 || index >= currentType.items.length) throw new Error(`TypeError: Tuple index out of bounds: ${index}`);
              currentType = currentType.items[index];
            } else {
              if (currentType.type !== "Record") throw new Error(`TypeError: Cannot access field ${parts[i]} of non-record ${parts.slice(0, i).join(".")}`);
              if (!currentType.fields) throw new Error("Internal: Record missing fields");
              const fields = currentType.fields;
              const fieldType = fields[parts[i]];
              if (!fieldType) throw new Error(`TypeError: Unknown field ${parts[i]} in record`);
              currentType = fieldType;
            }
          }
          return { type: currentType, eff: "!Pure" };
        }
      }
      throw new Error(`TypeError: Unknown variable: ${expr.name}`);
    }
    if (expr.kind === "Call") {
      let func = ctx.functions.get(expr.fn);
      if (!func && expr.fn.includes(".")) {
        const [alias, fname] = expr.fn.split(".");
        const importDecl = ctx.currentProgram?.imports.find((i) => i.alias === alias);
        if (importDecl && ctx.resolver) {
          const importedProg = ctx.resolver(importDecl.path);
          if (importedProg) {
            const targetDef = importedProg.defs.find((d) => (d.kind === "DefFn" || d.kind === "DefTool") && d.name === fname);
            if (targetDef) {
              const exportedTypes = new Set(importedProg.defs.filter((d) => d.kind === "TypeDef").map((d) => d.name));
              func = {
                args: targetDef.args.map((a) => qualifyType(ctx, a.type, alias, exportedTypes)),
                ret: qualifyType(ctx, targetDef.ret, alias, exportedTypes),
                eff: targetDef.eff
              };
            }
          }
        }
      }
      if (!func) throw new Error(`TypeError: Unknown function call: ${expr.fn}`);
      if (expr.args.length !== func.args.length) throw new Error(`TypeError: Arity mismatch for ${expr.fn}`);
      let eff = "!Pure";
      for (let i = 0; i < expr.args.length; i++) {
        const arg = check2(ctx, expr.args[i], env, func.args[i]);
        expectType(ctx, func.args[i], arg.type, `Argument ${i} mismatch`);
        eff = joinEffects(eff, arg.eff);
      }
      const callEff = func.eff === "!Infer" ? "!Any" : func.eff;
      return { type: func.ret, eff: joinEffects(eff, callEff) };
    }
    throw new Error(`Internal: checkCall called on non-callable expr ${expr.kind}`);
  }

  // src/typecheck/checks/intrinsic.ts
  function checkIntrinsic(check2, ctx, expr, env, expectedType) {
    if (expr.kind !== "Intrinsic") throw new Error("Internal: checkIntrinsic called on non-Intrinsic");
    let argHints = [];
    if (expectedType) {
      const resolved = resolve(ctx, expectedType);
      if (expr.op === "Ok" && resolved.type === "Result") argHints = [resolved.ok];
      else if (expr.op === "Err" && resolved.type === "Result") argHints = [resolved.err];
      else if (expr.op === "Some" && resolved.type === "Option") argHints = [resolved.inner];
      else if (expr.op === "cons" && resolved.type === "List") argHints = [resolved.inner, resolved];
    }
    const argTypes = [];
    let joinedEff = "!Pure";
    for (let i = 0; i < expr.args.length; i++) {
      const arg = expr.args[i];
      const hint = argHints[i];
      const res = check2(ctx, arg, env, hint);
      argTypes.push(res.type);
      joinedEff = joinEffects(joinedEff, res.eff);
    }
    if (["+", "-", "*", "/", "%", "<", "<=", "=", ">=", ">"].includes(expr.op)) {
      if (["+", "-", "*", "/", "%"].includes(expr.op)) {
        for (let i = 0; i < argTypes.length; i++) {
          if (argTypes[i].type !== "I64") {
            throw new Error(`TypeError: Type Error in ${expr.op} operand ${i + 1}: Expected I64, got ${argTypes[i].type}`);
          }
        }
        if (argTypes.length !== 2) throw new Error(`${expr.op} expects 2 operands`);
        return { type: { type: "I64" }, eff: joinedEff };
      }
      return { type: ["<=", "<", "=", ">=", ">"].includes(expr.op) ? { type: "Bool" } : { type: "I64" }, eff: joinedEff };
    }
    if (["&&", "||"].includes(expr.op)) {
      for (let i = 0; i < argTypes.length; i++) {
        if (argTypes[i].type !== "Bool") throw new Error(`TypeError: Expected Bool for ${expr.op}`);
      }
      return { type: { type: "Bool" }, eff: joinedEff };
    }
    if (expr.op === "!") {
      if (argTypes.length !== 1 || argTypes[0].type !== "Bool") throw new Error("TypeError: ! expects 1 Bool");
      return { type: { type: "Bool" }, eff: joinedEff };
    }
    if (expr.op === "Some") return { type: { type: "Option", inner: argTypes[0] }, eff: joinedEff };
    if (expr.op === "Ok") {
      let errType = { type: "Str" };
      if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (resolved.type === "Result") errType = resolved.err;
      }
      return { type: { type: "Result", ok: argTypes[0], err: errType }, eff: joinedEff };
    }
    if (expr.op === "Err") {
      let okType = { type: "I64" };
      if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (resolved.type === "Result") okType = resolved.ok;
      }
      return { type: { type: "Result", ok: okType, err: argTypes[0] }, eff: joinedEff };
    }
    if (expr.op === "cons") return { type: { type: "List", inner: argTypes[0] }, eff: joinedEff };
    if (expr.op.startsWith("io.")) {
      joinedEff = joinEffects(joinedEff, "!IO");
      if (expr.op === "io.read_file") return { type: { type: "Result", ok: { type: "Str" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "io.write_file") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "io.file_exists") return { type: { type: "Bool" }, eff: joinedEff };
      if (expr.op === "io.read_dir") return { type: { type: "Result", ok: { type: "List", inner: { type: "Str" } }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "io.print") return { type: { type: "I64" }, eff: joinedEff };
    }
    if (expr.op.startsWith("sys.")) {
      joinedEff = joinEffects(joinedEff, "!IO");
      if (expr.op === "sys.self") {
        if (argTypes.length !== 0) throw new Error("sys.self expects 0 arguments");
        return { type: { type: "I64" }, eff: joinedEff };
      }
      if (expr.op === "sys.recv") {
        if (argTypes.length !== 0) throw new Error("sys.recv expects 0 arguments");
        return { type: { type: "Str" }, eff: joinedEff };
      }
      if (expr.op === "sys.spawn") {
        if (argTypes.length !== 1) throw new Error("sys.spawn expects 1 argument");
        if (argTypes[0].type !== "Str") throw new Error("sys.spawn expects Str function name");
        return { type: { type: "I64" }, eff: joinedEff };
      }
      if (expr.op === "sys.sleep") {
        if (argTypes.length !== 1) throw new Error("sys.sleep expects 1 argument");
        if (argTypes[0].type !== "I64") throw new Error("sys.sleep expects I64 ms");
        return { type: { type: "Bool" }, eff: joinedEff };
      }
      if (expr.op === "sys.send") {
        if (argTypes.length !== 2) throw new Error("sys.send expects 2 arguments (pid, msg)");
        const [pid, msg] = argTypes;
        if (pid.type !== "I64") throw new Error("sys.send expects I64 pid");
        if (msg.type !== "Str") throw new Error("sys.send expects Str msg");
        return { type: { type: "Bool" }, eff: joinedEff };
      }
      if (expr.op === "sys.args") {
        if (argTypes.length !== 0) throw new Error("sys.args expects 0 arguments");
        return { type: { type: "List", inner: { type: "Str" } }, eff: joinedEff };
      }
    }
    if (expr.op.startsWith("net.")) {
      joinedEff = joinEffects(joinedEff, "!Net");
      if (expr.op === "net.listen") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "net.accept") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "net.read") return { type: { type: "Result", ok: { type: "Str" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "net.write") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "net.close") return { type: { type: "Result", ok: { type: "Bool" }, err: { type: "Str" } }, eff: joinedEff };
      if (expr.op === "net.connect") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
    }
    if (expr.op.startsWith("str.")) {
      if (expr.op === "str.len") {
        if (argTypes.length !== 1) throw new Error("str.len expects 1 arg");
        if (argTypes[0].type !== "Str") throw new Error("str.len expects Str");
        return { type: { type: "I64" }, eff: joinedEff };
      }
      if (expr.op === "str.concat") return { type: { type: "Str" }, eff: joinedEff };
      if (expr.op === "str.contains" || expr.op === "str.ends_with") return { type: { type: "Bool" }, eff: joinedEff };
      if (expr.op === "str.get") {
        if (argTypes.length !== 2) throw new Error("str.get expects 2 args (str, index)");
        if (argTypes[0].type !== "Str") throw new Error("str.get expects Str");
        if (argTypes[1].type !== "I64") throw new Error("str.get expects I64 index");
        return { type: { type: "Option", inner: { type: "I64" } }, eff: joinedEff };
      }
      if (expr.op === "str.substring") {
        if (argTypes.length !== 3) throw new Error("str.substring expects 3 args (str, start, end)");
        if (argTypes[0].type !== "Str") throw new Error("str.substring expects Str");
        if (argTypes[1].type !== "I64") throw new Error("str.substring expects I64 start");
        if (argTypes[2].type !== "I64") throw new Error("str.substring expects I64 end");
        return { type: { type: "Str" }, eff: joinedEff };
      }
      if (expr.op === "str.from_code") {
        if (argTypes.length !== 1) throw new Error("str.from_code expects 1 arg (code)");
        if (argTypes[0].type !== "I64") throw new Error("str.from_code expects I64");
        return { type: { type: "Str" }, eff: joinedEff };
      }
      if (expr.op === "str.index_of") {
        if (argTypes.length !== 2) throw new Error("str.index_of expects 2 args (str, substr)");
        if (argTypes[0].type !== "Str") throw new Error("str.index_of expects Str");
        if (argTypes[1].type !== "Str") throw new Error("str.index_of expects Str substring");
        return { type: { type: "Option", inner: { type: "I64" } }, eff: joinedEff };
      }
    }
    if (expr.op.startsWith("map.")) {
      if (expr.op === "map.make") {
        if (argTypes.length !== 2) throw new Error("map.make expects 2 arguments (key_witness, value_witness)");
        if (expectedType) {
          const resolved = resolve(ctx, expectedType);
          if (resolved.type === "Map") return { type: expectedType, eff: joinedEff };
        }
        return { type: { type: "Map", key: argTypes[0], value: argTypes[1] }, eff: joinedEff };
      }
      if (expr.op === "map.put") {
        if (argTypes.length !== 3) throw new Error("map.put expects 3 args (map, key, value)");
        const [m, k, v] = argTypes;
        if (m.type !== "Map") throw new Error("map.put expects Map as first arg");
        expectType(ctx, m.key, k, "map.put key mismatch");
        expectType(ctx, m.value, v, "map.put value mismatch");
        return { type: m, eff: joinedEff };
      }
      if (expr.op === "map.get") {
        if (argTypes.length !== 2) throw new Error("map.get expects 2 args (map, key)");
        const [m, k] = argTypes;
        if (m.type !== "Map") throw new Error("map.get expects Map as first arg");
        expectType(ctx, m.key, k, "map.get key mismatch");
        return { type: { type: "Option", inner: m.value }, eff: joinedEff };
      }
      if (expr.op === "map.contains") {
        if (argTypes.length !== 2) throw new Error("map.contains expects 2 args (map, key)");
        const [m, k] = argTypes;
        if (m.type !== "Map") throw new Error("map.contains expects Map as first arg");
        expectType(ctx, m.key, k, "map.contains key mismatch");
        return { type: { type: "Bool" }, eff: joinedEff };
      }
      if (expr.op === "map.keys") {
        if (argTypes.length !== 1) throw new Error("map.keys expects 1 arg (map)");
        const m = argTypes[0];
        if (m.type !== "Map") throw new Error("map.keys expects Map");
        return { type: { type: "List", inner: m.key }, eff: joinedEff };
      }
    }
    if (expr.op.startsWith("list.")) {
      if (expr.op === "list.length") {
        if (argTypes.length !== 1) throw new Error("list.length expects 1 arg (list)");
        if (argTypes[0].type !== "List") throw new Error("list.length expects List");
        return { type: { type: "I64" }, eff: joinedEff };
      }
      if (expr.op === "list.get") {
        if (argTypes.length !== 2) throw new Error("list.get expects 2 args (list, index)");
        const [l, idx] = argTypes;
        if (l.type !== "List") throw new Error("list.get expects List");
        if (idx.type !== "I64") throw new Error("list.get expects I64 index");
        return { type: { type: "Option", inner: l.inner }, eff: joinedEff };
      }
      if (expr.op === "list.concat") {
        if (argTypes.length !== 2) throw new Error("list.concat expects 2 args (list1, list2)");
        const [l1, l2] = argTypes;
        if (l1.type !== "List" || l2.type !== "List") throw new Error("list.concat expects two Lists");
        return { type: l1, eff: joinedEff };
      }
      if (expr.op === "list.unique") {
        if (argTypes.length !== 1) throw new Error("list.unique expects 1 arg (list)");
        return { type: argTypes[0], eff: joinedEff };
      }
    }
    if (expr.op === "i64.from_string") {
      if (argTypes.length !== 1) throw new Error("i64.from_string expects 1 arg (Str)");
      if (argTypes[0].type !== "Str") throw new Error("i64.from_string expects Str");
      return { type: { type: "I64" }, eff: joinedEff };
    }
    if (expr.op === "i64.to_string") {
      if (argTypes.length !== 1) throw new Error("i64.to_string expects 1 arg (I64)");
      if (argTypes[0].type !== "I64") throw new Error("i64.to_string expects I64");
      return { type: { type: "Str" }, eff: joinedEff };
    }
    if (expr.op === "tuple.get") {
      if (argTypes.length !== 2) throw new Error("tuple.get expects 2 args (tuple, index)");
      const [t, idx] = argTypes;
      if (t.type !== "Tuple") throw new Error("tuple.get expects Tuple");
      if (idx.type !== "I64") throw new Error("tuple.get expects I64 index");
      if (expr.args[1].kind === "Literal" && expr.args[1].value.kind === "I64") {
        const i = Number(expr.args[1].value.value);
        if (i < 0 || i >= t.items.length) throw new Error("tuple.get index out of bounds");
        return { type: t.items[i], eff: joinedEff };
      }
      throw new Error("tuple.get requires literal index for type safety");
    }
    if (expr.op === "record.get") {
      if (argTypes.length !== 2) throw new Error("record.get expects 2 args");
      const [rec, k] = argTypes;
      if (rec.type !== "Record") throw new Error("record.get expects Record");
      if (k.type !== "Str") throw new Error("record.get expects Str key");
      if (expr.args[1].kind === "Literal" && expr.args[1].value.kind === "Str") {
        const keyVal = expr.args[1].value.value;
        const fieldType = rec.fields[keyVal];
        if (!fieldType) throw new Error(`Record has no field '${keyVal}'`);
        return { type: fieldType, eff: joinedEff };
      }
      throw new Error("record.get requires literal string key");
    }
    if (expr.op === "http.parse_request") {
      joinedEff = joinEffects(joinedEff, "!Pure");
      const headerType = { type: "Record", fields: { key: { type: "Str" }, val: { type: "Str" } } };
      const httpReqType = { type: "Record", fields: { method: { type: "Str" }, path: { type: "Str" }, headers: { type: "List", inner: headerType }, body: { type: "Str" } } };
      return { type: { type: "Result", ok: httpReqType, err: { type: "Str" } }, eff: joinedEff };
    }
    if (expr.op === "http.parse_response") {
      joinedEff = joinEffects(joinedEff, "!Pure");
      const headerType = { type: "Record", fields: { key: { type: "Str" }, val: { type: "Str" } } };
      const httpResType = { type: "Record", fields: { version: { type: "Str" }, status: { type: "I64" }, headers: { type: "List", inner: headerType }, body: { type: "Str" } } };
      return { type: { type: "Result", ok: httpResType, err: { type: "Str" } }, eff: joinedEff };
    }
    throw new Error(`Unknown intrinsic: ${expr.op}`);
  }

  // src/typecheck/check-expr.ts
  function checkExprFull(ctx, expr, env, expectedType) {
    switch (expr.kind) {
      case "Literal":
        return checkLiteral(checkExprFull, ctx, expr, env, expectedType);
      case "Var":
      case "Call":
        return checkCall(checkExprFull, ctx, expr, env, expectedType);
      case "Let":
      case "If":
      case "Match":
        return checkControl(checkExprFull, ctx, expr, env, expectedType);
      case "Record":
      case "Tagged":
      case "Tuple":
      case "List":
        return checkData(checkExprFull, ctx, expr, env, expectedType);
      case "Intrinsic":
        return checkIntrinsic(checkExprFull, ctx, expr, env, expectedType);
      case "Lambda":
        return checkLambda(checkExprFull, ctx, expr, env, expectedType);
      default:
        throw new Error(`Unimplemented check for ${expr.kind}`);
    }
  }

  // src/typecheck/checker.ts
  var TypeChecker = class {
    constructor(resolver) {
      this.resolver = resolver;
      this.functions = /* @__PURE__ */ new Map();
      this.constants = /* @__PURE__ */ new Map();
      this.types = /* @__PURE__ */ new Map();
    }
    check(program) {
      this.currentProgram = program;
      if (this.resolver) {
        for (const imp of program.imports) {
          const mod = this.resolver(imp.path);
          if (mod) {
            const exportedTypes = new Set(mod.defs.filter((d) => d.kind === "TypeDef").map((d) => d.name));
            for (const def of mod.defs) {
              if (def.kind === "TypeDef") {
                const qualified = qualifyType(this, def.type, imp.alias, exportedTypes);
                this.types.set(`${imp.alias}.${def.name}`, qualified);
              }
            }
          }
        }
      }
      for (const def of program.defs) {
        if (def.kind === "DefConst") {
          this.constants.set(def.name, def.type);
        } else if (def.kind === "DefFn" || def.kind === "DefTool") {
          const argNames = /* @__PURE__ */ new Set();
          for (const a of def.args) {
            if (argNames.has(a.name)) throw new Error(`TypeError: Duplicate argument name: ${a.name}`);
            argNames.add(a.name);
          }
          this.functions.set(def.name, {
            args: def.args.map((a) => a.type),
            ret: def.ret,
            eff: def.eff
          });
        } else if (def.kind === "TypeDef") {
          this.types.set(def.name, def.type);
        }
      }
      for (const def of program.defs) {
        if (def.kind === "DefConst") {
          const { type, eff } = checkExprFull(this, def.value, /* @__PURE__ */ new Map());
          expectType(this, def.type, type, `Constant ${def.name} type mismatch`);
          checkEffectSubtype(this, eff, "!Pure", `Constant ${def.name} must be Pure`);
        } else if (def.kind === "DefFn") {
          const fnType = this.functions.get(def.name);
          const env = /* @__PURE__ */ new Map();
          for (let i = 0; i < def.args.length; i++) {
            env.set(def.args[i].name, def.args[i].type);
          }
          if (def.name === "type_check") console.log("Checking type_check. Ret:", JSON.stringify(def.ret));
          const { type: bodyType, eff: bodyEff } = checkExprFull(this, def.body, env, def.ret);
          expectType(this, def.ret, bodyType, `Function ${def.name} return type mismatch`);
          if (def.eff === "!Infer") {
            this.functions.set(def.name, { ...fnType, eff: bodyEff });
          } else {
            checkEffectSubtype(this, bodyEff, def.eff, `Function ${def.name}`);
          }
        } else if (def.kind === "DefTool") {
        } else if (def.kind === "TypeDef") {
        }
      }
    }
  };

  // src/eval/mocks.ts
  var MockFileSystem = class {
    constructor(data) {
      this.data = data;
    }
    readFile(path) {
      return this.data[path] ?? null;
    }
    writeFile(path, content) {
      this.data[path] = content;
      return true;
    }
    exists(path) {
      return path in this.data;
    }
    readDir(path) {
      if (path === ".") return Object.keys(this.data);
      return Object.keys(this.data).filter((k) => k.startsWith(path + "/"));
    }
  };
  var MockNetwork = class {
    async listen(port) {
      return 1;
    }
    async accept(h) {
      return 2;
    }
    // Return a client handle
    async read(h) {
      return "GET / HTTP/1.1\r\n\r\n";
    }
    async write(h, d) {
      return true;
    }
    async close(h) {
      return true;
    }
    async connect(host, port) {
      return 3;
    }
  };

  // src/eval/ops/math.ts
  function evalMath(op, args) {
    if (op === "=") {
      const v1 = args[0];
      const v2 = args[1];
      const r1 = typeof v1 === "bigint" ? { kind: "I64", value: v1 } : typeof v1 === "string" ? { kind: "Str", value: v1 } : v1;
      const r2 = typeof v2 === "bigint" ? { kind: "I64", value: v2 } : typeof v2 === "string" ? { kind: "Str", value: v2 } : v2;
      if (r1.kind === "I64" && r2.kind === "I64") return { kind: "Bool", value: r1.value === r2.value };
      if (r1.kind === "Str" && r2.kind === "Str") return { kind: "Bool", value: r1.value === r2.value };
      if (r1.kind === "Bool" && r2.kind === "Bool") return { kind: "Bool", value: r1.value === r2.value };
      return { kind: "Bool", value: false };
    }
    if (["+", "-", "*", "/", "%", "<=", "<", ">=", ">"].includes(op)) {
      let v1 = args[0];
      let v2 = args[1];
      const a = typeof v1 === "bigint" ? v1 : v1.kind === "I64" ? v1.value : null;
      const b = typeof v2 === "bigint" ? v2 : v2.kind === "I64" ? v2.value : null;
      if (a === null || b === null) throw new Error(`Math expects I64 for ${op}, got ${typeof v1 === "bigint" ? "bigint" : v1.kind} and ${typeof v2 === "bigint" ? "bigint" : v2.kind} `);
      const na = a;
      const nb = b;
      switch (op) {
        case "+":
          return { kind: "I64", value: na + nb };
        case "-":
          return { kind: "I64", value: na - nb };
        case "*":
          return { kind: "I64", value: na * nb };
        case "%": {
          if (nb === 0n) throw new Error("Modulo by zero");
          return { kind: "I64", value: na % nb };
        }
        case "/": {
          if (nb === 0n) throw new Error("Division by zero");
          return { kind: "I64", value: na / nb };
        }
        case "<=":
          return { kind: "Bool", value: na <= nb };
        case "<":
          return { kind: "Bool", value: na < nb };
        case ">=":
          return { kind: "Bool", value: na >= nb };
        case ">":
          return { kind: "Bool", value: na > nb };
      }
    }
    if (op === "&&") {
      const v1 = args[0];
      const v2 = args[1];
      if (v1.kind !== "Bool" || v2.kind !== "Bool") throw new Error("&& expects Bool");
      return { kind: "Bool", value: v1.value && v2.value };
    }
    if (op === "||") {
      const v1 = args[0];
      const v2 = args[1];
      if (v1.kind !== "Bool" || v2.kind !== "Bool") throw new Error("|| expects Bool");
      return { kind: "Bool", value: v1.value || v2.value };
    }
    if (op === "!") {
      const v1 = args[0];
      if (v1.kind !== "Bool") throw new Error("! expects Bool");
      return { kind: "Bool", value: !v1.value };
    }
    if (op === "i64.from_string") {
      const val = args[0];
      if (val.kind !== "Str") throw new Error("i64.from_string expects Str");
      if (val.value === "") throw new Error("i64.from_string: empty string");
      return { kind: "I64", value: BigInt(val.value) };
    }
    if (op === "i64.to_string") {
      const val = args[0];
      if (typeof val === "bigint") return { kind: "Str", value: val.toString() };
      if (val.kind !== "I64") throw new Error("i64.to_string expects I64");
      return { kind: "Str", value: val.value.toString() };
    }
    throw new Error(`Unknown math op: ${op}`);
  }

  // src/runtime/process.ts
  var ProcessManager = class _ProcessManager {
    constructor() {
      this.nextPid = 1;
      this.mailboxes = /* @__PURE__ */ new Map();
      this.receivers = /* @__PURE__ */ new Map();
    }
    static {
      this.instance = new _ProcessManager();
    }
    reset() {
      this.nextPid = 1;
      this.mailboxes.clear();
      this.receivers.clear();
    }
    getNextPid() {
      return this.nextPid++;
    }
    // Spawn a new process context (just registers it)
    register(pid) {
      this.mailboxes.set(pid, []);
      this.receivers.set(pid, []);
    }
    send(toPid, msg) {
      if (!this.mailboxes.has(toPid)) return false;
      const waiting = this.receivers.get(toPid);
      if (waiting && waiting.length > 0) {
        const resolve2 = waiting.shift();
        resolve2(msg);
      } else {
        this.mailboxes.get(toPid).push(msg);
      }
      return true;
    }
    async recv(pid) {
      if (!this.mailboxes.has(pid)) throw new Error(`Process ${pid} not registered`);
      const mailbox = this.mailboxes.get(pid);
      if (mailbox.length > 0) {
        return mailbox.shift();
      }
      return new Promise((resolve2) => {
        const waiting = this.receivers.get(pid);
        waiting.push(resolve2);
      });
    }
  };

  // src/eval/ops/sys.ts
  async function evalSys(ctx, op, args) {
    if (op === "sys.self") {
      return { kind: "I64", value: BigInt(ctx.pid) };
    }
    if (op === "sys.args") {
      const argsList = ctx.args.map((a) => ({ kind: "Str", value: a }));
      return { kind: "List", items: argsList };
    }
    if (op === "sys.spawn") {
      const fnName = args[0];
      if (fnName.kind !== "Str") throw new Error("sys.spawn expects function name (Str)");
      const childPid = ctx.spawn(fnName.value);
      return { kind: "I64", value: BigInt(childPid) };
    }
    if (op === "sys.send") {
      const pid = args[0];
      const msg = args[1];
      if (pid.kind !== "I64") throw new Error("sys.send expects PID (I64)");
      if (msg.kind !== "Str") throw new Error("sys.send expects Msg (Str)");
      const sent = ProcessManager.instance.send(Number(pid.value), msg.value);
      return { kind: "Bool", value: sent };
    }
    if (op === "sys.recv") {
      const msg = await ProcessManager.instance.recv(ctx.pid);
      return { kind: "Str", value: msg };
    }
    if (op === "sys.sleep") {
      const ms = args[0];
      if (ms.kind !== "I64") throw new Error("sys.sleep expects I64 ms");
      await new Promise((resolve2) => setTimeout(resolve2, Number(ms.value)));
      return { kind: "Bool", value: true };
    }
    throw new Error(`Unknown sys op: ${op}`);
  }

  // src/eval/ops/io.ts
  function evalIo(ctx, op, args) {
    if (op === "io.read_file") {
      const path = args[0];
      if (path.kind !== "Str") throw new Error("path must be string");
      const content = ctx.fs.readFile(path.value);
      if (content !== null) {
        return { kind: "Result", isOk: true, value: { kind: "Str", value: content } };
      } else {
        return { kind: "Result", isOk: false, value: { kind: "Str", value: "ENOENT" } };
      }
    }
    if (op === "io.write_file") {
      const path = args[0];
      const content = args[1];
      if (path.kind !== "Str") throw new Error("path must be string");
      if (content.kind !== "Str") throw new Error("content must be string");
      ctx.fs.writeFile(path.value, content.value);
      return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(content.value.length) } };
    }
    if (op === "io.file_exists") {
      const path = args[0];
      if (path.kind !== "Str") throw new Error("path must be string");
      return { kind: "Bool", value: ctx.fs.exists(path.value) };
    }
    if (op === "io.read_dir") {
      const path = args[0];
      if (path.kind !== "Str") throw new Error("path must be string");
      if (!ctx.fs.readDir) return { kind: "Result", isOk: false, value: { kind: "Str", value: "Not supported" } };
      const entries = ctx.fs.readDir(path.value);
      if (entries === null) return { kind: "Result", isOk: false, value: { kind: "Str", value: "Directory not found or error" } };
      const listVal = {
        kind: "List",
        items: entries.map((s) => ({ kind: "Str", value: s }))
      };
      return { kind: "Result", isOk: true, value: listVal };
    }
    if (op === "io.print") {
      const val = args[0];
      if (val.kind === "Str") {
        console.log(val.value);
      } else if (val.kind === "I64" || val.kind === "Bool") {
        console.log(val.value.toString());
      } else {
        console.log(JSON.stringify(val, (k, v) => typeof v === "bigint" ? v.toString() : v));
      }
      return { kind: "I64", value: 0n };
    }
    throw new Error(`Unknown io op: ${op}`);
  }

  // src/eval/ops/net.ts
  async function evalNet(ctx, op, args) {
    if (op === "net.listen") {
      const port = args[0];
      if (port.kind !== "I64") throw new Error("net.listen expects I64 port");
      const h = await ctx.net.listen(Number(port.value));
      if (h !== null) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(h) } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Listen failed" } };
    }
    if (op === "net.accept") {
      const serverSock = args[0];
      if (serverSock.kind !== "I64") throw new Error("net.accept expects I64");
      const h = await ctx.net.accept(Number(serverSock.value));
      if (h !== null) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(h) } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Accept failed" } };
    }
    if (op === "net.read") {
      const sock = args[0];
      if (sock.kind !== "I64") throw new Error("net.read expects I64");
      const s = await ctx.net.read(Number(sock.value));
      if (s !== null) return { kind: "Result", isOk: true, value: { kind: "Str", value: s } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Read failed" } };
    }
    if (op === "net.write") {
      const sock = args[0];
      const str = args[1];
      if (sock.kind !== "I64") throw new Error("net.write expects I64");
      if (str.kind !== "Str") throw new Error("net.write expects Str");
      const s = await ctx.net.write(Number(sock.value), str.value);
      if (s) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(s ? 1 : 0) } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Write failed" } };
    }
    if (op === "net.close") {
      const sock = args[0];
      if (sock.kind !== "I64") throw new Error("net.close expects I64");
      const s = await ctx.net.close(Number(sock.value));
      if (s) return { kind: "Result", isOk: true, value: { kind: "Bool", value: true } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Close failed" } };
    }
    if (op === "net.connect") {
      const host = args[0];
      const port = args[1];
      if (host.kind !== "Str") throw new Error("net.connect expects Str host");
      if (port.kind !== "I64") throw new Error("net.connect expects I64 port");
      const h = await ctx.net.connect(host.value, Number(port.value));
      if (h !== null) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(h) } };
      return { kind: "Result", isOk: false, value: { kind: "Str", value: "Connect failed" } };
    }
    throw new Error(`Unknown net op: ${op}`);
  }

  // src/eval/ops/http.ts
  function evalHttp(op, args) {
    if (op === "http.parse_request") {
      const raw = args[0];
      if (raw.kind !== "Str") throw new Error("http.parse_request expects Str");
      const text = raw.value;
      try {
        const parts = text.split(/\r?\n\r?\n/);
        const head = parts[0];
        const body = parts.slice(1).join("\n\n");
        const lines = head.split(/\r?\n/);
        if (lines.length === 0) throw new Error("Empty request");
        const reqLine = lines[0].split(" ");
        if (reqLine.length < 3) throw new Error("Invalid request line");
        const method = reqLine[0];
        const path = reqLine[1];
        const headers = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const idx = line.indexOf(":");
          if (idx !== -1) {
            const key = line.substring(0, idx).trim();
            const val = line.substring(idx + 1).trim();
            headers.push({
              kind: "Record",
              fields: {
                key: { kind: "Str", value: key },
                val: { kind: "Str", value: val }
              }
            });
          }
        }
        const reqRecord = {
          kind: "Record",
          fields: {
            method: { kind: "Str", value: method },
            path: { kind: "Str", value: path },
            headers: { kind: "List", items: headers },
            body: { kind: "Str", value: body }
          }
        };
        return { kind: "Result", isOk: true, value: reqRecord };
      } catch (e) {
        return { kind: "Result", isOk: false, value: { kind: "Str", value: e.message } };
      }
    }
    if (op === "http.parse_response") {
      const raw = args[0];
      if (raw.kind !== "Str") throw new Error("http.parse_response expects Str");
      const text = raw.value;
      try {
        const parts = text.split(/\r?\n\r?\n/);
        const head = parts[0];
        const body = parts.slice(1).join("\n\n");
        const lines = head.split(/\r?\n/);
        if (lines.length === 0) throw new Error("Empty response");
        const statusLine = lines[0].split(" ");
        if (statusLine.length < 2) throw new Error("Invalid status line");
        const version = statusLine[0];
        const statusCode = BigInt(parseInt(statusLine[1]));
        const headers = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const idx = line.indexOf(":");
          if (idx !== -1) {
            const key = line.substring(0, idx).trim();
            const val = line.substring(idx + 1).trim();
            headers.push({
              kind: "Record",
              fields: {
                key: { kind: "Str", value: key },
                val: { kind: "Str", value: val }
              }
            });
          }
        }
        const resRecord = {
          kind: "Record",
          fields: {
            version: { kind: "Str", value: version },
            status: { kind: "I64", value: statusCode },
            headers: { kind: "List", items: headers },
            body: { kind: "Str", value: body }
          }
        };
        return { kind: "Result", isOk: true, value: resRecord };
      } catch (e) {
        return { kind: "Result", isOk: false, value: { kind: "Str", value: e.message } };
      }
    }
    throw new Error(`Unknown http op: ${op}`);
  }

  // src/eval/ops/constructors.ts
  function evalConstructor(op, args) {
    if (op === "Some") {
      return { kind: "Option", value: args[0] };
    }
    if (op === "Ok") return { kind: "Result", isOk: true, value: args[0] };
    if (op === "Err") return { kind: "Result", isOk: false, value: args[0] };
    throw new Error(`Unknown constructor op: ${op}`);
  }

  // src/eval/utils.ts
  function valueToKey(v) {
    if (v.kind === "I64") return `I64:${v.value}`;
    if (v.kind === "Str") return `Str:${v.value}`;
    if (v.kind === "Tagged") {
      return `Tagged:${v.tag}:${JSON.stringify(v.value, (_, val) => typeof val === "bigint" ? val.toString() + "n" : val)}`;
    }
    throw new Error(`Runtime: Invalid map key type: ${v.kind}`);
  }
  function keyToValue(k) {
    if (k.startsWith("I64:")) {
      return { kind: "I64", value: BigInt(k.substring(4)) };
    }
    if (k.startsWith("Str:")) {
      return { kind: "Str", value: k.substring(4) };
    }
    if (k.startsWith("Tagged:")) {
      const firstColon = k.indexOf(":");
      const secondColon = k.indexOf(":", firstColon + 1);
      if (secondColon === -1) throw new Error(`Runtime: Invalid tagged key format: ${k}`);
      const tag = k.substring(firstColon + 1, secondColon);
      const json = k.substring(secondColon + 1);
      const val = JSON.parse(json, (_, v) => {
        if (typeof v === "string" && /^\d+n$/.test(v)) return BigInt(v.slice(0, -1));
        return v;
      });
      const kind = typeof val === "bigint" ? "I64" : typeof val === "string" ? "Str" : "Tuple";
      return { kind: "Tagged", tag, value: val };
    }
    throw new Error(`Runtime: Invalid map key string: ${k}`);
  }

  // src/eval/ops/data.ts
  function evalData(op, args) {
    if (op === "str.concat") return { kind: "Str", value: (args[0]?.value || "") + (args[1]?.value || "") };
    if (op === "str.len") return { kind: "I64", value: BigInt((args[0]?.value || "").length) };
    if (op === "str.get") {
      const s = args[0].value;
      const i = Number(args[1].value);
      if (i >= 0 && i < s.length) return { kind: "Option", value: { kind: "I64", value: BigInt(s.charCodeAt(i)) } };
      return { kind: "Option", value: null };
    }
    if (op === "str.substring") return { kind: "Str", value: args[0].value.substring(Number(args[1].value), Number(args[2].value)) };
    if (op === "str.from_code") return { kind: "Str", value: String.fromCharCode(Number(args[0].value)) };
    if (op === "str.index_of") {
      const s = args[0].value;
      const sub = args[1].value;
      const idx = s.indexOf(sub);
      if (idx === -1) return { kind: "Option", value: null };
      return { kind: "Option", value: { kind: "I64", value: BigInt(idx) } };
    }
    if (op === "str.contains") return { kind: "Bool", value: args[0].value.includes(args[1].value) };
    if (op === "str.ends_with") return { kind: "Bool", value: args[0].value.endsWith(args[1].value) };
    if (op === "cons") {
      const h = args[0];
      const t = args[1];
      if (t.kind === "Tagged" && t.tag === "nil") {
        return { kind: "List", items: [h] };
      }
      if (t.kind !== "List") throw new Error("cons arguments must be (head, tail-list)");
      return { kind: "List", items: [h, ...t.items] };
    }
    if (op.startsWith("list.")) {
      if (op === "list.length") return { kind: "I64", value: BigInt(args[0].items.length) };
      if (op === "list.get") {
        const l = args[0].items;
        const i = Number(args[1].value);
        if (i >= 0 && i < l.length) return { kind: "Option", value: l[i] };
        return { kind: "Option", value: null };
      }
      if (op === "list.concat") return { kind: "List", items: [...args[0].items, ...args[1].items] };
      if (op === "list.unique") {
        const l = args[0];
        const seen = /* @__PURE__ */ new Set();
        const items = [];
        for (const item of l.items) {
          const k = valueToKey(item);
          if (!seen.has(k)) {
            seen.add(k);
            items.push(item);
          }
        }
        return { kind: "List", items };
      }
    }
    if (op.startsWith("map.")) {
      if (op === "map.make") return { kind: "Map", value: /* @__PURE__ */ new Map() };
      if (op === "map.put") {
        const m = args[0];
        const k = args[1];
        const v = args[2];
        const newMap = new Map(m.value);
        newMap.set(valueToKey(k), v);
        return { kind: "Map", value: newMap };
      }
      if (op === "map.get") {
        const m = args[0];
        const k = args[1];
        const v = m.value.get(valueToKey(k));
        return v ? { kind: "Option", value: v } : { kind: "Option", value: null };
      }
      if (op === "map.contains") return { kind: "Bool", value: args[0].value.has(valueToKey(args[1])) };
      if (op === "map.keys") {
        const m = args[0];
        const keys = Array.from(m.value.keys()).map((k) => keyToValue(k));
        return { kind: "List", items: keys };
      }
    }
    if (op === "record.get") {
      const r = args[0];
      const f = args[1];
      if (r.kind !== "Record" || f.kind !== "Str") throw new Error("record.get expects Record and Str");
      const val = r.fields[f.value];
      if (val === void 0) throw new Error(`Field ${f.value} not found`);
      return val;
    }
    if (op === "tuple.get") {
      const t = args[0];
      const i = args[1];
      if (t.kind !== "Tuple" || i.kind !== "I64") throw new Error("tuple.get expects Tuple and I64");
      const idx = Number(i.value);
      if (idx < 0 || idx >= t.items.length) throw new Error("Tuple index out of bounds");
      return t.items[idx];
    }
    return void 0;
  }

  // src/eval/ops/index.ts
  async function evalIntrinsic(ctx, op, args) {
    if (op.startsWith("sys.")) return evalSys(ctx, op, args);
    if (op.startsWith("net.")) return evalNet(ctx, op, args);
    if (op.startsWith("io.")) return evalIo(ctx, op, args);
    if (op.startsWith("http.")) return evalHttp(op, args);
    if (["Some", "Ok", "Err"].includes(op)) return evalConstructor(op, args);
    const dataRes = evalData(op, args);
    if (dataRes) return dataRes;
    return evalMath(op, args);
  }

  // src/eval/expr.ts
  async function evalExpr(ctx, expr, env) {
    switch (expr.kind) {
      case "Literal":
        return expr.value;
      case "Var": {
        let current = env;
        while (current) {
          if (current.name === expr.name) return current.value;
          current = current.parent;
        }
        const c = ctx.constants.get(expr.name);
        if (c !== void 0) return c;
        if (expr.name.includes(".")) {
          const parts = expr.name.split(".");
          let currentVal = void 0;
          let e = env;
          while (e) {
            if (e.name === parts[0]) {
              currentVal = e.value;
              break;
            }
            e = e.parent;
          }
          if (!currentVal) currentVal = ctx.constants.get(parts[0]);
          if (currentVal) {
            for (let i = 1; i < parts.length; i++) {
              const part = parts[i];
              if (currentVal.kind === "Record") {
                const fieldVal = currentVal.fields[part];
                if (!fieldVal) throw new Error(`Runtime: Unknown field ${part} `);
                currentVal = fieldVal;
              } else if (currentVal.kind === "Tuple") {
                const index = parseInt(part);
                if (isNaN(index)) throw new Error(`Runtime: Tuple index must be number, got ${part} `);
                if (index < 0 || index >= currentVal.items.length) throw new Error(`Runtime: Tuple index out of bounds ${index} `);
                currentVal = currentVal.items[index];
              } else {
                throw new Error(`Runtime: Cannot access field ${part} of ${currentVal.kind} `);
              }
            }
            return currentVal;
          }
        }
        throw new Error(`Runtime Unknown variable: ${expr.name} `);
      }
      case "Let": {
        const val = await evalExpr(ctx, expr.value, env);
        const newEnv = { name: expr.name, value: val, parent: env };
        return evalExpr(ctx, expr.body, newEnv);
      }
      case "If": {
        const cond = await evalExpr(ctx, expr.cond, env);
        if (cond.kind !== "Bool") throw new Error("If condition must be Bool");
        if (cond.value) {
          return evalExpr(ctx, expr.then, env);
        } else {
          return evalExpr(ctx, expr.else, env);
        }
      }
      case "Call": {
        let func = ctx.functions.get(expr.fn);
        if (!func && expr.fn.includes(".")) {
          const [alias, fname] = expr.fn.split(".");
          const importDecl = ctx.program.imports.find((i) => i.alias === alias);
          if (importDecl && ctx.resolver) {
            const importedProg = ctx.resolver(importDecl.path);
            if (importedProg) {
              const targetDef = importedProg.defs.find((d) => (d.kind === "DefFn" || d.kind === "DefTool") && d.name === fname);
              if (targetDef) {
                func = targetDef;
              }
            }
          }
        }
        const args = [];
        for (const arg of expr.args) {
          args.push(await evalExpr(ctx, arg, env));
        }
        if (expr.fn.includes(".")) {
          const [alias, fname] = expr.fn.split(".");
          const importDecl = ctx.program.imports.find((i) => i.alias === alias);
          if (importDecl && ctx.resolver) {
            const importedPath = importDecl.path;
            let subInterp = ctx.getInterpreter(importedPath);
            if (!subInterp) {
              const importedProg = ctx.resolver(importedPath);
              if (importedProg) {
                subInterp = ctx.createInterpreter(importedProg);
              }
            }
            if (subInterp) {
              return subInterp.callFunction(fname, args);
            }
          }
        }
        if (!func) {
          try {
            return await evalIntrinsic(ctx, expr.fn, args);
          } catch (e) {
            throw new Error(`Unknown function: ${expr.fn}`);
          }
        }
        if (func.kind === "DefTool") {
          if (!ctx.tools) throw new Error(`Tool not implemented: ${expr.fn}`);
          return ctx.tools.callTool(expr.fn, args);
        }
        if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);
        let newEnv = void 0;
        for (let i = 0; i < args.length; i++) {
          newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
        }
        return evalExpr(ctx, func.body, newEnv);
      }
      case "Match": {
        const target = await evalExpr(ctx, expr.target, env);
        for (const c of expr.cases) {
          let match = false;
          let newEnv = env;
          if (target.kind === "Option") {
            if (c.tag === "None" && target.value === null) match = true;
            else if (c.tag === "Some" && target.value !== null) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
              }
            }
          } else if (target.kind === "Result") {
            if (c.tag === "Ok" && target.isOk) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
              }
            } else if (c.tag === "Err" && !target.isOk) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
              }
            }
          } else if (target.kind === "List") {
            if (c.tag === "nil" && target.items.length === 0) {
              match = true;
            } else if (c.tag === "cons" && target.items.length > 0) {
              match = true;
              if (c.vars.kind === "List") {
                if (c.vars.items.length >= 1) {
                  const headName = c.vars.items[0];
                  if (headName.kind === "Str") newEnv = { name: headName.value, value: target.items[0], parent: newEnv };
                }
                if (c.vars.items.length >= 2) {
                  const tailName = c.vars.items[1];
                  if (tailName.kind === "Str") newEnv = { name: tailName.value, value: { kind: "List", items: target.items.slice(1) }, parent: newEnv };
                }
              }
            }
          } else if (target.kind === "Tagged") {
            if (c.tag === target.tag) {
              match = true;
              if (target.value && c.vars.kind === "List" && c.vars.items.length > 0) {
                const varNameVal = c.vars.items[0];
                if (varNameVal.kind === "Str") {
                  newEnv = { name: varNameVal.value, value: target.value, parent: newEnv };
                }
              }
            }
          } else if (target.kind === "Tuple" && target.items.length > 0 && target.items[0].kind === "Str") {
            const tagName = target.items[0].value;
            if (c.tag === tagName) {
              match = true;
              if (c.vars.kind === "List") {
                for (let i = 0; i < c.vars.items.length; i++) {
                  if (i + 1 < target.items.length) {
                    const varVal = c.vars.items[i];
                    if (varVal.kind === "Str") {
                      newEnv = { name: varVal.value, value: target.items[i + 1], parent: newEnv };
                    }
                  }
                }
              }
            }
          }
          if (match || c.tag === "_") {
            return evalExpr(ctx, c.body, newEnv);
          }
        }
        const replacer = (_, v) => typeof v === "bigint" ? v.toString() + "n" : v;
        throw new Error(`No matching case for value ${JSON.stringify(target, replacer)}`);
      }
      case "Record": {
        const fields = {};
        for (const fieldTuple of expr.fields) {
          const tupleVal = await evalExpr(ctx, fieldTuple, env);
          if (tupleVal.kind !== "Tuple" || tupleVal.items.length !== 2) throw new Error("Invalid record field tuple");
          const keyVal = tupleVal.items[0];
          if (keyVal.kind !== "Str") throw new Error("Record key must be Str");
          fields[keyVal.value] = tupleVal.items[1];
        }
        return { kind: "Record", fields };
      }
      case "Tagged": {
        const val = await evalExpr(ctx, expr.value, env);
        return { kind: "Tagged", tag: expr.tag, value: val };
      }
      case "Tuple": {
        const items = [];
        for (const item of expr.items) {
          items.push(await evalExpr(ctx, item, env));
        }
        return { kind: "Tuple", items };
      }
      case "List": {
        const items = [];
        for (const item of expr.items) {
          items.push(await evalExpr(ctx, item, env));
        }
        return { kind: "List", items };
      }
      case "Intrinsic": {
        const args = [];
        for (const arg of expr.args) {
          args.push(await evalExpr(ctx, arg, env));
        }
        return evalIntrinsic(ctx, expr.op, args);
      }
      default:
        throw new Error(`Unimplemented eval for ${expr.kind}`);
    }
  }

  // src/eval/sync.ts
  function evalExprSync(ctx, expr, env) {
    let currentExpr = expr;
    let currentEnv = env;
    let depthCounter = 0;
    while (true) {
      switch (currentExpr.kind) {
        case "Literal":
          return currentExpr.value;
        case "Var": {
          let current = currentEnv;
          while (current) {
            if (current.name === currentExpr.name) return current.value;
            current = current.parent;
          }
          const c = ctx.constants.get(currentExpr.name);
          if (c !== void 0) return c;
          if (currentExpr.name.includes(".")) {
            const parts = currentExpr.name.split(".");
            let currentVal = void 0;
            let e = currentEnv;
            while (e) {
              if (e.name === parts[0]) {
                currentVal = e.value;
                break;
              }
              e = e.parent;
            }
            if (!currentVal) currentVal = ctx.constants.get(parts[0]);
            if (currentVal) {
              for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                if (currentVal.kind === "Record") {
                  const fieldVal = currentVal.fields[part];
                  if (!fieldVal) throw new Error(`Runtime: Unknown field ${part} `);
                  currentVal = fieldVal;
                } else if (currentVal.kind === "Tuple") {
                  const index = parseInt(part);
                  if (isNaN(index)) throw new Error(`Runtime: Tuple index must be number, got ${part} `);
                  if (index < 0 || index >= currentVal.items.length) throw new Error(`Runtime: Tuple index out of bounds ${index} `);
                  currentVal = currentVal.items[index];
                } else {
                  throw new Error(`Runtime: Cannot access field ${part} of ${currentVal.kind} `);
                }
              }
              return currentVal;
            }
          }
          throw new Error(`Runtime Unknown variable: ${currentExpr.name} `);
        }
        case "Let": {
          const val = evalExprSync(ctx, currentExpr.value, currentEnv);
          const newEnv = { name: currentExpr.name, value: val, parent: currentEnv };
          currentExpr = currentExpr.body;
          currentEnv = newEnv;
          continue;
        }
        case "If": {
          const cond = evalExprSync(ctx, currentExpr.cond, currentEnv);
          if (cond.kind !== "Bool") throw new Error("If condition must be Bool");
          if (cond.value) {
            currentExpr = currentExpr.then;
          } else {
            currentExpr = currentExpr.else;
          }
          continue;
        }
        case "Call": {
          let func = ctx.functions.get(currentExpr.fn);
          if (!func && currentExpr.fn.includes(".")) {
            const [alias, fname] = currentExpr.fn.split(".");
            const importDecl = ctx.program.imports.find((i) => i.alias === alias);
            if (importDecl && ctx.resolver) {
              const importedProg = ctx.resolver(importDecl.path);
              if (importedProg) {
                const targetDef = importedProg.defs.find((d) => (d.kind === "DefFn" || d.kind === "DefTool") && d.name === fname);
                if (targetDef) {
                  func = targetDef;
                }
              }
            }
          }
          const args = [];
          for (const arg of currentExpr.args) {
            args.push(evalExprSync(ctx, arg, currentEnv));
          }
          if (currentExpr.fn.includes(".")) {
            const [alias, fname] = currentExpr.fn.split(".");
            const importDecl = ctx.program.imports.find((i) => i.alias === alias);
            if (importDecl && ctx.resolver) {
              const importedPath = importDecl.path;
              let subInterp = ctx.getInterpreter(importedPath);
              if (!subInterp) {
                const importedProg = ctx.resolver(importedPath);
                if (importedProg) {
                  subInterp = ctx.createInterpreter(importedProg);
                }
              }
              if (subInterp) {
                return subInterp.callFunctionSync(fname, args);
              }
            }
          }
          if (!func) {
            return evalIntrinsicSync(ctx, currentExpr.fn, args);
          }
          if (func.kind === "DefTool") {
            if (!ctx.tools?.callToolSync) throw new Error(`Tool not implemented: ${currentExpr.fn}`);
            return ctx.tools.callToolSync(currentExpr.fn, args);
          }
          if (args.length !== func.args.length) throw new Error(`Arity mismatch error call ${currentExpr.fn} expected ${func.args.length} args, got ${args.length} `);
          let newEnv = void 0;
          for (let i = 0; i < args.length; i++) {
            newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
          }
          currentExpr = func.body;
          currentEnv = newEnv;
          continue;
        }
        case "Match": {
          const target = evalExprSync(ctx, currentExpr.target, currentEnv);
          let foundCase = false;
          for (const c of currentExpr.cases) {
            let match = false;
            let newEnv = currentEnv;
            if (target.kind === "Option") {
              if (c.tag === "None" && target.value === null) match = true;
              else if (c.tag === "Some" && target.value !== null) {
                match = true;
                if (c.vars.kind === "List" && c.vars.items.length > 0) {
                  const varVal = c.vars.items[0];
                  if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                }
              }
            } else if (target.kind === "Result") {
              if (c.tag === "Ok" && target.isOk) {
                match = true;
                if (c.vars.kind === "List" && c.vars.items.length > 0) {
                  const varVal = c.vars.items[0];
                  if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                }
              } else if (c.tag === "Err" && !target.isOk) {
                match = true;
                if (c.vars.kind === "List" && c.vars.items.length > 0) {
                  const varVal = c.vars.items[0];
                  if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                }
              }
            } else if (target.kind === "Tagged") {
              if (c.tag === target.tag) {
                match = true;
                if (target.value && c.vars.kind === "List" && c.vars.items.length > 0) {
                  const varNameVal = c.vars.items[0];
                  if (varNameVal.kind === "Str") {
                    newEnv = { name: varNameVal.value, value: target.value, parent: newEnv };
                  }
                }
              }
            } else if (target.kind === "List") {
              if (c.tag === "nil" && target.items.length === 0) {
                match = true;
              } else if (c.tag === "cons" && target.items.length > 0) {
                match = true;
                if (c.vars.kind === "List") {
                  if (c.vars.items.length >= 1) {
                    const headName = c.vars.items[0];
                    if (headName.kind === "Str") newEnv = { name: headName.value, value: target.items[0], parent: newEnv };
                  }
                  if (c.vars.items.length >= 2) {
                    const tailName = c.vars.items[1];
                    if (tailName.kind === "Str") newEnv = { name: tailName.value, value: { kind: "List", items: target.items.slice(1) }, parent: newEnv };
                  }
                }
              }
            } else if (target.kind === "Tuple" && target.items.length > 0 && target.items[0].kind === "Str") {
              const tagName = target.items[0].value;
              if (c.tag === tagName) {
                match = true;
                if (c.vars.kind === "List") {
                  for (let i = 0; i < c.vars.items.length; i++) {
                    if (i + 1 < target.items.length) {
                      const varVal = c.vars.items[i];
                      if (varVal.kind === "Str") newEnv = { name: varVal.value, value: target.items[i + 1], parent: newEnv };
                    }
                  }
                }
              }
            }
            if (match || c.tag === "_") {
              currentExpr = c.body;
              currentEnv = newEnv;
              foundCase = true;
              break;
            }
          }
          if (foundCase) continue;
          const replacer = (_, v) => typeof v === "bigint" ? v.toString() + "n" : v;
          throw new Error(`Non - exhaustive match for ${JSON.stringify(target, replacer)}`);
        }
        case "Record": {
          const fields = {};
          for (const fieldTuple of currentExpr.fields) {
            const tupleVal = evalExprSync(ctx, fieldTuple, currentEnv);
            if (tupleVal.kind !== "Tuple" || tupleVal.items.length !== 2) throw new Error("Invalid record field tuple");
            const keyVal = tupleVal.items[0];
            if (keyVal.kind !== "Str") throw new Error("Record key must be Str");
            fields[keyVal.value] = tupleVal.items[1];
          }
          return { kind: "Record", fields };
        }
        case "Tuple": {
          const items = [];
          for (const item of currentExpr.items) {
            items.push(evalExprSync(ctx, item, currentEnv));
          }
          return { kind: "Tuple", items };
        }
        case "List": {
          const items = [];
          for (const item of currentExpr.items) {
            items.push(evalExprSync(ctx, item, currentEnv));
          }
          return { kind: "List", items };
        }
        case "Intrinsic": {
          const args = [];
          for (const arg of currentExpr.args) {
            args.push(evalExprSync(ctx, arg, currentEnv));
          }
          return evalIntrinsicSync(ctx, currentExpr.op, args);
        }
        case "Tagged": {
          const val = evalExprSync(ctx, currentExpr.value, currentEnv);
          return { kind: "Tagged", tag: currentExpr.tag, value: val };
        }
        case "Lambda": {
          return {
            kind: "Lambda",
            args: currentExpr.args,
            ret: currentExpr.ret,
            eff: currentExpr.eff,
            body: currentExpr.body,
            env: currentEnv
          };
        }
        default:
          throw new Error(`Unimplemented evalSync for ${currentExpr.kind}`);
      }
    }
  }
  function evalIntrinsicSync(ctx, op, args) {
    if (["Some", "Ok", "Err"].includes(op)) return evalConstructor(op, args);
    if (op.startsWith("http.")) return evalHttp(op, args);
    if (op.startsWith("io.")) return evalIo(ctx, op, args);
    try {
      return evalMath(op, args);
    } catch (e) {
    }
    if (op.startsWith("map.")) {
      if (op === "map.make") return { kind: "Map", value: /* @__PURE__ */ new Map() };
      if (op === "map.put") {
        const m = args[0];
        const k = args[1];
        const v = args[2];
        const newMap = new Map(m.value);
        newMap.set(valueToKey(k), v);
        return { kind: "Map", value: newMap };
      }
      if (op === "map.get") {
        const m = args[0];
        const k = args[1];
        const v = m.value.get(valueToKey(k));
        return v ? { kind: "Option", value: v } : { kind: "Option", value: null };
      }
      if (op === "map.contains") return { kind: "Bool", value: args[0].value.has(valueToKey(args[1])) };
      if (op === "map.keys") {
        const m = args[0];
        const keys = Array.from(m.value.keys()).map((k) => keyToValue(k));
        return { kind: "List", items: keys };
      }
    }
    if (op === "cons") return { kind: "List", items: [args[0], ...args[1].items] };
    if (op.startsWith("list.")) {
      if (op === "list.length") return { kind: "I64", value: BigInt(args[0].items.length) };
      if (op === "list.get") {
        const l = args[0].items;
        const i = Number(args[1].value);
        if (i >= 0 && i < l.length) return { kind: "Option", value: l[i] };
        return { kind: "Option", value: null };
      }
      if (op === "list.concat") return { kind: "List", items: [...args[0].items, ...args[1].items] };
      if (op === "list.unique") {
        const l = args[0];
        const seen = /* @__PURE__ */ new Set();
        const items = [];
        for (const item of l.items) {
          const k = valueToKey(item);
          if (!seen.has(k)) {
            seen.add(k);
            items.push(item);
          }
        }
        return { kind: "List", items };
      }
    }
    if (op === "record.get") {
      const r = args[0];
      const f = args[1];
      if (r.kind !== "Record" || f.kind !== "Str") throw new Error("record.get expects Record and Str");
      const val = r.fields[f.value];
      if (val === void 0) throw new Error(`Field ${f.value} not found`);
      return val;
    }
    if (op === "tuple.get") {
      const t = args[0];
      const i = args[1];
      if (t.kind !== "Tuple" || i.kind !== "I64") throw new Error("tuple.get expects Tuple and I64");
      const idx = Number(i.value);
      if (idx < 0 || idx >= t.items.length) throw new Error("Tuple index out of bounds");
      return t.items[idx];
    }
    if (op === "str.concat") return { kind: "Str", value: (args[0]?.value || "") + (args[1]?.value || "") };
    if (op === "str.len") return { kind: "I64", value: BigInt((args[0]?.value || "").length) };
    if (op === "str.get") {
      const s = args[0].value;
      const i = Number(args[1].value);
      if (i >= 0 && i < s.length) return { kind: "Option", value: { kind: "I64", value: BigInt(s.charCodeAt(i)) } };
      return { kind: "Option", value: null };
    }
    if (op === "str.substring") return { kind: "Str", value: args[0].value.substring(Number(args[1].value), Number(args[2].value)) };
    if (op === "str.from_code") return { kind: "Str", value: String.fromCharCode(Number(args[0].value)) };
    if (op === "str.index_of") {
      const s = args[0].value;
      const sub = args[1].value;
      const idx = s.indexOf(sub);
      if (idx === -1) return { kind: "Option", value: null };
      return { kind: "Option", value: { kind: "I64", value: BigInt(idx) } };
    }
    if (op === "str.contains") return { kind: "Bool", value: args[0].value.includes(args[1].value) };
    if (op === "str.ends_with") return { kind: "Bool", value: args[0].value.endsWith(args[1].value) };
    if (op.startsWith("net.") || op === "sys.sleep") {
      throw new Error(`Cannot call async intrinsic ${op} from synchronous evaluation path`);
    }
    if (op === "sys.args") {
      const argsList = ctx.args.map((a) => ({ kind: "Str", value: a }));
      return { kind: "List", items: argsList };
    }
    throw new Error(`Unknown intrinsic or not implemented in Sync path: ${op} `);
  }

  // src/eval/interpreter.ts
  var Interpreter = class _Interpreter {
    constructor(program, fs = {}, resolver, net, tools, cache, args = []) {
      this.program = program;
      this.resolver = resolver;
      this.functions = /* @__PURE__ */ new Map();
      this.constants = /* @__PURE__ */ new Map();
      this.args = [];
      this.interpreterCache = /* @__PURE__ */ new Map();
      this.args = args;
      if (cache) this.interpreterCache = cache;
      this.interpreterCache.set(this.program.module.name, this);
      if (typeof fs.readFile === "function") {
        this.fs = fs;
      } else {
        this.fs = new MockFileSystem(fs);
      }
      this.net = net || new MockNetwork();
      this.tools = tools;
      this.pid = ProcessManager.instance.getNextPid();
      ProcessManager.instance.register(this.pid);
      for (const def of program.defs) {
        if (def.kind === "DefFn" || def.kind === "DefTool") {
          this.functions.set(def.name, def);
        }
      }
    }
    createInterpreter(program) {
      return new _Interpreter(program, this.fs, this.resolver, this.net, this.tools, this.interpreterCache, this.args);
    }
    getInterpreter(path) {
      return this.interpreterCache.get(path);
    }
    spawn(fnName) {
      const child = new _Interpreter(this.program, this.fs, this.resolver, this.net, this.tools, void 0, this.args);
      const childPid = child.pid;
      Promise.resolve().then(async () => {
        try {
          await child.callFunction(fnName, []);
        } catch (e) {
          console.error(`Process ${childPid} crashed: `, e);
        }
      });
      return childPid;
    }
    async evalMain() {
      const main = this.functions.get("main");
      if (!main) throw new Error("No main function defined");
      if (main.kind !== "DefFn") throw new Error("Main must be a function");
      if (main.eff === "!Pure" || main.eff === "!IO") {
        this.initConstantsSync();
        return evalExprSync(this, main.body, void 0);
      }
      await this.initConstants();
      return evalExpr(this, main.body, void 0);
    }
    async callFunction(name, args) {
      await this.initConstants();
      const func = this.functions.get(name);
      if (!func) throw new Error(`Unknown function: ${name}`);
      if (func.kind === "DefTool") {
        if (!this.tools) throw new Error(`Tool not implemented: ${name}`);
        return this.tools.callTool(name, args);
      }
      if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);
      let env = void 0;
      for (let i = 0; i < args.length; i++) {
        env = { name: func.args[i].name, value: args[i], parent: env };
      }
      return evalExpr(this, func.body, env);
    }
    callFunctionSync(name, args) {
      this.initConstantsSync();
      const func = this.functions.get(name);
      if (!func) throw new Error(`Unknown function: ${name}`);
      if (func.kind === "DefTool") {
        if (!this.tools?.callToolSync) throw new Error(`Tool not implemented: ${name}`);
        return this.tools.callToolSync(name, args);
      }
      if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);
      let env = void 0;
      for (let i = 0; i < args.length; i++) {
        env = { name: func.args[i].name, value: args[i], parent: env };
      }
      return evalExprSync(this, func.body, env);
    }
    async initConstants() {
      if (this.constants.size > 0) return;
      for (const def of this.program.defs) {
        if (def.kind === "DefConst") {
          this.constants.set(def.name, await evalExpr(this, def.value, void 0));
        }
      }
    }
    initConstantsSync() {
      if (this.constants.size > 0) return;
      for (const def of this.program.defs) {
        if (def.kind === "DefConst") {
          this.constants.set(def.name, evalExprSync(this, def.value, void 0));
        }
      }
    }
  };

  // src/main.ts
  function check(source, modules = {}, debug = false) {
    const parser = new Parser(source, debug);
    let program;
    try {
      program = parser.parse();
    } catch (e) {
      return { success: false, error: `ParseError: ${e.message}` };
    }
    try {
      const visited = /* @__PURE__ */ new Set();
      const recursionStack = /* @__PURE__ */ new Set();
      const dfs = (path) => {
        if (recursionStack.has(path)) {
          const stack = Array.from(recursionStack);
          const idx = stack.indexOf(path);
          const cycle = stack.slice(idx).concat(path).join(" -> ");
          throw new Error(`Circular import detected: ${cycle}`);
        }
        if (visited.has(path)) return;
        visited.add(path);
        recursionStack.add(path);
        const src = modules[path];
        if (src) {
          try {
            const p = new Parser(src, debug);
            const pr = p.parse();
            for (const i of pr.imports) {
              dfs(i.path);
            }
          } catch (e) {
            throw new Error(`In module '${path}': ${e.message}`);
          }
        }
        recursionStack.delete(path);
      };
      for (const i of program.imports) {
        dfs(i.path);
      }
    } catch (e) {
      return { success: false, error: `RuntimeError: ${e.message}` };
    }
    const cache = /* @__PURE__ */ new Map();
    const resolver = (path) => {
      if (cache.has(path)) return cache.get(path);
      const modSource = modules[path];
      if (!modSource) return void 0;
      try {
        const p = new Parser(modSource, debug);
        const pr = p.parse();
        cache.set(path, pr);
        return pr;
      } catch (e) {
        console.error(`Failed to parse module ${path}:`, e);
        return void 0;
      }
    };
    const checker = new TypeChecker(resolver);
    try {
      checker.check(program);
    } catch (e) {
      if (e.message.startsWith("TypeError:")) {
        return { success: false, error: e.message };
      }
      return { success: false, error: `TypeError: ${e.message}` };
    }
    return { success: true, program, resolver };
  }
  async function run(source, fsMap = {}, modules = {}, net, args = [], debug = false, tools) {
    ProcessManager.instance.reset();
    const checked = check(source, modules, debug);
    if (!checked.success) return checked.error;
    const interpreter = new Interpreter(checked.program, fsMap, checked.resolver, net, tools, void 0, args);
    let result;
    try {
      result = await interpreter.evalMain();
    } catch (e) {
      return `RuntimeError: ${e.message}`;
    }
    return printValue(result);
  }

  // src/runtime/tool-host.ts
  function valueToJs(v) {
    switch (v.kind) {
      case "I64":
        return v.value;
      case "Bool":
        return v.value;
      case "Str":
        return v.value;
      case "Option":
        return v.value === null ? null : valueToJs(v.value);
      case "Result":
        return v.isOk ? { ok: valueToJs(v.value) } : { err: valueToJs(v.value) };
      case "List":
        return v.items.map(valueToJs);
      case "Tuple":
        return v.items.map(valueToJs);
      case "Record": {
        const obj = {};
        for (const [k, val] of Object.entries(v.fields)) obj[k] = valueToJs(val);
        return obj;
      }
      case "Tagged":
        return { tag: v.tag, value: valueToJs(v.value) };
      case "Map":
        return {};
      case "Lambda":
        return null;
    }
    return null;
  }
  function jsToValue(v) {
    if (v && typeof v === "object" && typeof v.kind === "string") return v;
    if (typeof v === "bigint") return { kind: "I64", value: v };
    if (typeof v === "number") return { kind: "I64", value: BigInt(v) };
    if (typeof v === "string") return { kind: "Str", value: v };
    if (typeof v === "boolean") return { kind: "Bool", value: v };
    if (v === null || v === void 0) return { kind: "Option", value: null };
    if (Array.isArray(v)) return { kind: "List", items: v.map(jsToValue) };
    if (typeof v === "object") {
      const fields = {};
      for (const [k, val] of Object.entries(v)) fields[k] = jsToValue(val);
      return { kind: "Record", fields };
    }
    return { kind: "Str", value: String(v) };
  }

  // src/platform/browser.ts
  var BrowserFileSystem = class {
    constructor() {
      this.files = /* @__PURE__ */ new Map();
    }
    readFile(path) {
      if (!this.files.has(path)) {
        return null;
      }
      return this.files.get(path) || "";
    }
    writeFile(path, content) {
      this.files.set(path, content);
      return true;
    }
    exists(path) {
      return this.files.has(path);
    }
    readDir(path) {
      const results = [];
      for (const key of this.files.keys()) {
        if (key.startsWith(path)) {
          results.push(key);
        }
      }
      return results;
    }
  };
  var BrowserNetwork = class {
    async listen(port) {
      console.log(`[BrowserNet] Mock listening on port ${port}`);
      return 1;
    }
    async accept(serverHandle) {
      console.log(`[BrowserNet] Waiting for connection... (Mock: Returning immediately)`);
      await new Promise((resolve2) => setTimeout(resolve2, 1e3));
      return 2;
    }
    async read(handle) {
      return "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
    }
    async write(handle, data) {
      console.log(`[BrowserNet] Writing to ${handle}:`);
      console.log(data);
      return true;
    }
    async connect(host, port) {
      console.warn("net.connect not supported in browser");
      return null;
    }
    async close(handle) {
      console.log(`[BrowserNet] Closed handle ${handle}`);
      return true;
    }
  };
  var BrowserToolHost = class {
    constructor(tools = {}) {
      this.tools = tools;
    }
    async callTool(name, args) {
      const fn = this.tools[name];
      if (!fn) throw new Error(`Tool not found: ${name}`);
      const result = await fn(...args.map(valueToJs));
      return jsToValue(result);
    }
    callToolSync(name, args) {
      const fn = this.tools[name];
      if (!fn) throw new Error(`Tool not found: ${name}`);
      const result = fn(...args.map(valueToJs));
      return jsToValue(result);
    }
  };

  // src/web-entry.ts
  function resolveToolHost(tools) {
    if (tools) {
      if (typeof tools.callTool === "function") return tools;
      return new BrowserToolHost(tools);
    }
    if (typeof window === "undefined") return void 0;
    const globalHost = window.irisToolHost;
    if (globalHost && typeof globalHost.callTool === "function") return globalHost;
    const registry = window.irisTools;
    if (registry && typeof registry === "object") return new BrowserToolHost(registry);
    return void 0;
  }
  async function runIris(source, tools) {
    const outputBuffer = [];
    const originalLog = console.log;
    console.log = (...args) => {
      outputBuffer.push(args.map((a) => String(a)).join(" "));
      originalLog(...args);
    };
    try {
      const fs = new BrowserFileSystem();
      const net = new BrowserNetwork();
      const toolHost = resolveToolHost(tools);
      const resultVal = await run(source, fs, {}, net, [], false, toolHost);
      if (resultVal.startsWith("RuntimeError:") || resultVal.startsWith("TypeError:") || resultVal.startsWith("ParseError:")) {
        outputBuffer.push(resultVal);
      } else {
        outputBuffer.push(`=> ${resultVal}`);
      }
      return outputBuffer.join("\n");
    } catch (e) {
      return `Unexpected Error: ${e.message}`;
    } finally {
      console.log = originalLog;
    }
  }
  if (typeof window !== "undefined") {
    window.runIris = runIris;
  }
  return __toCommonJS(web_entry_exports);
})();
//# sourceMappingURL=iris.js.map
