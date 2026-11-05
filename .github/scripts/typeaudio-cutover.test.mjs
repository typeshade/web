import test from 'node:test';
import assert from 'node:assert/strict';
import { cutover } from './typeaudio-cutover.mjs';
const env = { GITHUB_REPOSITORY:'typeshade/web', GITHUB_REF:'refs/heads/main' };
function fixture(options = {}) {
  const calls=[]; let exists=options.exists??false, rules=options.rules??[], state=options.state??'active';
  const api=async(path,method='GET',body)=>{
    calls.push({path,method,body});
    if (path.includes('/environments?')) return {environments: exists?[{name:'typeaudio-production',deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}}]:[]};
    if (path.endsWith('/environments/typeaudio-production') && method==='PUT') {exists=true;return {};}
    if (path.includes('deployment-branch-policies')) {if(method==='POST')rules.push(body);return {branch_policies:rules};}
    if (path.endsWith('/disable')) {state='disabled_manually';return null;}
    if (path.includes('/runs?')) return {total_count:options.active?1:0,workflow_runs:options.active?[{id:1}]:[]};
    if (path.endsWith('/407704055')) return {id:407704055,path:'.github/workflows/deploy.yml',state};
    throw new Error('Unexpected request');
  };return {api,calls};
}
test('setup creates only TypeAudio, restricts main and disables its idle publisher',async()=>{
  const f=fixture();assert.equal((await cutover('setup',f.api,env)).legacyPublisher,'disabled');
  const writes=f.calls.filter(x=>x.method!=='GET');assert.equal(writes.length,3);
  assert.ok(writes.every(x=>x.path.includes('typeaudio')));
});
test('existing environment is preserved and repeated setup is idempotent',async()=>{
  const f=fixture({exists:true,rules:[{name:'main',type:'branch'}],state:'disabled_manually'});
  await cutover('setup',f.api,env);assert.deepEqual(f.calls.filter(x=>x.method!=='GET').map(x=>x.path),[]);
});
test('active old runs prevent setup before any write',async()=>{
  const f=fixture({active:true});await assert.rejects(cutover('setup',f.api,env),/runs/);assert.ok(f.calls.every(x=>x.method==='GET'));
});
test('unexpected existing branch rules are retained and block cutover',async()=>{
  const f=fixture({exists:true,rules:[{name:'*',type:'branch'}]});await assert.rejects(cutover('setup',f.api,env),/main branch/);assert.ok(f.calls.every(x=>x.method==='GET'));
});
test('verification is read-only and requires both the main-only environment and a disabled publisher',async()=>{
  const f=fixture({exists:true,rules:[{name:'main',type:'branch'}]});await assert.rejects(cutover('verify',f.api,env),/disabled/);assert.ok(f.calls.every(x=>x.method==='GET'));
  const good=fixture({exists:true,rules:[{name:'main',type:'branch'}],state:'disabled_manually'});await cutover('verify',good.api,env);assert.ok(good.calls.every(x=>x.method==='GET'));
});
test('non-main or another repository cannot run cutover',async()=>{
  for(const changed of [{GITHUB_REF:'refs/heads/feature'},{GITHUB_REPOSITORY:'other/repo'}]){
    const f=fixture();await assert.rejects(cutover('setup',f.api,{...env,...changed}),/requires/);assert.equal(f.calls.length,0);
  }
});
