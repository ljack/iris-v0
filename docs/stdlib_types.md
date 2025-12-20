# IRIS Built-in Types

## I64
64-bit signed integer.

Example:
```iris
(let (x 42)
  (+ x 1))
```

## Bool
Boolean value: `true` or `false`.

Example:
```iris
(if true
  1
  0)
```

## Str
UTF-8 string.

Example:
```iris
(str.concat "hello " "world")
```

## List
Homogeneous list of values.

Example:
```iris
(list 1 2 3)
```

## Tuple
Fixed-size, ordered collection.

Example:
```iris
(tuple 1 "a")
```

## Record
Named fields with values.

Example:
```iris
(record
  (name "Ada")
  (age 37))
```

## Map
Key/value map.

Example:
```iris
(map.make)
```

## Option
Optional value: `Some` or `None`.

Example:
```iris
(match opt
  (case (tag "Some" (v)) v)
  (case (tag "None") 0))
```

## Result
Result value: `Ok` or `Err`.

Example:
```iris
(match res
  (case (tag "Ok" (v)) v)
  (case (tag "Err" (e)) (str.concat "error: " e)))
```

## Union
Tagged union with named variants.

Example:
```iris
(deftype MyUnion (Union (tag "A" I64) (tag "B" Str)))
```

## Fn
Function type.

Example:
```iris
(deftype Inc (Fn (I64) I64 !Pure))
```
