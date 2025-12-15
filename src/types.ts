export type IrisType =
  | { type: 'I64' }
  | { type: 'Bool' }
  | { type: 'Str' }
  | { type: 'Option'; inner: IrisType }
  | { type: 'Result'; ok: IrisType; err: IrisType }
  | { type: 'List'; inner: IrisType }
  | { type: 'Tuple'; items: IrisType[] }
  | { type: 'Record'; fields: Record<string, IrisType> }
  | { type: 'Fn'; args: IrisType[]; ret: IrisType; eff: IrisEffect };

export type IrisEffect = '!Pure' | '!IO' | '!Net' | '!Any';

// AST
export type Program = {
  module: { name: string; version: number };
  defs: Definition[];
};

export type Definition =
  | { kind: 'DefConst'; name: string; type: IrisType; value: Expr }
  | {
    kind: 'DefFn';
    name: string;
    args: { name: string; type: IrisType }[];
    ret: IrisType;
    eff: IrisEffect;
    body: Expr;
  };

export type Expr =
  | { kind: 'Literal'; value: Value }
  | { kind: 'Var'; name: string }
  | { kind: 'Let'; name: string; value: Expr; body: Expr }
  | { kind: 'If'; cond: Expr; then: Expr; else: Expr }
  | { kind: 'Match'; target: Expr; cases: MatchCase[] }
  | { kind: 'Call'; fn: string; args: Expr[] }
  | {
    kind: 'Intrinsic';
    op: IntrinsicOp;
    args: Expr[];
  }
  | { kind: 'List'; items: Expr[] } // List construction
  | { kind: 'Fold'; list: Expr; init: Expr; fn: Expr } // fn is likely a Lambda or Var
  | { kind: 'Lambda'; args: { name: string; type: IrisType }[]; ret: IrisType; eff: IrisEffect; body: Expr }
  | { kind: 'Record'; fields: Record<string, Expr> };

export type IntrinsicOp =
  | '+' | '-' | '*' | '<=' | '<' | '='
  | 'Some' | 'None' | 'Ok' | 'Err'
  | 'cons'
  | 'io.print' | 'io.read_file' | 'io.write_file';

export type MatchCase = {
  tag: string;
  vars: string[]; // e.g., (case (tag "Some" (v)) ...) -> vars: ["v"]
  body: Expr;
};

// Runtime Values
export type Value =
  | { kind: 'I64'; value: bigint }
  | { kind: 'Bool'; value: boolean }
  | { kind: 'Str'; value: string }
  | { kind: 'Option'; value: Value | null } // null for None
  | { kind: 'Result'; isOk: boolean; value: Value }
  | { kind: 'List'; items: Value[] }
  | { kind: 'Tuple'; items: Value[] }
  | { kind: 'Record'; fields: Record<string, Value> };
