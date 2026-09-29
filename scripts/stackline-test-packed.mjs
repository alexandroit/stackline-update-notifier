import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=process.cwd();
const cfg=JSON.parse(readFileSync('.stackline/release.json','utf8'));
const metadata=JSON.parse(readFileSync('.stackline/package.json','utf8'));
const archive=path.resolve('artifact',readdirSync('artifact').find(x=>x.endsWith('.tgz')));
const cwd=mkdtempSync(path.join(os.tmpdir(),'stackline-runtime-'));
try {
 writeFileSync(path.join(cwd,'package.json'),JSON.stringify({name:'stackline-packed-contract',version:'1.0.0',private:true,dependencies:{[metadata.name]:'file:'+archive}}));
 execFileSync('npm',['install','--ignore-scripts','--no-fund','--no-audit'],{cwd,stdio:'pipe'});
 const audit=JSON.parse(execFileSync('npm',['audit','--omit=dev','--audit-level=low','--json'],{cwd,encoding:'utf8'}));
 assert.equal(audit.metadata.vulnerabilities.total,0);
 const dir=path.join(cwd,'node_modules',metadata.name);
 const require=createRequire(path.join(cwd,'package.json'));
 const actual=JSON.parse(readFileSync(path.join(dir,'package.json'),'utf8'));
 assert.deepEqual(actual,metadata);
 // The payload proof covers every preserved public file, including deep paths.
 const proof=JSON.parse(readFileSync('artifact/payload-verification.json','utf8'));
 const {createHash}=await import('node:crypto');
 for(const [file,digest] of Object.entries(proof.filesAfter)) assert.equal(createHash('sha256').update(readFileSync(path.join(dir,file))).digest('hex'),digest,file);
 const load=async file=>import(pathToFileURL(path.join(dir,file||metadata.main||'index.js')).href);
 let api;
 if(cfg.slug!=='bootstrap') api=await load();
 switch(cfg.slug){
 case 'concat-stream': {const concat=require(metadata.name);const result=await new Promise(resolve=>{const stream=concat(resolve);stream.write(Buffer.from('a'));stream.end(Buffer.from('b'));});assert.equal(result.toString(),'ab');break;}
 case 'debug': {const debug=require(metadata.name);debug.enable('stackline:*');assert.equal(debug('stackline:test').enabled,true);debug.disable();break;}
 case 'emojis-list': {const list=require(metadata.name);assert(Array.isArray(list));assert(list.length>1000);assert(list.every(x=>typeof x==='string'));break;}
 case 'regex-parser': {const parse=require(metadata.name);assert(parse('/hello/i').test('HELLO'));assert(parse('hello') instanceof RegExp);break;}
 case 'json5': {const parser=require(metadata.name);assert.deepEqual(parser.parse('{a:1,}'),{a:1});const esm=await load('dist/index.mjs');assert.deepEqual(esm.default.parse('{a:1}'),{a:1});break;}
 case 'parse-json': {assert.deepEqual(api.default('{"a":1}'),{a:1});assert.throws(()=>api.default('{','fixture.json'),api.JSONError);break;}
 case 'async': {const async=require(metadata.name);assert.deepEqual(await async.map([1,2],async value=>value*2),[2,4]);assert.equal(typeof require(path.join(dir,'map.js')),'function');const esm=await load('dist/async.mjs');assert.equal(typeof esm.map,'function');break;}
 case 'trace-mapping': {const cjs=require(metadata.name);const map=new cjs.TraceMap({version:3,names:[],sources:['x'],mappings:'AAAA'});assert.equal(cjs.traceSegment(map,-1,0),null);assert.deepEqual(cjs.traceSegment(map,0,0),[0,0,0,0]);const esm=await load('dist/trace-mapping.mjs');assert.equal(esm.traceSegment(new esm.TraceMap({version:3,names:[],sources:['x'],mappings:'AAAA'}),-1,0),null);break;}
 case 'source-map-js': {const sm=require(metadata.name);assert.throws(()=>new sm.SourceMapConsumer({version:3,sections:[{offset:{line:Infinity,column:0},map:{version:3,names:[],sources:[],mappings:''}}]}),TypeError);const map=new sm.SourceMapGenerator();map.addMapping({generated:{line:1,column:0},original:{line:1,column:0},source:'input.js'});assert.equal(new sm.SourceMapConsumer(map.toJSON()).originalPositionFor({line:1,column:0}).source,'input.js');break;}
 case 'import-meta-resolve': {assert.equal(api.resolve('node:fs',import.meta.url),'node:fs');const {codes}=await load('lib/errors.js');assert.match(new codes.ERR_INVALID_ARG_TYPE('x',['object','Date'],1).message,/must be an instance of Date or Object/);const {defaultGetFormatWithoutErrors:f}=await load('lib/get-format.js');assert.equal(f(new URL('data:text/'+'a'.repeat(100000)),{parentURL:import.meta.url}),null);break;}
 case 'rollup-plugin-inject': {const inject=require(metadata.name);assert.equal(typeof inject,'function');assert.equal(inject({Promise:'es6-promise'}).name,'inject');const esm=await load('dist/es/index.js');assert.equal(typeof esm.default,'function');break;}
 case 'tslib': {const tslib=require(metadata.name);assert.deepEqual(tslib.__assign({},{a:1}),{a:1});assert.deepEqual(tslib.__spreadArray([1],[2],true),[1,2]);const esm=await load('tslib.es6.mjs');assert.equal(typeof esm.__awaiter,'function');break;}
 case 'pg-copy-streams': {const pg=require(metadata.name);assert.equal(typeof pg.from('COPY t FROM STDIN').write,'function');assert.equal(typeof pg.to('COPY t TO STDOUT').read,'function');assert.equal(typeof require(path.join(dir,'copy-both.js')),'function');break;}
 case 'update-notifier': assert.equal(typeof api.default,'function');break;
 case 'bootstrap': assert(readFileSync(path.join(dir,'dist/css/bootstrap.css'),'utf8').includes('.container'));assert(readFileSync(path.join(dir,'dist/js/bootstrap.js'),'utf8').includes('class Modal'));break;
 default: throw new Error('Missing explicit API contract '+cfg.slug);
 }
 console.log(JSON.stringify({package:metadata.name,status:'PASS',verifiedFiles:Object.keys(proof.filesAfter).length}));
} finally {rmSync(cwd,{recursive:true,force:true});}
