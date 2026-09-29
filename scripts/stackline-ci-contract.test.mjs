import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('CI disables the notifier and an interactive environment creates its config', () => {
 const config=mkdtempSync(path.join(os.tmpdir(),'stackline-notifier-'));
 try {
  for (const ci of ['true','false']) {
   const env={...process.env,CI:ci,NODE_ENV:'production',XDG_CONFIG_HOME:config};
   delete env.NO_UPDATE_NOTIFIER;
   const code="const {default:Notifier}=await import('./update-notifier.js');const notifier=new Notifier({pkg:{name:'stackline-contract',version:'1.0.0'}});console.log(Boolean(notifier.config));";
   const child=spawnSync(process.execPath,['--input-type=module','-e',code],{env,encoding:'utf8'});
   assert.equal(child.status,0,child.stderr);
   assert.equal(child.stdout.trim(),ci==='true'?'false':'true');
  }
 } finally {rmSync(config,{recursive:true,force:true});}
});
