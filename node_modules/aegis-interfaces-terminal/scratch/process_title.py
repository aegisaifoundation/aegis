from pathlib import Path

title = r"""
      █████╗ ███████╗  ██████╗ ██╗███████╗
     ██╔══██╗██╔════╝ ██╔════╝ ██║██╔════╝
     ███████║█████╗   ██║  ███╗██║███████╗
     ██╔══██║██╔══╝   ██║   ██║██║╚════██║
     ██║  ██║███████╗ ╚██████╔╝██║███████║
     ╚═╝  ╚═╝╚══════╝  ╚═════╝ ╚═╝╚══════╝
"""

lines = title.splitlines()

while lines and not lines[0].strip():
    lines.pop(0)

while lines and not lines[-1].strip():
    lines.pop()

min_idx = None

for line in lines:
    if line.strip():
        stripped = len(line) - len(line.lstrip())
        if min_idx is None or stripped < min_idx:
            min_idx = stripped

if min_idx is None:
    min_idx = 0

formatted = []

for line in lines:
    l = line[min_idx:] if len(line) > min_idx else ""
    l = l.rstrip()
    formatted.append(l)

out_path = Path(__file__).resolve().parent / 'title.txt'

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(formatted) + '\n')

