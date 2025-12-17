export type IrisType =
  | { type: 'I64' }
  | { type: 'Bool' }
  | { type: 'Str' }
  | { type: 'Option'; inner: IrisType }
  | { type: 'Result'; ok: IrisType; err: IrisType }
  | { type: 'List'; inner: IrisType }
  | { type: 'Tuple'; items: IrisType[] }
  | { type: 'Record'; fields: Record<string, IrisType> }
  | { type: 'Map'; key: IrisType; value: IrisType }
  | { type: 'Fn'; args: IrisType[]; ret: IrisType; eff: IrisEffect }
  | { type: 'Named'; name: string }
  | { type: 'Union'; variants: Record<string, IrisType> };

export type IrisEffect = '!Pure' | '!IO' | '!Net' | '!Any' | '!Infer';

export interface Import {
  path: string;
  alias: string;
}

export type ModuleDecl = { name: string; version: number };

// AST
export interface Program {
  module: ModuleDecl;
  imports: Import[];
  defs: Definition[];
};

export type ModuleResolver = (path: string) => Program | undefined;

export type Definition =
  | { kind: 'DefConst'; name: string; type: IrisType; value: Expr }
  | {
    kind: 'DefFn';
    name: string;
    args: { name: string; type: IrisType }[];
    ret: IrisType;
    eff: IrisEffect;
    body: Expr;
  }
  | { kind: 'TypeDef'; name: string; type: IrisType };

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
  | { kind: 'List'; items: Expr[]; typeArg?: IrisType } // List construction
  | { kind: 'Tuple'; items: Expr[] }
  | { kind: 'Fold'; list: Expr; init: Expr; fn: Expr } // fn is likely a Lambda or Var
  | { kind: 'Lambda'; args: { name: string; type: IrisType }[]; ret: IrisType; eff: IrisEffect; body: Expr }
  | { kind: 'Record'; fields: Record<string, Expr> }
  | { kind: 'Tagged'; tag: string; value: Expr };

// Pre-defined operators
export type IntrinsicOp =
  | '+' | '-' | '*' | '/' | '%' | '<=' | '<' | '=' | '>=' | '>'
  | '&&' | '||' | '!'
  | 'Some' | 'Ok' | 'Err'

  | 'cons'
  | 'io.print' | 'io.read_file' | 'io.write_file' | 'io.file_exists' | 'io.read_dir'
  | 'net.listen' | 'net.accept' | 'net.read' | 'net.write' | 'net.close' | 'net.connect'
  | 'sys.spawn' | 'sys.self' | 'sys.send' | 'sys.recv' | 'sys.sleep'
  | 'http.parse_request' | 'http.parse_response'
  | 'http.get' | 'http.post'
  | 'map.make' | 'map.put' | 'map.get' | 'map.contains' | 'map.keys'
  | 'list.length' | 'list.get' | 'list.concat' | 'list.unique'
  | 'tuple.get' | 'record.get'
  | 'str.len' | 'str.concat' | 'str.contains' | 'str.ends_with'
  | 'str.get' | 'str.substring' | 'str.from_code' | 'str.index_of'
  | 'i64.from_string' | 'i64.to_string';

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
  | { kind: 'Record'; fields: Record<string, Value> }
  | { kind: 'Tagged'; tag: string; value: Value }
  | { kind: 'Map'; value: Map<string, Value> };
