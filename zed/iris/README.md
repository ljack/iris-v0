# IRIS Zed Extension (Draft)

This is a local Zed extension providing syntax highlighting and basic structure for `.iris` files.

Current features:
- Tree-sitter grammar for IRIS S-expressions
- Syntax highlighting
- Bracket matching
- Outline for `deffn`/`deftool`/`deftype`/`defconst`

Local install:
1. Open Zed → Extensions.
2. Run "Install Dev Extension".
3. Select the `zed/iris` directory.

Next steps:
- Add a language server for diagnostics, completions, and go-to-definition.
- Improve indentation rules and symbol queries.
