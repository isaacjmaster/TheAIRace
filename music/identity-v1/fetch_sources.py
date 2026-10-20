"""Fetch only pinned CC0 single notes needed by the offline renderer; verify every byte."""
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'data/soundtrack-candidates/samples'
DEST.mkdir(parents=True,exist_ok=True)
for manifest in [ROOT/'music/candidates/v1/sources.json',Path(__file__).with_name('sources.json')]:
 for item in json.loads(manifest.read_text())['files']:
  target=DEST/item['local']
  if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:continue
  with urllib.request.urlopen(item['url'],timeout=60) as response:data=response.read()
  if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Source checksum mismatch: '+item['local'])
  target.write_bytes(data)
  print(item['local'])
