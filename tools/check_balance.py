
def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    balance = 0
    in_string = False
    in_comment = False
    pos = 0
    while pos < len(content):
        char = content[pos]
        if in_comment:
            if char == '\n':
                in_comment = False
        elif in_string:
            if char == '\\':
                pos += 1
            elif char == '"':
                in_string = False
        else:
            if char == ';':
                in_comment = True
            elif char == '"':
                in_string = True
            elif char == '(':
                balance += 1
            elif char == ')':
                balance -= 1
        pos += 1
    return balance

import sys

if len(sys.argv) < 2:
    print("Usage: python3 check_balance.py <filename>")
    sys.exit(1)

filename = sys.argv[1]
print(f"{filename} balance: {check_balance(filename)}")
