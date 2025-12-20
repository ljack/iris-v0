(list
  (symbol) @_def
  (#match? @_def "^(deffn|deftool|deftype|defconst)$")
  (list
    (symbol) @_name_kw
    (#eq? @_name_kw "name")
    (symbol) @name)) @item
