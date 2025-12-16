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

  // src/sexp.ts
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
  var Parser = class {
    constructor(input) {
      this.pos = 0;
      this.tokens = tokenize(input);
    }
    parse() {
      this.expect("LParen");
      this.expectSymbol("program");
      let moduleDecl = { name: "unknown", version: 0 };
      const imports = [];
      const defs = [];
      while (!this.check("RParen")) {
        this.expect("LParen");
        const section = this.expectSymbol();
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
        } else if (section === "imports") {
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
        } else if (section === "defs") {
          while (!this.check("RParen")) {
            defs.push(this.parseDefinition());
          }
          this.expect("RParen");
        } else {
          throw new Error(`Unknown program section: ${section}`);
        }
      }
      this.expect("RParen");
      return { module: moduleDecl, imports, defs };
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
        const type = this.parseType();
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("value");
        const value = this.parseExpr();
        this.expect("RParen");
        this.expect("RParen");
        return { kind: "DefConst", name, type, value };
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
          const argType = this.parseType();
          this.expect("RParen");
          args.push({ name: argName, type: argType });
        }
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("ret");
        const ret = this.parseType();
        this.expect("RParen");
        this.expect("LParen");
        this.expectSymbol("eff");
        const eff = this.expectEffect();
        this.expect("RParen");
        while (this.check("LParen")) {
          const save = this.pos;
          this.expect("LParen");
          const tag = this.peek();
          if (tag.kind === "Symbol" && tag.value === "body") {
            this.pos = save;
            break;
          }
          this.pos = save;
          this.skipSExp();
        }
        this.expect("LParen");
        this.expectSymbol("body");
        const body = this.parseExpr();
        this.expect("RParen");
        this.expect("RParen");
        return { kind: "DefFn", name, args, ret, eff, body };
      } else {
        throw new Error(`Unknown definition kind: ${kind}`);
      }
    }
    parseExpr() {
      const token = this.peek();
      if (token.kind === "Int") {
        this.consume();
        return { kind: "Literal", value: { kind: "I64", value: token.value } };
      }
      if (token.kind === "Bool") {
        this.consume();
        return { kind: "Literal", value: { kind: "Bool", value: token.value } };
      }
      if (token.kind === "Str") {
        this.consume();
        return { kind: "Literal", value: { kind: "Str", value: token.value } };
      }
      if (token.kind === "Symbol") {
        if (token.value === "None") {
          this.consume();
          return { kind: "Literal", value: { kind: "Option", value: null } };
        }
        if (token.value === "nil") {
          this.consume();
          return { kind: "Literal", value: { kind: "List", items: [] } };
        }
        this.consume();
        return { kind: "Var", name: token.value };
      }
      if (token.kind === "LParen") {
        this.consume();
        const head = this.peek();
        if (head.kind === "Symbol") {
          const op = head.value;
          this.consume();
          if (op === "let") {
            this.expect("LParen");
            const name = this.expectSymbol();
            const val = this.parseExpr();
            this.expect("RParen");
            const body = this.parseExpr();
            this.expect("RParen");
            return { kind: "Let", name, value: val, body };
          }
          if (op === "record") {
            const fields = {};
            while (!this.check("RParen")) {
              this.expect("LParen");
              const key = this.expectSymbol();
              const val = this.parseExpr();
              this.expect("RParen");
              fields[key] = val;
            }
            this.expect("RParen");
            return { kind: "Record", fields };
          }
          if (op === "if") {
            const cond = this.parseExpr();
            const thenBr = this.parseExpr();
            const elseBr = this.parseExpr();
            this.expect("RParen");
            return { kind: "If", cond, then: thenBr, else: elseBr };
          }
          if (op === "match") {
            const target = this.parseExpr();
            const cases = [];
            while (!this.check("RParen")) {
              this.expect("LParen");
              this.expectSymbol("case");
              this.expect("LParen");
              this.expectSymbol("tag");
              const tag = this.expectString();
              const vars = [];
              if (this.check("LParen")) {
                this.expect("LParen");
                while (!this.check("RParen")) {
                  vars.push(this.expectSymbol());
                }
                this.expect("RParen");
              }
              this.expect("RParen");
              const body = this.parseExpr();
              this.expect("RParen");
              cases.push({ tag, vars, body });
            }
            this.expect("RParen");
            return { kind: "Match", target, cases };
          }
          if (op === "call") {
            const fn = this.expectSymbol();
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Call", fn, args };
          }
          if (["+", "-", "*", "/", "<=", "<", "=", "Some", "Ok", "Err", "cons", "io.print", "io.read_file", "io.write_file"].includes(op)) {
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Intrinsic", op, args };
          }
          if (op.startsWith("io.")) {
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Intrinsic", op, args };
          }
          if (op.startsWith("net.")) {
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Intrinsic", op, args };
          }
          if (op.startsWith("http.")) {
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Intrinsic", op, args };
          }
          if (op.startsWith("str.")) {
            const args = [];
            while (!this.check("RParen")) {
              args.push(this.parseExpr());
            }
            this.expect("RParen");
            return { kind: "Intrinsic", op, args };
          }
          throw new Error(`Unknown operator or special form: ${op}`);
        }
        throw new Error("Expected symbol after '('");
      }
      throw new Error(`Unexpected token for expression: ${token.kind}`);
    }
    parseType() {
      const token = this.peek();
      if (token.kind === "Symbol") {
        const w = token.value;
        this.consume();
        if (w === "I64") return { type: "I64" };
        if (w === "Bool") return { type: "Bool" };
        if (w === "Str") return { type: "Str" };
      }
      if (token.kind === "LParen") {
        this.consume();
        const head = this.peek();
        if (head.kind !== "Symbol") throw new Error("Expected type constructor");
        const tMap = head.value;
        this.consume();
        if (tMap === "Option") {
          const inner = this.parseType();
          this.expect("RParen");
          return { type: "Option", inner };
        }
        if (tMap === "Result") {
          const ok = this.parseType();
          const err = this.parseType();
          this.expect("RParen");
          return { type: "Result", ok, err };
        }
        if (tMap === "List") {
          const inner = this.parseType();
          this.expect("RParen");
          return { type: "List", inner };
        }
        if (tMap === "Record") {
          const fields = {};
          while (!this.check("RParen")) {
            this.expect("LParen");
            const name = this.expectSymbol();
            const type = this.parseType();
            this.expect("RParen");
            fields[name] = type;
          }
          this.expect("RParen");
          return { type: "Record", fields };
        }
        this.expect("RParen");
        throw new Error(`Unknown type constructor: ${tMap}`);
      }
      throw new Error(`Unexpected token in type`);
    }
    expectEffect() {
      const t = this.peek();
      if (t.kind === "Symbol" && t.value.startsWith("!")) {
        this.consume();
        if (["!Pure", "!IO", "!Net", "!Any", "!Infer"].includes(t.value)) {
          return t.value;
        }
        throw new Error(`Unknown effect: ${t.value}`);
      }
      throw new Error("Expected effect starting with !");
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
    peek() {
      if (this.pos >= this.tokens.length) return { kind: "EOF", line: 0, col: 0 };
      return this.tokens[this.pos];
    }
    consume() {
      this.pos++;
    }
    check(kind) {
      return this.peek().kind === kind;
    }
    expect(kind) {
      if (!this.check(kind)) throw new Error(`Expected ${kind} at ${this.peek().line}:${this.peek().col}`);
      this.consume();
    }
    expectSymbol(val) {
      const t = this.peek();
      if (t.kind !== "Symbol" || val && t.value !== val) throw new Error(`Expected Symbol ${val || ""} at ${t.line}:${t.col}`);
      this.consume();
      return t.value;
    }
    expectString() {
      const t = this.peek();
      if (t.kind !== "Str") throw new Error(`Expected String`);
      this.consume();
      return t.value;
    }
    expectInt() {
      const t = this.peek();
      if (t.kind !== "Int") throw new Error(`Expected Int`);
      this.consume();
      return t.value;
    }
  };
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
      case "Record":
        const keys = Object.keys(v.fields).sort();
        if (keys.length === 0) return "(record)";
        const fields = keys.map((k) => `(${k} ${printValue(v.fields[k])})`).join(" ");
        return `(record ${fields})`;
    }
  }

  // src/typecheck.ts
  var TypeChecker = class {
    constructor(resolver) {
      this.resolver = resolver;
      this.functions = /* @__PURE__ */ new Map();
      this.constants = /* @__PURE__ */ new Map();
    }
    check(program) {
      this.currentProgram = program;
      for (const def of program.defs) {
        if (def.kind === "DefConst") {
          this.constants.set(def.name, def.type);
        } else if (def.kind === "DefFn") {
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
        }
      }
      for (const def of program.defs) {
        if (def.kind === "DefConst") {
          const { type, eff } = this.checkExprFull(def.value, /* @__PURE__ */ new Map());
          this.expectType(def.type, type, `Constant ${def.name} type mismatch`);
          this.checkEffectSubtype(eff, "!Pure", `Constant ${def.name} must be Pure`);
        } else if (def.kind === "DefFn") {
          const fnType = this.functions.get(def.name);
          const env = /* @__PURE__ */ new Map();
          for (let i = 0; i < def.args.length; i++) {
            env.set(def.args[i].name, def.args[i].type);
          }
          const { type: bodyType, eff: bodyEff } = this.checkExprFull(def.body, env);
          this.expectType(def.ret, bodyType, `Function ${def.name} return type mismatch`);
          if (def.eff === "!Infer") {
            this.functions.set(def.name, { ...fnType, eff: bodyEff });
          } else {
            this.checkEffectSubtype(bodyEff, def.eff, `Function ${def.name}`);
          }
        }
      }
    }
    // Returns Type AND Inferred Effect
    checkExprFull(expr, env) {
      switch (expr.kind) {
        case "Literal": {
          const val = expr.value;
          if (val.kind === "I64") return { type: { type: "I64" }, eff: "!Pure" };
          if (val.kind === "Bool") return { type: { type: "Bool" }, eff: "!Pure" };
          if (val.kind === "Str") return { type: { type: "Str" }, eff: "!Pure" };
          if (val.kind === "Option") {
            if (val.value === null) return { type: { type: "Option", inner: { type: "I64" } }, eff: "!Pure" };
            const inner = this.checkExprFull({ kind: "Literal", value: val.value }, env);
            return { type: { type: "Option", inner: inner.type }, eff: inner.eff };
          }
          if (val.kind === "Result") {
            const v = this.checkExprFull({ kind: "Literal", value: val.value }, env);
            return { type: { type: "Result", ok: val.isOk ? v.type : { type: "Str" }, err: val.isOk ? { type: "Str" } : v.type }, eff: v.eff };
          }
          if (val.kind === "List") return { type: { type: "List", inner: { type: "I64" } }, eff: "!Pure" };
          if (val.kind === "Tuple") return { type: { type: "Tuple", items: [] }, eff: "!Pure" };
          if (val.kind === "Record") return { type: { type: "Record", fields: {} }, eff: "!Pure" };
          throw new Error(`Unknown literal kind: ${val.kind}`);
        }
        case "Var": {
          if (env.has(expr.name)) return { type: env.get(expr.name), eff: "!Pure" };
          if (this.constants.has(expr.name)) return { type: this.constants.get(expr.name), eff: "!Pure" };
          if (expr.name.includes(".")) {
            const parts = expr.name.split(".");
            let currentType = env.get(parts[0]) || this.constants.get(parts[0]);
            if (currentType) {
              for (let i = 1; i < parts.length; i++) {
                if (currentType.type !== "Record") throw new Error(`TypeError: Cannot access field ${parts[i]} of non-record ${parts.slice(0, i).join(".")}`);
                const fields = currentType.fields;
                const fieldType = fields[parts[i]];
                if (!fieldType) throw new Error(`TypeError: Unknown field ${parts[i]} in record`);
                currentType = fieldType;
              }
              return { type: currentType, eff: "!Pure" };
            }
          }
          throw new Error(`TypeError: Unknown variable: ${expr.name}`);
        }
        case "Let": {
          const val = this.checkExprFull(expr.value, env);
          const newEnv = new Map(env).set(expr.name, val.type);
          const body = this.checkExprFull(expr.body, newEnv);
          return { type: body.type, eff: this.joinEffects(val.eff, body.eff) };
        }
        case "If": {
          const cond = this.checkExprFull(expr.cond, env);
          if (cond.type.type !== "Bool") throw new Error(`TypeError: Type Error in If condition: Expected Bool, got ${this.fmt(cond.type)}`);
          const t = this.checkExprFull(expr.then, env);
          const e = this.checkExprFull(expr.else, env);
          this.expectType(t.type, e.type, "If branches mismatch");
          return { type: t.type, eff: this.joinEffects(cond.eff, this.joinEffects(t.eff, e.eff)) };
        }
        case "Match": {
          const target = this.checkExprFull(expr.target, env);
          let retType = null;
          let joinedEff = target.eff;
          const targetType = target.type;
          if (targetType.type === "Option") {
            for (const c of expr.cases) {
              const newEnv = new Map(env);
              if (c.tag === "Some") {
                if (c.vars.length !== 1) throw new Error("Some case expects 1 variable");
                if (!targetType.inner) throw new Error("Internal error: Option type missing inner type");
                newEnv.set(c.vars[0], targetType.inner);
              } else if (c.tag === "None") {
                if (c.vars.length !== 0) throw new Error("None case expects 0 variables");
              } else throw new Error(`Unknown option match tag: ${c.tag}`);
              const body = this.checkExprFull(c.body, newEnv);
              if (retType) this.expectType(retType, body.type, "Match arms mismatch");
              else retType = body.type;
              joinedEff = this.joinEffects(joinedEff, body.eff);
            }
          } else if (targetType.type === "Result") {
            for (const c of expr.cases) {
              const newEnv = new Map(env);
              if (c.tag === "Ok") {
                if (c.vars.length !== 1) throw new Error("Ok case expects 1 variable");
                if (!targetType.ok) throw new Error("Internal error: Result type missing ok type");
                newEnv.set(c.vars[0], targetType.ok);
              } else if (c.tag === "Err") {
                if (c.vars.length !== 1) throw new Error("Err case expects 1 variable");
                if (!targetType.err) throw new Error("Internal error: Result type missing err type");
                newEnv.set(c.vars[0], targetType.err);
              } else throw new Error(`Unknown result match tag: ${c.tag}`);
              const body = this.checkExprFull(c.body, newEnv);
              if (retType) this.expectType(retType, body.type, "Match arms mismatch");
              else retType = body.type;
              joinedEff = this.joinEffects(joinedEff, body.eff);
            }
          } else if (targetType.type === "List") {
            for (const c of expr.cases) {
              const newEnv = new Map(env);
              if (c.tag === "nil") {
                if (c.vars.length !== 0) throw new Error("nil case expects 0 variables");
              } else if (c.tag === "cons") {
                if (c.vars.length !== 2) throw new Error("cons case expects 2 variables (head tail)");
                if (!targetType.inner) throw new Error("Internal List missing inner");
                newEnv.set(c.vars[0], targetType.inner);
                newEnv.set(c.vars[1], targetType);
              } else throw new Error(`Unknown list match tag: ${c.tag}`);
              const body = this.checkExprFull(c.body, newEnv);
              if (retType) this.expectType(retType, body.type, "Match arms mismatch");
              else retType = body.type;
              joinedEff = this.joinEffects(joinedEff, body.eff);
            }
          } else {
            throw new Error(`Match target must be Option, Result, or List (got ${targetType.type})`);
          }
          return { type: retType, eff: joinedEff };
        }
        case "Call": {
          let func = this.functions.get(expr.fn);
          if (!func && expr.fn.includes(".")) {
            const [alias, fname] = expr.fn.split(".");
            const importDecl = this.currentProgram?.imports.find((i) => i.alias === alias);
            if (importDecl && this.resolver) {
              const importedProg = this.resolver(importDecl.path);
              if (importedProg) {
                const targetDef = importedProg.defs.find((d) => d.kind === "DefFn" && d.name === fname);
                if (targetDef) {
                  func = {
                    args: targetDef.args.map((a) => a.type),
                    // re-parse type if needed, but it's AST
                    ret: targetDef.ret,
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
            const arg = this.checkExprFull(expr.args[i], env);
            this.expectType(func.args[i], arg.type, `Argument ${i} mismatch`);
            eff = this.joinEffects(eff, arg.eff);
          }
          const callEff = func.eff === "!Infer" ? "!Any" : func.eff;
          return { type: func.ret, eff: this.joinEffects(eff, callEff) };
        }
        case "Record": {
          const fields = {};
          let eff = "!Pure";
          for (const [key, valExpr] of Object.entries(expr.fields)) {
            const res = this.checkExprFull(valExpr, env);
            fields[key] = res.type;
            eff = this.joinEffects(eff, res.eff);
          }
          return { type: { type: "Record", fields }, eff };
        }
        case "Intrinsic": {
          let joinedEff = "!Pure";
          const argTypes = [];
          for (const arg of expr.args) {
            const res = this.checkExprFull(arg, env);
            argTypes.push(res.type);
            joinedEff = this.joinEffects(joinedEff, res.eff);
          }
          if (["+", "-", "*", "/", "<", "<=", "=", ">=", ">"].includes(expr.op)) {
            for (let i = 0; i < argTypes.length; i++) {
              if (argTypes[i].type !== "I64") {
                if (["+", "-", "*", "/"].includes(expr.op)) {
                  throw new Error(`TypeError: Type Error in ${expr.op} operand ${i + 1}: Expected I64, got ${argTypes[i].type}`);
                }
              }
            }
            return { type: ["<=", "<", "=", ">=", ">"].includes(expr.op) ? { type: "Bool" } : { type: "I64" }, eff: joinedEff };
          }
          if (expr.op === "Some") return { type: { type: "Option", inner: argTypes[0] }, eff: joinedEff };
          if (expr.op === "Ok") return { type: { type: "Result", ok: argTypes[0], err: { type: "Str" } }, eff: joinedEff };
          if (expr.op === "Err") return { type: { type: "Result", ok: { type: "I64" }, err: argTypes[0] }, eff: joinedEff };
          if (expr.op === "cons") return { type: { type: "List", inner: argTypes[0] }, eff: joinedEff };
          if (expr.op.startsWith("io.")) {
            joinedEff = this.joinEffects(joinedEff, "!IO");
            if (expr.op === "io.read_file") return { type: { type: "Result", ok: { type: "Str" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "io.write_file") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "io.file_exists") return { type: { type: "Bool" }, eff: joinedEff };
            if (expr.op === "io.read_dir") return { type: { type: "Result", ok: { type: "List", inner: { type: "Str" } }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "io.print") return { type: { type: "I64" }, eff: joinedEff };
          }
          if (expr.op.startsWith("net.")) {
            joinedEff = this.joinEffects(joinedEff, "!Net");
            if (expr.op === "net.listen") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "net.accept") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "net.read") return { type: { type: "Result", ok: { type: "Str" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "net.write") return { type: { type: "Result", ok: { type: "I64" }, err: { type: "Str" } }, eff: joinedEff };
            if (expr.op === "net.close") return { type: { type: "Result", ok: { type: "Bool" }, err: { type: "Str" } }, eff: joinedEff };
          }
          if (expr.op.startsWith("str.")) {
            if (expr.op === "str.concat") return { type: { type: "Str" }, eff: joinedEff };
            if (expr.op === "str.contains" || expr.op === "str.ends_with") return { type: { type: "Bool" }, eff: joinedEff };
          }
          if (expr.op === "http.parse_request") {
            joinedEff = this.joinEffects(joinedEff, "!Pure");
            const headerType = {
              type: "Record",
              fields: { key: { type: "Str" }, val: { type: "Str" } }
            };
            const httpReqType = {
              type: "Record",
              fields: {
                method: { type: "Str" },
                path: { type: "Str" },
                headers: { type: "List", inner: headerType },
                body: { type: "Str" }
              }
            };
            return {
              type: { type: "Result", ok: httpReqType, err: { type: "Str" } },
              eff: joinedEff
            };
          }
          throw new Error(`Unknown intrinsic: ${expr.op}`);
        }
        default:
          throw new Error(`Unimplemented check for ${expr.kind}`);
      }
    }
    checkExpr(expr, env) {
      return this.checkExprFull(expr, env).type;
    }
    expectType(expected, actual, message) {
      if (!this.typesEqual(expected, actual)) {
        throw new Error(`TypeError: ${message}: Expected ${this.fmt(expected)}, got ${this.fmt(actual)}`);
      }
    }
    effectOrder(eff) {
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
    joinEffects(e1, e2) {
      if (e1 === "!Infer" || e2 === "!Infer") return "!Pure";
      if (e1 === "!Any" || e2 === "!Any") return "!Any";
      if (e1 === "!Net" || e2 === "!Net") return "!Net";
      if (e1 === "!IO" || e2 === "!IO") return "!IO";
      return "!Pure";
    }
    checkEffectSubtype(required, declared, message) {
      if (declared === "!Infer") return;
      if (declared === "!Any") return;
      const ordReq = this.effectOrder(required);
      const ordDecl = this.effectOrder(declared);
      if (ordReq > ordDecl) {
        throw new Error(`TypeError: EffectMismatch: ${message}: Inferred ${required} but declared ${declared}`);
      }
    }
    typesEqual(t1, t2) {
      if (t1.type !== t2.type) return false;
      if (t1.type === "Option") {
        if (!t1.inner || !t2.inner) return false;
        return this.typesEqual(t1.inner, t2.inner);
      }
      if (t1.type === "Result") {
        if (!t1.ok || !t1.err || !t2.ok || !t2.err) return false;
        return this.typesEqual(t1.ok, t2.ok) && this.typesEqual(t1.err, t2.err);
      }
      if (t1.type === "Record") {
        const f1 = t1.fields;
        const f2 = t2.fields;
        const k1 = Object.keys(f1).sort();
        const k2 = Object.keys(f2).sort();
        if (k1.length !== k2.length) return false;
        for (let i = 0; i < k1.length; i++) {
          if (k1[i] !== k2[i]) return false;
          if (!this.typesEqual(f1[k1[i]], f2[k1[i]])) return false;
        }
        return true;
      }
      if (t1.type === "List") {
        return this.typesEqual(t1.inner, t2.inner);
      }
      return true;
    }
    fmt(t) {
      switch (t.type) {
        case "I64":
          return "I64";
        case "Bool":
          return "Bool";
        case "Str":
          return "Str";
        case "Option":
          return `(Option ${this.fmt(t.inner)})`;
        case "Result":
          return `(Result ${this.fmt(t.ok)} ${this.fmt(t.err)})`;
        case "List":
          return `(List ${this.fmt(t.inner)})`;
        case "Record":
          return `(Record ${Object.keys(t.fields).map((k) => `(${k} ${this.fmt(t.fields[k])})`).join(" ")})`;
        default:
          return "Unknown";
      }
    }
  };

  // src/eval.ts
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
  };
  var Interpreter = class _Interpreter {
    constructor(program, fs = {}, resolver, net) {
      this.resolver = resolver;
      this.functions = /* @__PURE__ */ new Map();
      this.constants = /* @__PURE__ */ new Map();
      this.program = program;
      if (typeof fs.readFile === "function") {
        this.fs = fs;
      } else {
        this.fs = new MockFileSystem(fs);
      }
      this.net = net || new MockNetwork();
      for (const def of program.defs) {
        if (def.kind === "DefFn") {
          this.functions.set(def.name, def);
        }
      }
    }
    async evalMain() {
      await this.initConstants();
      const main = this.functions.get("main");
      if (!main) throw new Error("No main function defined");
      return this.evalExpr(main.body, /* @__PURE__ */ new Map());
    }
    // Public method to call a specific function with values
    async callFunction(name, args) {
      await this.initConstants();
      const func = this.functions.get(name);
      if (!func) throw new Error(`Unknown function: ${name}`);
      if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);
      const newEnv = /* @__PURE__ */ new Map();
      for (let i = 0; i < args.length; i++) {
        newEnv.set(func.args[i].name, args[i]);
      }
      return this.evalExpr(func.body, newEnv);
    }
    async initConstants() {
      if (this.constants.size > 0) return;
      for (const def of this.program.defs) {
        if (def.kind === "DefConst") {
          this.constants.set(def.name, await this.evalExpr(def.value, /* @__PURE__ */ new Map()));
        }
      }
    }
    async evalExpr(expr, env) {
      switch (expr.kind) {
        case "Literal":
          return expr.value;
        case "Var": {
          const v = env.get(expr.name);
          if (v !== void 0) return v;
          const c = this.constants.get(expr.name);
          if (c !== void 0) return c;
          if (expr.name.includes(".")) {
            const parts = expr.name.split(".");
            let currentVal = env.get(parts[0]) || this.constants.get(parts[0]);
            if (currentVal) {
              for (let i = 1; i < parts.length; i++) {
                if (currentVal.kind !== "Record") throw new Error(`Runtime: Cannot access field ${parts[i]} of non-record`);
                const fieldVal = currentVal.fields[parts[i]];
                if (!fieldVal) throw new Error(`Runtime: Unknown field ${parts[i]}`);
                currentVal = fieldVal;
              }
              return currentVal;
            }
          }
          throw new Error(`Runtime Unknown variable: ${expr.name}`);
        }
        case "Let": {
          const val = await this.evalExpr(expr.value, env);
          const newEnv = new Map(env);
          newEnv.set(expr.name, val);
          return this.evalExpr(expr.body, newEnv);
        }
        case "If": {
          const cond = await this.evalExpr(expr.cond, env);
          if (cond.kind !== "Bool") throw new Error("If condition must be Bool");
          if (cond.value) {
            return this.evalExpr(expr.then, env);
          } else {
            return this.evalExpr(expr.else, env);
          }
        }
        case "Call": {
          let func = this.functions.get(expr.fn);
          if (!func && expr.fn.includes(".")) {
            const [alias, fname] = expr.fn.split(".");
            const importDecl = this.program.imports.find((i) => i.alias === alias);
            if (importDecl && this.resolver) {
              const importedProg = this.resolver(importDecl.path);
              if (importedProg) {
                const targetDef = importedProg.defs.find((d) => d.kind === "DefFn" && d.name === fname);
                if (targetDef) {
                  func = targetDef;
                }
              }
            }
          }
          if (!func) throw new Error(`Unknown function: ${expr.fn}`);
          const args = [];
          for (const arg of expr.args) {
            args.push(await this.evalExpr(arg, env));
          }
          if (expr.fn.includes(".")) {
            const [alias, fname] = expr.fn.split(".");
            const importDecl = this.program.imports.find((i) => i.alias === alias);
            if (importDecl && this.resolver) {
              const importedProg = this.resolver(importDecl.path);
              const subInterp = new _Interpreter(importedProg, this.fs, this.resolver, this.net);
              return subInterp.callFunction(fname, args);
            }
          }
          if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);
          const newEnv = /* @__PURE__ */ new Map();
          for (let i = 0; i < args.length; i++) {
            newEnv.set(func.args[i].name, args[i]);
          }
          return this.evalExpr(func.body, newEnv);
        }
        case "Match": {
          const target = await this.evalExpr(expr.target, env);
          for (const c of expr.cases) {
            let match = false;
            let newBindings = new Map(env);
            if (target.kind === "Option") {
              if (c.tag === "None" && target.value === null) match = true;
              else if (c.tag === "Some" && target.value !== null) {
                match = true;
                if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
              }
            } else if (target.kind === "Result") {
              if (c.tag === "Ok" && target.isOk) {
                match = true;
                if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
              } else if (c.tag === "Err" && !target.isOk) {
                match = true;
                if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
              }
            } else if (target.kind === "List") {
              if (c.tag === "nil" && target.items.length === 0) {
                match = true;
              } else if (c.tag === "cons" && target.items.length > 0) {
                match = true;
                if (c.vars.length >= 1) newBindings.set(c.vars[0], target.items[0]);
                if (c.vars.length >= 2) {
                  newBindings.set(c.vars[1], { kind: "List", items: target.items.slice(1) });
                }
              }
            }
            if (match) {
              return this.evalExpr(c.body, newBindings);
            }
          }
          throw new Error(`No matching case for value ${JSON.stringify(target)}`);
        }
        case "Record": {
          const fields = {};
          for (const [key, valExpr] of Object.entries(expr.fields)) {
            fields[key] = await this.evalExpr(valExpr, env);
          }
          return { kind: "Record", fields };
        }
        case "Intrinsic": {
          const args = [];
          for (const arg of expr.args) {
            args.push(await this.evalExpr(arg, env));
          }
          return this.evalIntrinsic(expr.op, args);
        }
        default:
          throw new Error(`Unimplemented eval for ${expr.kind}`);
      }
    }
    async evalIntrinsic(op, args) {
      if (["+", "-", "*", "/", "<=", "<", "="].includes(op)) {
        const v1 = args[0];
        const v2 = args[1];
        if (v1.kind !== "I64" || v2.kind !== "I64") throw new Error("Math expects I64");
        const a = v1.value;
        const b = v2.value;
        switch (op) {
          case "+":
            return { kind: "I64", value: a + b };
          case "-":
            return { kind: "I64", value: a - b };
          case "*":
            return { kind: "I64", value: a * b };
          case "/": {
            if (b === 0n) throw new Error("Division by zero");
            return { kind: "I64", value: a / b };
          }
          case "<=":
            return { kind: "Bool", value: a <= b };
          case "<":
            return { kind: "Bool", value: a < b };
          case "=":
            return { kind: "Bool", value: a === b };
        }
      }
      if (op === "Some") {
        return { kind: "Option", value: args[0] };
      }
      if (op === "Ok") return { kind: "Result", isOk: true, value: args[0] };
      if (op === "Err") return { kind: "Result", isOk: false, value: args[0] };
      if (op === "io.read_file") {
        const path = args[0];
        if (path.kind !== "Str") throw new Error("path must be string");
        const content = this.fs.readFile(path.value);
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
        this.fs.writeFile(path.value, content.value);
        return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(content.value.length) } };
      }
      if (op === "io.file_exists") {
        const path = args[0];
        if (path.kind !== "Str") throw new Error("path must be string");
        return { kind: "Bool", value: this.fs.exists(path.value) };
      }
      if (op === "io.read_dir") {
        const path = args[0];
        if (path.kind !== "Str") throw new Error("path must be string");
        if (!this.fs.readDir) return { kind: "Result", isOk: false, value: { kind: "Str", value: "Not supported" } };
        const entries = this.fs.readDir(path.value);
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
          console.log(JSON.stringify(val));
        }
        return { kind: "I64", value: 0n };
      }
      if (op.startsWith("net.")) {
        if (op === "net.listen") {
          const port = args[0];
          if (port.kind !== "I64") throw new Error("net.listen expects I64 port");
          const h = await this.net.listen(Number(port.value));
          if (h !== null) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(h) } };
          return { kind: "Result", isOk: false, value: { kind: "Str", value: "Listen failed" } };
        }
        if (op === "net.accept") {
          const serverSock = args[0];
          if (serverSock.kind !== "I64") throw new Error("net.accept expects I64");
          const h = await this.net.accept(Number(serverSock.value));
          if (h !== null) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(h) } };
          return { kind: "Result", isOk: false, value: { kind: "Str", value: "Accept failed" } };
        }
        if (op === "net.read") {
          const sock = args[0];
          if (sock.kind !== "I64") throw new Error("net.read expects I64");
          const s = await this.net.read(Number(sock.value));
          if (s !== null) return { kind: "Result", isOk: true, value: { kind: "Str", value: s } };
          return { kind: "Result", isOk: false, value: { kind: "Str", value: "Read failed" } };
        }
        if (op === "net.write") {
          const sock = args[0];
          const str = args[1];
          if (sock.kind !== "I64") throw new Error("net.write expects I64");
          if (str.kind !== "Str") throw new Error("net.write expects Str");
          const s = await this.net.write(Number(sock.value), str.value);
          if (s) return { kind: "Result", isOk: true, value: { kind: "I64", value: BigInt(s ? 1 : 0) } };
          return { kind: "Result", isOk: false, value: { kind: "Str", value: "Write failed" } };
        }
        if (op === "net.close") {
          const sock = args[0];
          if (sock.kind !== "I64") throw new Error("net.close expects I64");
          const s = await this.net.close(Number(sock.value));
          if (s) return { kind: "Result", isOk: true, value: { kind: "Bool", value: true } };
          return { kind: "Result", isOk: false, value: { kind: "Str", value: "Close failed" } };
        }
      }
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
      if (op === "str.concat") {
        const s1 = args[0];
        const s2 = args[1];
        if (s1.kind !== "Str" || s2.kind !== "Str") throw new Error("str.concat expects two strings");
        return { kind: "Str", value: s1.value + s2.value };
      }
      if (op === "str.contains") {
        const s1 = args[0];
        const s2 = args[1];
        if (s1.kind !== "Str" || s2.kind !== "Str") throw new Error("str.contains expects two strings");
        return { kind: "Bool", value: s1.value.includes(s2.value) };
      }
      if (op === "str.ends_with") {
        const s1 = args[0];
        const s2 = args[1];
        if (s1.kind !== "Str" || s2.kind !== "Str") throw new Error("str.ends_with expects two strings");
        return { kind: "Bool", value: s1.value.endsWith(s2.value) };
      }
      throw new Error(`Unknown intrinsic ${op}`);
    }
  };

  // src/main.ts
  function check(source, modules = {}) {
    const parser = new Parser(source);
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
          const p = new Parser(src);
          const pr = p.parse();
          for (const i of pr.imports) {
            dfs(i.path);
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
        const p = new Parser(modSource);
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
  async function run(source, fsMap = {}, modules = {}, net) {
    const checked = check(source, modules);
    if (!checked.success) return checked.error;
    const interpreter = new Interpreter(checked.program, fsMap, checked.resolver, net);
    let result;
    try {
      result = await interpreter.evalMain();
    } catch (e) {
      return `RuntimeError: ${e.message}`;
    }
    return printValue(result);
  }

  // src/platform/browser.ts
  var BrowserFileSystem = class {
    constructor() {
      this.files = /* @__PURE__ */ new Map();
    }
    readFileSync(path) {
      if (!this.files.has(path)) {
        throw new Error(`File not found: ${path}`);
      }
      return this.files.get(path) || "";
    }
    writeFileSync(path, content) {
      this.files.set(path, content);
    }
    existsSync(path) {
      return this.files.has(path);
    }
    readDirSync(path) {
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
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      return 2;
    }
    async read(handle) {
      return "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
    }
    async write(handle, data) {
      console.log(`[BrowserNet] Writing to ${handle}:`);
      console.log(data);
    }
    async close(handle) {
      console.log(`[BrowserNet] Closed handle ${handle}`);
    }
  };

  // src/web-entry.ts
  async function runIris(source) {
    const outputBuffer = [];
    const originalLog = console.log;
    console.log = (...args) => {
      outputBuffer.push(args.map((a) => String(a)).join(" "));
      originalLog(...args);
    };
    try {
      const fs = new BrowserFileSystem();
      const net = new BrowserNetwork();
      const resultVal = await run(source, fs, {}, net);
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
  window.runIris = runIris;
  return __toCommonJS(web_entry_exports);
})();
//# sourceMappingURL=iris.js.map
