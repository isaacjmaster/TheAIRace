"""Download only the pinned CC0 source subset, checking every file hash."""
from pathlib import Path
import urllib.request,json,hashlib
root=Path(__file__).resolve().parents[3]/'data/soundtrack-candidates/samples';root.mkdir(parents=True,exist_ok=True)
manifest=json.loads((Path(__file__).parent/'sources.json').read_text())
for entry in manifest['files']:
 p=root/entry['local']
 if not p.exists():p.write_bytes(urllib.request.urlopen(entry['url']).read())
 if hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Source hash mismatch: '+entry['local'])
 print(entry['local'],'verified')
