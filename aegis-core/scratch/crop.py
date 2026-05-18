with open(r'c:\AIagent\aegis-core\src\terminal\art.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

cropped_lines = []
for line in lines:
    if line.startswith('  \''):
        # find the 60th character and crop to it, but make sure we don't cut off middle of braille
        cropped = line[:62] + "',"
        cropped_lines.append(cropped)
    else:
        cropped_lines.append(line.rstrip())

with open(r'c:\AIagent\aegis-core\src\terminal\art.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(cropped_lines) + '\n')
