; Keywords and structural forms
((symbol) @keyword
  (#match? @keyword "^(program|module|imports|import|defs|deffn|deftool|deftype|defconst|name|version|args|ret|eff|body|doc|requires|ensures|caps|let|if|call|match|case|tag)$"))

; Types
((symbol) @type
  (#match? @type "^(I64|Bool|Str|List|Tuple|Record|Option|Result|Fn)$"))

; Intrinsics and standard ops
((symbol) @function.builtin
  (#match? @function.builtin "^(io\\.|net\\.|http\\.|str\\.|map\\.|list\\.|tuple\\.|record\\.|sys\\.).+"))

((symbol) @operator
  (#match? @operator "^(\\+|-|\\*|/|%|<=|<|=)$"))

; Literals
(string) @string
(number) @number
(boolean) @boolean
(comment) @comment

; Generic symbols
(symbol) @variable
