// Backend tests without Electron or Claude: node scripts/dev/backend-harness.js
// Drives LocalVoiceOSClient with a scripted assistant and checks the protobuf
// messages the app would receive (dictation, tools, catalog, approvals).
const ROOT=require('path').resolve(__dirname,'../..')+'/';
const Module=require('module'); const orig=Module._resolveFilename;
Module._resolveFilename=function(r,p,...x){try{return orig.call(this,r,p,...x);}catch(e){return orig.call(this,r,{...p,paths:[ROOT+'node_modules']},...x);}};
require.cache[require.resolve(ROOT+'node_modules/electron')]={exports:{app:{getPath:()=>'/tmp/voiceos-test',on(){},whenReady:()=>new Promise(()=>{})},safeStorage:{isEncryptionAvailable:()=>false}}};
const codegenv2=require(ROOT+'node_modules/@bufbuild/protobuf/dist/cjs/codegenv2/index.js');
const wkt=require(ROOT+'node_modules/@bufbuild/protobuf/dist/cjs/wkt/index.js');
const protobuf=require(ROOT+'node_modules/@bufbuild/protobuf/dist/cjs/index.js');
let src=require('fs').readFileSync(__dirname+'/voiceos-proto-desc.js','utf8').trim().replace(/,$/,''); eval('var '+src+';global.fv=file_voiceos;');
const svc=codegenv2.serviceDesc(global.fv,0), SM=codegenv2.messageDesc(global.fv,13), ASR=codegenv2.messageDesc(global.fv,57);
const tr=require(ROOT+'src/main/local/speech/transcribe.js'); const realT=tr.transcribe; let fakeText='open spotify please';
tr.transcribe=async(o)=>{ if(o.pcm.length<32000||o.pcm.every?.(b=>b===0)) return realT({...o,model:'x'}); return fakeText; };
const A=require(ROOT+'src/main/local/assistant/index.js'); let impl;
A.runTurn=(t,turn)=>impl(t,turn); A.complete=async(t,{system})=>system.includes('post-processor')?'Polished.':'REWRITE';
const computer=require(ROOT+'src/main/local/assistant/computer.js'); let clicked=0;
computer.tools=()=>[{name:'mac_look',description:'look',schema:{},label:'Looking',run:async()=>({content:'[]'})},{name:'mac_act',description:'act',schema:{},label:'Using the app',run:async(a)=>a.risky?{needsApproval:{label:'Click “Send”',params:{app:'Mail',button:'Send'}},resume:async()=>(clicked++,{content:'Done: clicked Send'})}:{content:'Done'}}];
const {LocalVoiceOSClient}=require(ROOT+'src/main/local/backend.js');
const settings={read:()=>({speech:{whisperModel:'m'},assistant:{}}),voice:()=>({enabled:false,jarvis:false}),connector:()=>false,resolveAssistant:()=>({engine:'subscription',model:'sonnet'})};
const c=new LocalVoiceOSClient({create:protobuf.create,service:svc,settings});
const assert=require('assert');
(async()=>{
  async function* audio(mode,n=32000){ yield protobuf.create(SM,{payload:{case:'modeUpdate',value:{mode}}}); const b=Buffer.alloc(n); for(let i=0;i<n/2;i++) b.writeInt16LE(Math.round(8000*Math.sin(i/5)),i*2); yield protobuf.create(SM,{payload:{case:'audioChunk',value:{audioData:b}}}); }
  let r=await c.voiceOSSessionStream(audio(0),{headers:new Headers({'polish-style':'polished'})}); assert.equal(r.transcript,'Polished.'); r=await c.voiceOSSessionStream(audio(0),{headers:new Headers({'polish-style':'none'})}); assert.equal(r.transcript,fakeText); r=await c.voiceOSSessionStream(audio(0),{headers:new Headers()}); console.log('light:',JSON.stringify(r.transcript)); assert.equal(r.rawTranscript,fakeText);
  r=await c.voiceOSSessionStream(audio(3),{headers:new Headers()}); assert.equal(r.transcript,fakeText);
  r=await c.voiceOSSessionStream(audio(1),{headers:new Headers({'selected-text':'hello'})}); assert.equal(r.transcript,'REWRITE');
  r=await c.voiceOSSessionStream(audio(0,40),{headers:new Headers()}); assert.equal(r.error.code,'CLIENT_AUDIO_TOO_SHORT');
  impl=async function*(t,turn){ assert.ok(turn.prompt.includes('<context>')); yield {type:'text',text:'Opening Spotify.'}; let respond; const p=new Promise(r=>respond=r); yield {type:'tool',name:'voiceos_open_app',args:{app_name:'Spotify'},respond}; const res=await p; assert.ok(res.content.includes('ok')); yield {type:'text',text:'Opening Spotify.\n\nDone.'}; };
  const req=protobuf.create(ASR,{textInput:'open spotify',customToolDeclarations:[{name:'voiceos_open_app',originalName:'voiceos_open_app',parametersJson:'{"type":"object","properties":{"app_name":{"type":"string"}}}',mcpServerId:'voiceos_native_actions'}]});
  const seq=[]; for await (const m of c.agentStream(req,{})){ seq.push(m.status+(m.message?':'+m.message:'')); if(m.status===9){const d=JSON.parse(m.actionDetails); assert.equal(d.serverId,'voiceos_native_actions'); assert.deepEqual(d.args,{app_name:'Spotify'}); await c.agentMcpToolResult({executionId:d.executionId,resultJson:'{"ok":true}'});} }
  console.log(seq); assert.equal(seq.at(-1),'7'); assert.ok(seq.includes('9:Open app'));
  impl=async function*(){ throw new Error('Your Claude sign-in has expired. Open VoiceOS Setup and choose “Sign in to Claude”.'); };
  const e=[]; for await (const m of c.agentStream(protobuf.create(ASR,{textInput:'hi'}),{})) e.push(m.status+':'+m.message); assert.ok(e.at(-1).startsWith('6:Your Claude sign-in'));
  impl=async function*(t,turn){ assert.ok(turn.tools.byName.has('view_screen')); assert.equal(turn.images.length,0); let respond; const p=new Promise(r=>respond=r); yield {type:'tool',name:'view_screen',args:{},respond}; const res=await p; assert.equal(res.content[0].type,'image'); assert.equal(res.content[0].mimeType,'image/png'); yield {type:'text',text:'I see it.'}; };
  const vs=[]; for await (const m of c.agentStream(protobuf.create(ASR,{textInput:'what is this',cursorScreenshotBase64:'data:image/png;base64,iVBORw0KGgo='}),{})) vs.push(m.status+(m.message?':'+m.message:'')); console.log(vs); assert.ok(vs.includes('3:Looking at your screen')); assert.equal(vs.at(-1),'7');
  // app_tool catalog: non-core connector actions run by name through the app's executor
  const creq=protobuf.create(ASR,{textInput:'text mom',customToolDeclarations:[
    {name:'custom_mcp_voiceosnotes_list_notes',originalName:'list_notes',description:'List notes in Apple Notes. Returns titles.',parametersJson:'{"type":"object","properties":{"folder":{"type":"string"}}}',mcpServerId:'voiceos_notes',mcpServerName:'Notes'},
    {name:'custom_mcp_voiceosimessage_send_message',originalName:'send_message',description:'Send an iMessage.',parametersJson:'{"type":"object","properties":{"recipient":{"type":"string"},"text":{"type":"string"}},"required":["recipient","text"]}',mcpServerId:'voiceos_imessage',mcpServerName:'iMessage',requiresConfirmation:true}]});
  impl=async function*(t,turn){
    assert.ok(!turn.tools.byName.has('custom_mcp_voiceosnotes_list_notes'));
    const app=turn.tools.byName.get('app_tool'); assert.ok(app.description.includes('list_notes(folder?)'), app.description);
    const call=async(args)=>{let respond;const p=new Promise(r=>respond=r);return {ev:{type:'tool',name:'app_tool',args,respond},p};};
    let x=await call({name:'list_notes',describe:true}); yield x.ev; let r=await x.p; assert.ok(JSON.parse(r.content).parameters.properties.folder);
    x=await call({name:'send_message',arguments:{recipient:'Mom'}}); yield x.ev; r=await x.p; assert.ok(r.isError && r.content.includes('Missing required'));
    x=await call({name:'send_message',arguments:{recipient:'Mom',text:'hi'}}); yield x.ev; r=await x.p; assert.ok(!r.isError && r.content.includes('declined'), r.content);
    x=await call({name:'send_message',arguments:{recipient:'Mom',text:'hi'}}); yield x.ev; r=await x.p; assert.ok(r.content.includes('sent'), r.content);
    x=await call({name:'applenotes_notes_list',arguments:{}}); yield x.ev; r=await x.p; assert.ok(r.isError && r.content.includes('list_notes(folder?)'), r.content); console.log(r.content);
    x=await call({name:'list_notes',arguments:{}}); yield x.ev; r=await x.p; assert.ok(r.content.includes('ok'));
    yield {type:'text',text:'done'};
  };
  let confirms=0;
  const cs=[]; for await (const m of c.agentStream(creq,{})){ cs.push(m.status);
    if(m.status===8){ const d=JSON.parse(m.actionDetails); assert.equal(d.actions[0].name,'send_message'); assert.equal(d.actions[0].params.text,'hi'); assert.ok(m.confirmationId); confirms++;
      const ok=await c.agentConfirmAction(confirms===1?{confirmationId:m.confirmationId,approved:false}:{confirmationId:m.confirmationId,approved:true,updatedInput:'{"text":"hello!"}'}); assert.ok(ok.success); }
    if(m.status===9){const d=JSON.parse(m.actionDetails);
      if(d.toolName==='send_message'){ assert.equal(d.args.text,'hello!'); await c.agentMcpToolResult({executionId:d.executionId,resultJson:'{"sent":true}'}); continue; }
      assert.equal(d.toolName,'list_notes'); assert.equal(d.serverId,'voiceos_notes'); await c.agentMcpToolResult({executionId:d.executionId,resultJson:'{"ok":true}'});} }
  assert.equal(confirms,2);
  assert.equal(cs.at(-1),7); console.log('catalog ok');
  // risky computer-use clicks wait for the approval card
  impl=async function*(){ const call=async(args)=>{let respond;const p=new Promise(r=>respond=r);return {ev:{type:'tool',name:'mac_act',args,respond},p};};
    let x=await call({action:'press',element:1}); yield x.ev; let r=await x.p; assert.equal(r.content,'Done');
    x=await call({action:'press',element:2,risky:true}); yield x.ev; r=await x.p; assert.ok(r.content.includes('declined'), r.content); assert.equal(clicked,0);
    x=await call({action:'press',element:2,risky:true}); yield x.ev; r=await x.p; assert.equal(r.content,'Done: clicked Send'); assert.equal(clicked,1);
    yield {type:'text',text:'sent'}; };
  let asks=0; const rs=[];
  for await (const m of c.agentStream(protobuf.create(ASR,{textInput:'send it'}),{})){ rs.push(m.status);
    if(m.status===8){ asks++; const d=JSON.parse(m.actionDetails); assert.equal(d.actions[0].params.button,'Send'); assert.equal(m.message,'Click “Send”'); await c.agentConfirmAction({confirmationId:m.confirmationId,approved:asks===2}); } }
  assert.equal(asks,2); assert.equal(rs.at(-1),7); console.log('risky click approval ok');
  console.log('ALL PASSED');
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
