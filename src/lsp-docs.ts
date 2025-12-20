export type DocEntry = {
  name: string;
  markdown: string;
};

const builtinDocs: Record<string, DocEntry> = {
  I64: {
    name: "I64",
    markdown: "**I64**\n\n64-bit signed integer.\n\n```iris\n(+ 1 2)\n```",
  },
  Bool: {
    name: "Bool",
    markdown: "**Bool**\n\nBoolean value: `true` or `false`.\n\n```iris\n(if true 1 0)\n```",
  },
  Str: {
    name: "Str",
    markdown: "**Str**\n\nUTF-8 string.\n\n```iris\n(str.concat \"hello \" \"world\")\n```",
  },
  List: {
    name: "List",
    markdown: "**List**\n\nHomogeneous list of values.\n\n```iris\n(list 1 2 3)\n```",
  },
  Tuple: {
    name: "Tuple",
    markdown: "**Tuple**\n\nFixed-size, ordered collection.\n\n```iris\n(tuple 1 \"a\")\n```",
  },
  Record: {
    name: "Record",
    markdown:
      "**Record**\n\nNamed fields with values.\n\n```iris\n(record (name \"Ada\") (age 37))\n```",
  },
  Map: {
    name: "Map",
    markdown: "**Map**\n\nKey/value map.\n\n```iris\n(map.make)\n```",
  },
  Option: {
    name: "Option",
    markdown:
      "**Option**\n\nOptional value: `Some` or `None`.\n\n```iris\n(match opt (case (tag \"Some\" (v)) v) (case (tag \"None\") 0))\n```",
  },
  Result: {
    name: "Result",
    markdown:
      "**Result**\n\nResult value: `Ok` or `Err`.\n\n```iris\n(match res (case (tag \"Ok\" (v)) v) (case (tag \"Err\" (e)) e))\n```",
  },
  Union: {
    name: "Union",
    markdown:
      "**Union**\n\nTagged union with named variants.\n\n```iris\n(deftype MyUnion (Union (tag \"A\" I64) (tag \"B\" Str)))\n```",
  },
  Fn: {
    name: "Fn",
    markdown:
      "**Fn**\n\nFunction type.\n\n```iris\n(deftype Inc (Fn (I64) I64 !Pure))\n```",
  },
};

export function getBuiltinDoc(name: string): DocEntry | null {
  return builtinDocs[name] ?? null;
}

export function getBuiltinDocNames(): string[] {
  return Object.keys(builtinDocs);
}
