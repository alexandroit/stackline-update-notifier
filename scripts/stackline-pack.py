"""Pack a reviewed upstream payload with explicit, source-backed overlays."""
import pathlib,json,hashlib,base64,tarfile,io,gzip
ROOT=pathlib.Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'.stackline/release.json').read_text())
base=(ROOT/'.stackline/upstream.tgz').read_bytes()
assert 'sha512-'+base64.b64encode(hashlib.sha512(base).digest()).decode()==CFG['upstreamIntegrity']
files={};modes={}
with tarfile.open(fileobj=io.BytesIO(base)) as archive:
 for entry in archive.getmembers():
  assert entry.name.startswith('package/') and '..' not in pathlib.PurePosixPath(entry.name).parts
  if entry.isfile():
   name=entry.name[len('package/'):];files[name]=archive.extractfile(entry).read();modes[name]=0o755 if entry.mode & 0o111 else 0o644
before={k:hashlib.sha256(v).hexdigest() for k,v in files.items()}
for target,source in CFG['overlays'].items():
 files[target]=(ROOT/source).read_bytes()
files['package.json']=(ROOT/'.stackline/package.json').read_bytes()
for name in ['STACKLINE.md','UPSTREAM.md','NOTICE.stackline','CHANGELOG.stackline.md']:
 files[name]=(ROOT/name).read_bytes()
after={k:hashlib.sha256(v).hexdigest() for k,v in files.items()}
changed=sorted(k for k in before if before[k]!=after[k])
assert changed==sorted(['package.json']+[k for k in CFG['overlays'] if before.get(k)!=after[k]])
out=ROOT/'artifact';out.mkdir(exist_ok=True)
manifest=json.loads(files['package.json']);archive=out/(manifest['name'].replace('@','').replace('/','-')+'-'+manifest['version']+'.tgz')
raw=io.BytesIO()
with tarfile.open(fileobj=raw,mode='w',format=tarfile.PAX_FORMAT) as tar:
 for name in sorted(files):
  entry=tarfile.TarInfo('package/'+name);entry.size=len(files[name]);entry.mode=modes.get(name,0o644);entry.mtime=499162500;entry.uid=entry.gid=0;entry.uname=entry.gname='';tar.addfile(entry,io.BytesIO(files[name]))
with archive.open('wb') as output:
 with gzip.GzipFile(fileobj=output,mode='wb',filename='',mtime=0,compresslevel=9) as zipped:zipped.write(raw.getvalue())
evidence={'upstream':CFG['upstream'],'upstreamVersion':CFG['upstreamVersion'],'upstreamIntegrity':CFG['upstreamIntegrity'],'upstreamCommit':CFG['upstreamCommit'],'filesBefore':before,'filesAfter':after,'changedUpstreamFiles':changed,'addedFiles':sorted(set(after)-set(before)),'sha512':hashlib.sha512(archive.read_bytes()).hexdigest()}
(out/'payload-verification.json').write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps({'archive':str(archive),'sha512':evidence['sha512'],'changedUpstreamFiles':changed}))
