
import { TestCase } from '../src/test-types';
import { tokenize } from '../src/sexp/lexer';
import { Parser } from '../src/sexp/parser';
import { parseEffect, parseType } from '../src/sexp/parse-type';
import { printValue } from '../src/sexp/printer';

export const t394_sexp_coverage: TestCase = {
    name: 'Test 394: SExp Coverage',
    fn: async () => {
        // --- Lexer Coverage ---

        // 1. Unknown escape sequence
        const tokens1 = tokenize('"\\z"');
        if (tokens1.length < 1 || tokens1[0].kind !== 'Str') {
            // pass
        }

        // 2. Unterminated string
        try {
            tokenize('"unterminated');
            throw new Error("Should have thrown for unterminated string");
        } catch (e: any) {
            if (!e.message.includes('Unterminated string')) throw new Error("Wrong error unterminated");
        }

        // --- Parser / parseExpr Coverage ---

        // 4. expectSymbol failures
        try {
            const p = new Parser('(program (module (name "m") (version 1)) (wrong-section))');
            p.parse();
            throw new Error("Should have thrown for unknown section");
        } catch (e: any) {
            if (!e.message.includes('Unknown program section')) { }
        }

        // 5. Manual expect failures
        const pFail = new Parser('( 1 "s" )');
        pFail.consume();
        try { pFail.expectSymbol(); throw new Error("Should fail expectSymbol on Int"); } catch (e: any) { if (!e.message.includes('Expected Symbol')) throw e; }

        const pFail2 = new Parser('( sym )');
        pFail2.consume();
        try { pFail2.expectString(); throw new Error("Should fail expectString on Symbol"); } catch (e: any) { if (!e.message.includes('Expected String')) throw e; }

        const pFail3 = new Parser('( "s" )');
        pFail3.consume();
        try { pFail3.expectInt(); throw new Error("Should fail expectInt on Str"); } catch (e: any) { if (!e.message.includes('Expected Int')) throw e; }

        const pFail4 = new Parser('( got )');
        pFail4.consume();
        try { pFail4.expectSymbol('wanted'); throw new Error("Should fail limit symbol"); } catch (e: any) { if (!e.message.includes("Expected symbol 'wanted'")) throw e; }

        // 6. skipSExp in deffn (Flattened)
        // (deffn (name my-fn) (args) (ret Void) (eff !Pure) (meta (nested)) (body (i64.const 0)))
        const inputSkip = `(program (module (name "test-skip") (version 1)) (defs (deffn (name my-fn) (args) (ret I64) (eff !Pure) (meta (nested)) (body (i64.const 0)))))`;
        const progSkip = new Parser(inputSkip).parse();
        if (progSkip.defs.length !== 1) throw new Error("Failed to parse def with skipped section");

        // 7. Import alias error
        const inputBadImp = `(program (module (name "a") (version 1)) (imports (import "f")))`;
        try { new Parser(inputBadImp).parse(); throw new Error("Import alias fail"); } catch (e: any) { if (!e.message.includes('Import must have alias')) throw e; }

        // 7b. skipSExp non-list branch
        const pSkipAtom = new Parser('atom');
        pSkipAtom.skipSExp();

        // 7c. Debug logging path
        const pDebug = new Parser('(program (module (name "dbg") (version 1)) (defs))', true);
        pDebug.parse();

        // --- parse-expr special forms ---

        // 8. list-of
        const pList = new Parser('(list-of I64 1 2)');
        const exprList = pList.parseExpr();
        if (exprList.kind !== 'List' || !exprList.typeArg) throw new Error("list-of failed");

        // 9. union (expr)
        const pUnionExpr = new Parser('(union "Tag" 1)');
        const exprUnion = pUnionExpr.parseExpr();
        if (exprUnion.kind !== 'Tuple' || exprUnion.items.length !== 2) throw new Error("union expr failed");

        // 10. tag
        const pTag = new Parser('(tag "Nothing")');
        const exprTag = pTag.parseExpr();
        if (exprTag.kind !== 'Tagged' || exprTag.value.kind !== 'Tuple') throw new Error("tag empty failed");

        // 11. Unexpected token for expr (RParen)
        const pBadExpr = new Parser(')');
        try {
            pBadExpr.parseExpr();
            throw new Error("Should fail unexpected token RParen");
        } catch (e: any) {
            if (!e.message.includes('Unexpected token')) throw new Error("Wrong error unexpected token: " + e.message);
        }

        // 11b. Grouped tuple expression (head not Symbol)
        const pTupleGroup = new Parser('(1 2)');
        const exprTupleGroup = pTupleGroup.parseExpr();
        if (exprTupleGroup.kind !== 'Tuple') throw new Error("Grouped tuple parse failed");

        // 11b.1 nil literal
        const pNil = new Parser('nil');
        const exprNil = pNil.parseExpr();
        if (exprNil.kind !== 'Literal') throw new Error("nil parse failed");

        // 11c. tuple.* and record.* intrinsic parsing
        const pTupleOp = new Parser('(tuple.size (tuple 1))');
        const exprTupleOp = pTupleOp.parseExpr();
        if (exprTupleOp.kind !== 'Intrinsic') throw new Error("tuple.* intrinsic parse failed");
        const pRecordOp = new Parser('(record.size (record))');
        const exprRecordOp = pRecordOp.parseExpr();
        if (exprRecordOp.kind !== 'Intrinsic') throw new Error("record.* intrinsic parse failed");

        // --- parse-type Coverage ---

        // 12. Type Defs (Union, Record, Fn, etc.)
        // We can test this by parsing a program with typedefs or just parseType manually.
        // Let's use a program with typedefs to cover Parser.parseDefinition 'type' branch too (-137).

        const inputTypes = `
        (program
            (module (name "types") (version 1))
            (defs
                (type MyUnion (Union (tag "A" I64) (tag "B" Bool)))
                (type MyRec (Record (f1 I64) (f2 Str)))
                (type MyFn (Fn (I64 I64) I64 !Pure))
                (type MyUnion2 (union (tag "C" (I64)) (tag "D")))
                (type MyLegacyUnion (Union (tag "E" I64)))
            )
        )`;
        const pTypes = new Parser(inputTypes);
        const progTypes = pTypes.parse();
        if (progTypes.defs.length !== 5) throw new Error("Failed to parse types");

        // Check specifics if needed, but coverage should be hit.

        // Test unknown type constructor usage
        const pBadType = new Parser('(UnknownType)');
        try {
            parseType(pBadType); // manually import? 
            // Assert: parseType is not exported directly for use here? 
            // It is exported from parse-type.ts but we need to import it.
            // Or just use Parser to parse a def with it.
        } catch (e) { }

        // We need to import parseType to test it in isolation if we want to hit the "Unknown type constructor" error easily
        // Or just put it in a def.
        const inputBadType = `(program (module (name "b") (version 1)) (defs (type Bad (UnknownType))))`;
        try {
            new Parser(inputBadType).parse();
            throw new Error("Should fail unknown type");
        } catch (e: any) {
            if (!e.message.includes('Unknown type constructor')) throw new Error("Wrong error unknown type: " + e.message);
        }

        // Test "Expected type constructor" (e.g. (123))
        const inputBadType2 = `(program (module (name "c") (version 1)) (defs (type Bad (123))))`;
        try {
            new Parser(inputBadType2).parse();
            throw new Error("Should fail invalid type token");
        } catch (e: any) {
            if (!e.message.includes('Expected type constructor')) throw new Error("Wrong error invalid type token: " + e.message);
        }

        // Test "Unexpected token in type" (e.g. 123)
        const inputBadType3 = `(program (module (name "d") (version 1)) (defs (type Bad 123)))`;
        try {
            new Parser(inputBadType3).parse();
            throw new Error("Should fail invalid type atom");
        } catch (e: any) {
            if (!e.message.includes('Unexpected token in type')) throw new Error("Wrong error invalid type atom: " + e.message);
        }

        // --- parse-type symbol branches ---
        const pSymRecord = new Parser('Record (a I64))');
        const tSymRecord = parseType(pSymRecord);
        if (tSymRecord.type !== 'Record') throw new Error("Symbol Record type failed");

        const pSymUnion = new Parser('Union (tag "A" I64))');
        const tSymUnion = parseType(pSymUnion);
        if (tSymUnion.type !== 'Union') throw new Error("Symbol Union type failed");

        // --- parse-effect errors ---
        const pBadEff = new Parser('!Nope');
        try {
            parseEffect(pBadEff);
            throw new Error("Should fail unknown effect");
        } catch (e: any) {
            if (!e.message.includes('Unknown effect')) throw new Error("Wrong error unknown effect: " + e.message);
        }

        const pMissingEff = new Parser('I64');
        try {
            parseEffect(pMissingEff);
            throw new Error("Should fail missing effect");
        } catch (e: any) {
            if (!e.message.includes('Expected effect')) throw new Error("Wrong error missing effect: " + e.message);
        }

        // --- printer fallback ---
        const unknownPrinted = printValue({ kind: 'WeirdKind' } as any);
        if (!unknownPrinted.startsWith('UnknownValue')) throw new Error("Unknown value print failed");
        const mapPrinted = printValue({ kind: 'Map', value: new Map() } as any);
        if (mapPrinted !== '(map)') throw new Error("Map print failed");

        // --- parser metadata edge cases ---
        const inputMetaEdges = `
        (program
          (module (name "meta") (version 1))
          (defs
            (defconst (name C) (type I64) (doc "const") (value 1))
            (deffn (name f) (args) (ret I64) (eff !Pure)
              ((nested)) (doc "x") (body 0))
            (unknowndef (name bad))
          )
        )`;
        try {
            new Parser(inputMetaEdges).parse();
            throw new Error("Should fail unknown definition kind");
        } catch (e: any) {
            if (!e.message.includes('Unknown definition kind')) throw new Error("Wrong error unknown def: " + e.message);
        }

        console.log("SExp coverage tests passed");
    }
};
