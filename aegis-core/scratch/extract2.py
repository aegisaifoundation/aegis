with open(r'c:\AIagent\aegis-core\scratch\title.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

cleaned_lines = []
for line in lines:
    l = line.strip()
    if l.startswith("'"): l = l[1:]
    if l.endswith("',"): l = l[:-2]
    cleaned_lines.append(l)

# The shield is the first 34 lines.
# We will find the minimum left padding of just these 34 lines.
shield_lines = cleaned_lines[:34]
min_idx = 9999
for line in shield_lines:
    if line.strip():
        for i, c in enumerate(line):
            if c != '⠀' and c != ' ':
                min_idx = min(min_idx, i)
                break

formatted_shield = []
for line in shield_lines:
    l = line[min_idx:] if len(line) > min_idx else ""
    # trim trailing braille spaces
    while l.endswith('⠀') or l.endswith(' '):
        l = l[:-1]
    formatted_shield.append(l)

# The title is lines 37 to 44
title_lines = cleaned_lines[37:46]
min_idx_title = 9999
for line in title_lines:
    if line.strip():
        for i, c in enumerate(line):
            if c != '⠀' and c != ' ':
                min_idx_title = min(min_idx_title, i)
                break

formatted_title = []
for line in title_lines:
    l = line[min_idx_title:] if len(line) > min_idx_title else ""
    while l.endswith('⠀') or l.endswith(' '):
        l = l[:-1]
    formatted_title.append(l)

with open(r'c:\AIagent\aegis-core\scratch\final_art.js', 'w', encoding='utf-8') as f:
    f.write("export const SHIELD_ART = [\n")
    for l in formatted_shield:
        f.write(f"  '{l}',\n")
    f.write("];\n\n")
    f.write("export const AEGIS_TITLE = [\n")
    for l in formatted_title:
        f.write(f"  '{l}',\n")
    f.write("];\n")
