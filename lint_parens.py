import sys
import glob

def check_parens(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = 0
    errors = []
    
    for i, line in enumerate(lines):
        # Ignore string contents
        cleaned_line = ""
        in_string = False
        escape = False
        for char in line:
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if not in_string and char != ';': # rudimentary comment check: ; is comment? check lexer
                 if char == ';': break # assume ; starts comment
                 cleaned_line += char

        for char in cleaned_line:
            if char == '(':
                stack += 1
            elif char == ')':
                stack -= 1
                if stack < 0:
                    errors.append(f"Line {i+1}: Extra closing parenthesis")
                    stack = 0 # reset to continue finding others
    
    if stack > 0:
        errors.append(f"End of file: Missing {stack} closing parenthesis/parentheses")
    
    if errors:
        print(f"Errors in {filename}:")
        for e in errors:
            print(f"  {e}")
        return False
    else:
        print(f"OK: {filename}")
        return True

files = glob.glob('examples/*.iris')
dirty = False
for f in files:
    if not check_parens(f):
        dirty = True

if dirty:
    sys.exit(1)
