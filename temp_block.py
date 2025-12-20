from pathlib import Path
lines = Path('src/main.js').read_text(encoding='utf-8').splitlines()
for i in range(3520, 3605):
    if i < len(lines):
        print(f'{i+1}: {lines[i]!r}')
