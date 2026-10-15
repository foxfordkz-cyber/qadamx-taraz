"""Package source without account data, keys, caches or installed dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
target=root.parent/'qadamx-fullstack-ready.zip'
files=[]
for name in ('package.json','package-lock.json','index.html','vite.config.js','README.md','VERIFICATION.md','.env.example','.gitignore'):
    files.append(root/name)
for folder in ('src','fixtures'):
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and p.suffix in ('.js','.jsx','.css','.json') and p.name!='main.original.jsx')
files.extend((root/'backend').glob('*.py'))
files.extend((root/'backend').glob('requirements*.txt'))
files.append(root/'backend/.env.example')
files.extend((root/'scripts').glob('*.mjs'))
files.append(Path(__file__).resolve())
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for path in sorted(files):
        relative=path.relative_to(root)
        assert path.name!='.env' and 'data' not in relative.parts and '.venv' not in relative.parts
        archive.write(path,Path('qadamx-ledger-starter')/relative)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert not any(Path(n).name=='.env' or '.sqlite3' in n for n in archive.namelist())
print(f'{target.name}: {len(files)} source files; secrets and databases excluded')
