import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp/parser';
import { FunctionLikeDef } from '../src/types';

export const t514_parser_metadata: TestCase = {
    name: 'Test 514: Parser metadata fields are attached',
    fn: async () => {
        const input = `
        (program
          (module (name "meta") (version 1))
          (defs
            (defconst (name ANSWER) (type I64) (doc "Const doc") (ignored-tag "skip-me") (value 42))
            (deffn (name sum) (args (x I64) (y I64)) (ret I64) (eff !Pure)
              (doc "Adds two numbers")
              (requires "x and y are provided")
              (ensures "result is >= x")
              (caps (stdout Str))
              (unknown-metadata (note "ignored"))
              (body (+ x y)))
          )
        )`;

        const program = new Parser(input).parse();
        if (program.defs.length !== 2) throw new Error('Expected two definitions with metadata');

        const constDef = program.defs[0];
        if (constDef.kind !== 'DefConst') throw new Error('First def should be defconst');
        if (constDef.doc !== 'Const doc') throw new Error('Const doc metadata not attached');
        if ((constDef as any)['ignored-tag'] !== undefined) throw new Error('Unsupported const metadata should be skipped');

        const fnDef = program.defs[1] as FunctionLikeDef;
        if (fnDef.kind !== 'DefFn') throw new Error('Second def should be deffn');
        if (fnDef.doc !== 'Adds two numbers') throw new Error('Fn doc metadata missing');
        if (fnDef.requires !== 'x and y are provided') throw new Error('Fn requires metadata missing');
        if (fnDef.ensures !== 'result is >= x') throw new Error('Fn ensures metadata missing');
        if (!fnDef.caps || fnDef.caps.length !== 1 || fnDef.caps[0].name !== 'stdout' || fnDef.caps[0].type.type !== 'Str') {
            throw new Error('Fn capabilities metadata not parsed');
        }
        if ((fnDef as any)['unknown-metadata'] !== undefined) throw new Error('Unsupported fn metadata should be ignored');
    },
};

export const t514_parser_unknown_section_trace: TestCase = {
    name: 'Test 514b: Parser reports last closed section on unknown tag',
    fn: async () => {
        const input = `
        (program
          (module (name "meta2") (version 1))
          (defs)
          (unexpected-section)
        )`;

        try {
            new Parser(input).parse();
            throw new Error('Expected unknown section error');
        } catch (e: any) {
            const msg = e.message as string;
            if (!msg.includes('Unknown program section: unexpected-section')) {
                throw new Error('Missing unknown section name in error');
            }
            if (!msg.includes("Previous section 'defs' closed at")) {
                throw new Error('Error should mention last closed section location');
            }
        }
    },
};
