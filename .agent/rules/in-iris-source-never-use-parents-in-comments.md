---
trigger: always_on
---

In iris source code never use ( or ) in comments


DON'T DO:
 
```(let (p2 (call base.parser_consume p)) ;; skip (```
     
INSTEAD replace ( with ascii strings like lparen 
and ) with parent

like

```(let (p2 (call base.parser_consume p)) ;; skip lparen```

Also remember to think if the iris comments are causing an issue.
