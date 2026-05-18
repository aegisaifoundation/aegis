import re

with open(r'c:\AIagent\aegis-core\scratch\title.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def extract_and_format(start, end, name):
    block = lines[start:end]
    min_idx = 9999
    
    # Strip the leading `  '` and trailing `',` that I added in process_title.py
    clean_block = []
    for line in block:
        clean_line = line.strip()
        if clean_line.startswith("'"): clean_line = clean_line[1:]
        if clean_line.endswith("',"): clean_line = clean_line[:-2]
        clean_block.append(clean_line)

    for line in clean_block:
        if line.strip():
            match = re.search(r'[^⠀\s]', line)
            if match:
                min_idx = min(min_idx, match.start())
                
    formatted = [f"const {name} = ["]
    for line in clean_block:
        l = line[min_idx:] if len(line) > min_idx else ""
        l = l.rstrip()
        formatted.append(f"  '{l}',")
    formatted.append("];")
    return "\n".join(formatted)

shield_code = extract_and_format(0, 34, "SHIELD_ART")
title_code = extract_and_format(37, 44, "AEGIS_TITLE")

with open(r'c:\AIagent\aegis-core\scratch\formatted_art.js', 'w', encoding='utf-8') as f:
    f.write(shield_code + "\n\n" + title_code)
