with open(r'c:\AIagent\aegis-core\scratch\title.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

cleaned = [l.strip()[1:-2] if l.strip().startswith("'") else l.strip() for l in lines]

shield = []
for l in cleaned[:34]:
    # Shield starts around 144, but let's just grab the first 60 non-empty chars
    # wait, the shield is on the LEFT. The title is on the RIGHT.
    # We found earlier the shield starts right at index 0 because line 27 has '⢀⠀⠀⠀⡀'
    shield.append(l[:70])

title = []
for l in cleaned[38:45]:
    idx = l.find('⣿⣷') if '⣿⣷' in l else 145
    if idx == -1: idx = 145
    # just grab from index 145 to 220
    title.append(l[145:220].rstrip())

with open(r'c:\AIagent\aegis-core\src\terminal\art.ts', 'w', encoding='utf-8') as f:
    f.write('export const SHIELD_ART = [\n')
    for l in shield:
        f.write(f"  '{l}',\n")
    f.write('];\n\n')
    
    f.write('export const AEGIS_TITLE = [\n')
    for l in title:
        f.write(f"  '{l}',\n")
    f.write('];\n')
