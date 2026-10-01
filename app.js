const $=s=>document.querySelector(s);let tone='Inspiring',current=0,project=null,timer=null,voices=[];
$('#tones').onclick=e=>{if(e.target.tagName==='BUTTON'){[...$('#tones').children].forEach(b=>b.classList.remove('active'));e.target.classList.add('active');tone=e.target.textContent}}
const templates={Motivation:['Your comeback starts with one decision.','Failure is not the end. It is information.','Take one small step today, even if nobody sees it.','Consistency turns tiny actions into a different life.','Start again. This time, with everything you learned.'],'Life Advice':['One simple lesson can change your day.','Stop waiting for the perfect moment.','Protect your time and choose what matters.','Small choices become your future.','Make today count.'],Facts:['Here is something you may not know.','The surprising part is this.','Most people miss this detail.','Now connect the pieces.','Follow for another quick fact.'],Story:['It started like an ordinary day.','Then one decision changed everything.','The easy choice was to quit.','Instead, a new path appeared.','Sometimes the ending begins with starting again.'],Business:['Want a smarter way to grow?','Focus on one painful customer problem.','Make the solution simple to understand.','Test it before you spend heavily.','Build what people prove they want.'],Fitness:['Your next workout does not need to be perfect.','Show up and start small.','Good form beats ego.','Repeat the basics consistently.','Progress comes from the days you nearly skipped.'],Kids:['Every big adventure starts with curiosity.','Try something new and ask questions.','Mistakes help your brain learn.','Kindness makes every team stronger.','Keep learning, exploring and smiling.']};
const icons=['🌅','🧠','👣','🔥','✨','🚀','💡'];
function generate(){stop();const idea=$('#idea').value.trim()||'A powerful short video',style=$('#style').value,dur=+$('#duration').value;let lines=[...(templates[style]||templates.Motivation)],n=dur<=15?3:dur<=30?5:dur<=45?6:7;while(lines.length<n)lines.splice(lines.length-1,0,'Keep moving forward, one choice at a time.');lines=lines.slice(0,n);lines[0]+=` This is about ${idea.replace(/^(a|an)\s+/i,'').toLowerCase()}.`;project={idea,style,tone,duration:dur,hook:lines[0],lines,scenes:lines.map((caption,i)=>({caption,visual:`${style} scene ${i+1}`,seconds:+(dur/n).toFixed(2)}))};render()}
function render(){current=0;$('#empty').hidden=true;$('#project').hidden=false;$('#hook').value=project.hook;$('#script').value=project.lines.join(' ');renderScenes();showScene()}
function renderScenes(){$('#scenes').innerHTML=project.scenes.map((s,i)=>`<div class='scene'><b>Scene ${i+1} • ${s.seconds}s</b><textarea data-i='${i}' rows='2'>${s.caption}</textarea></div>`).join('');document.querySelectorAll('#scenes textarea').forEach(t=>t.oninput=()=>{project.scenes[+t.dataset.i].caption=t.value;if(+t.dataset.i===current)showScene()})}
function showScene(){const s=project?.scenes[current];if(!s)return;$('#caption').textContent=s.caption;$('#sceneIcon').textContent=icons[current%icons.length];$('#sceneCount').textContent=`Scene ${current+1} / ${project.scenes.length}`}
function stop(){clearTimeout(timer);timer=null;$('#progress').style.width='0';speechSynthesis.cancel()}
function playScene(i){if(!project||i>=project.scenes.length){stop();return}current=i;showScene();let ms=project.scenes[i].seconds*1000,start=performance.now();const tick=()=>{let p=Math.min(1,(performance.now()-start)/ms);$('#progress').style.width=(p*100)+'%';if(p<1&&timer)requestAnimationFrame(tick)};timer=setTimeout(()=>playScene(i+1),ms);requestAnimationFrame(tick)}
function speak(){if(!project)return; speechSynthesis.cancel();let u=new SpeechSynthesisUtterance($('#script').value);let idx=+$('#voiceSelect').value;if(voices[idx])u.voice=voices[idx];u.rate=tone==='Energetic'?1.12:tone==='Calm'?.9:1; speechSynthesis.speak(u)}
function loadVoices(){voices=speechSynthesis.getVoices();$('#voiceSelect').innerHTML='<option value="-1">Default browser voice</option>'+voices.map((v,i)=>`<option value='${i}'>${v.name} (${v.lang})</option>`).join('')}loadVoices();speechSynthesis.onvoiceschanged=loadVoices;
$('#generate').onclick=generate;$('#prev').onclick=()=>{if(project){current=(current-1+project.scenes.length)%project.scenes.length;showScene()}};$('#next').onclick=()=>{if(project){current=(current+1)%project.scenes.length;showScene()}};$('#play').onclick=()=>{stop();playScene(0)};$('#voice').onclick=speak;
$('#captionStyle').onchange=e=>{$('#caption').classList.remove('clean','boxed');if(e.target.value!=='bold')$('#caption').classList.add(e.target.value)};$('#captionPosition').onchange=e=>{$('#caption').classList.remove('top','middle');if(e.target.value!=='bottom')$('#caption').classList.add(e.target.value)};
$('#volume').oninput=e=>{ $('#volLabel').textContent=e.target.value+'%'; $('#musicAudio').volume=e.target.value/100 };
let musicObjectUrl=null;

let narrationObjectUrl=null;
const NARRATION_DB='shortforge-audio',NARRATION_STORE='audio';
function narrationDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(NARRATION_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(NARRATION_STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveNarrationBlob(blob){const db=await narrationDb();return new Promise((resolve,reject)=>{const tx=db.transaction(NARRATION_STORE,'readwrite');tx.objectStore(NARRATION_STORE).put(blob,'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function restoreNarrationBlob(){try{const db=await narrationDb(),blob=await new Promise((resolve,reject)=>{const tx=db.transaction(NARRATION_STORE,'readonly'),r=tx.objectStore(NARRATION_STORE).get('latest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(!blob)return;if(narrationObjectUrl)URL.revokeObjectURL(narrationObjectUrl);narrationObjectUrl=URL.createObjectURL(blob);const a=$('#narrationAudio');a.src=narrationObjectUrl;a.volume=+$('#narrVolume').value/100;$('#narrationName').textContent='AI narration • restored';updateReadiness()}catch(e){console.warn('Narration restore failed',e)}}
async function clearSavedNarration(){try{const db=await narrationDb();const tx=db.transaction(NARRATION_STORE,'readwrite');tx.objectStore(NARRATION_STORE).delete('latest')}catch(e){console.warn(e)}}
$('#narrVolume').oninput=e=>{ $('#narrVolLabel').textContent=e.target.value+'%'; $('#narrationAudio').volume=e.target.value/100 };
$('#narration').onchange=e=>{const f=e.target.files[0];if(!f)return;if(narrationObjectUrl)URL.revokeObjectURL(narrationObjectUrl);narrationObjectUrl=URL.createObjectURL(f);const a=$('#narrationAudio');a.src=narrationObjectUrl;a.volume=+$('#narrVolume').value/100;$('#narrationName').textContent=f.name};
$('#narrPlay').onclick=async()=>{const a=$('#narrationAudio');if(!a.src)return alert('Choose a narration audio file first.');if(a.paused){await a.play();$('#narrPlay').textContent='⏸ Narration'}else{a.pause();$('#narrPlay').textContent='▶ Narration'}};
$('#narrClear').onclick=()=>{const a=$('#narrationAudio');a.pause();a.removeAttribute('src');a.load();$('#narration').value='';$('#narrationName').textContent='No narration selected';$('#narrPlay').textContent='▶ Narration';if(narrationObjectUrl){URL.revokeObjectURL(narrationObjectUrl);narrationObjectUrl=null}clearSavedNarration()};

$('#music').onchange=e=>{const f=e.target.files[0];if(!f)return;if(musicObjectUrl)URL.revokeObjectURL(musicObjectUrl);musicObjectUrl=URL.createObjectURL(f);const a=$('#musicAudio');a.src=musicObjectUrl;a.volume=+$('#volume').value/100;$('#musicName').textContent=f.name};
$('#musicPlay').onclick=async()=>{const a=$('#musicAudio');if(!a.src)return alert('Choose an audio file first.');if(a.paused){await a.play();$('#musicPlay').textContent='⏸ Music'}else{a.pause();$('#musicPlay').textContent='▶ Music'}};
$('#musicClear').onclick=()=>{const a=$('#musicAudio');a.pause();a.removeAttribute('src');a.load();$('#music').value='';$('#musicName').textContent='No music selected';$('#musicPlay').textContent='▶ Music';if(musicObjectUrl){URL.revokeObjectURL(musicObjectUrl);musicObjectUrl=null}};
$('#media').onchange=e=>{let f=e.target.files[0];if(!f)return;let url=URL.createObjectURL(f),img=$('#imageMedia'),vid=$('#videoMedia');img.hidden=vid.hidden=true;$('#sceneIcon').style.opacity=.15;if(f.type.startsWith('video/')){vid.src=url;vid.hidden=false;vid.play()}else{img.src=url;img.hidden=false}}
$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#script').value);$('#copy').textContent='Copied!';setTimeout(()=>$('#copy').textContent='Copy Script',1200)};
function dl(name,text,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#download').onclick=()=>{if(!project)return;project.hook=$('#hook').value;project.script=$('#script').value;dl('shortforge-project.json',JSON.stringify(project,null,2),'application/json')};
$('#srt').onclick=()=>{if(!project)return;let t=0,s='';project.scenes.forEach((x,i)=>{let end=t+Number(x.seconds),f=n=>new Date(n*1000).toISOString().slice(11,23).replace('.',',');s+=`${i+1}\n${f(t)} --> ${f(end)}\n${x.caption}\n\n`;t=end});dl('shortforge-captions.srt',s)};
$('#record').onclick=async()=>{if(!project)return alert('Browser-only recording needs canvas rendering. This MVP keeps the button as the integration point for FFmpeg/WebCodecs in the next build. Your project and SRT exports are ready now.')};
generate();

// v3 local video renderer: records a real 1080x1920 WebM using Canvas + MediaRecorder.
function wrapCanvasText(ctx,text,maxWidth){const words=text.split(/\s+/);let lines=[],line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);return lines}
function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawCover(ctx,el,W,H){if(!el)return false;let sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight;if(!sw||!sh)return false;let scale=Math.max(W/sw,H/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage(el,(W-dw)/2,(H-dh)/2,dw,dh);return true}
function drawRenderFrame(sceneIndex,sceneProgress){const c=$('#renderCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height;const s=project.scenes[sceneIndex];ctx.clearRect(0,0,W,H);let media=null;if(!$('#videoMedia').hidden&&$('#videoMedia').readyState>=2)media=$('#videoMedia');else if(!$('#imageMedia').hidden&&$('#imageMedia').complete)media=$('#imageMedia');if(!drawCover(ctx,media,W,H)){let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#111827');g.addColorStop(.55,'#312e81');g.addColorStop(1,'#7c3aed');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.font='260px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icons[sceneIndex%icons.length],W/2,H*.39)}ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(0,0,W,H);const pos=$('#captionPosition').value,style=$('#captionStyle').value;let y=pos==='top'?300:pos==='middle'?850:1370;ctx.font='700 74px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='top';let lines=wrapCanvasText(ctx,s.caption,W-150).slice(0,6),lh=92,total=lines.length*lh;if(style==='boxed'){ctx.fillStyle='rgba(0,0,0,.68)';roundedRect(ctx,55,y-35,W-110,total+70,34)}for(let i=0;i<lines.length;i++){if(style==='bold'){ctx.lineWidth=14;ctx.strokeStyle='rgba(0,0,0,.78)';ctx.strokeText(lines[i],W/2,y+i*lh)}ctx.fillStyle='white';ctx.fillText(lines[i],W/2,y+i*lh)}ctx.font='600 36px Arial, sans-serif';ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText('ShortForge AI',54,H-105);ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(54,H-62,W-108,12);ctx.fillStyle='white';let overall=(sceneIndex+sceneProgress)/project.scenes.length;ctx.fillRect(54,H-62,(W-108)*overall,12)}
async function exportVideo(){
 if(!project)return;const btn=$('#record'),status=$('#exportStatus'),canvas=$('#renderCanvas');
 if(!window.MediaRecorder||!canvas.captureStream)return alert('Video export needs a recent Chrome or Edge browser.');
 btn.disabled=true;btn.textContent='Rendering…';status.className='exportStatus working';status.textContent='Preparing video, narration and music…';
 const videoStream=canvas.captureStream(30),output=new MediaStream(videoStream.getVideoTracks());
 const music=$('#musicAudio'),narr=$('#narrationAudio');let audioCtx=null;let hadMusic=!!music.src,hadNarr=!!narr.src;
 try{
   if(hadMusic||hadNarr){
     audioCtx=new (window.AudioContext||window.webkitAudioContext)();const dest=audioCtx.createMediaStreamDestination();
     if(hadNarr){const ns=audioCtx.createMediaElementSource(narr),ng=audioCtx.createGain();ng.gain.value=+$('#narrVolume').value/100;ns.connect(ng);ng.connect(dest);ng.connect(audioCtx.destination);narr.currentTime=0;await narr.play();}
     if(hadMusic){const ms=audioCtx.createMediaElementSource(music),mg=audioCtx.createGain();mg.gain.value=(+$('#volume').value/100)*(hadNarr ? .28 : 1);ms.connect(mg);mg.connect(dest);mg.connect(audioCtx.destination);music.currentTime=0;music.loop=true;await music.play();}
     dest.stream.getAudioTracks().forEach(t=>output.addTrack(t));await audioCtx.resume();
   }
   const candidates=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
   let mime=candidates.find(x=>MediaRecorder.isTypeSupported(x))||'',opts=mime?{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:192000}:undefined;
   const rec=new MediaRecorder(output,opts),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};let done=new Promise(r=>rec.onstop=r);rec.start(250);
   let dur=project.scenes.reduce((a,s)=>a+Number(s.seconds),0)*1000,start=performance.now();
   function frame(now){let elapsed=Math.min(now-start,dur),sec=elapsed/1000,acc=0,idx=0,local=0;for(let i=0;i<project.scenes.length;i++){let d=Number(project.scenes[i].seconds);if(sec<=acc+d||i===project.scenes.length-1){idx=i;local=Math.max(0,Math.min(1,(sec-acc)/d));break}acc+=d}drawRenderFrame(idx,local);let audio=[];if(hadNarr)audio.push('narration');if(hadMusic)audio.push('music');status.textContent=`Rendering ${Math.min(100,Math.round(elapsed/dur*100))}%${audio.length?' • mixing '+audio.join(' + '):''}…`;if(elapsed<dur)requestAnimationFrame(frame);else setTimeout(()=>rec.stop(),150)}
   requestAnimationFrame(frame);await done;if(hadMusic)music.pause();if(hadNarr)narr.pause();
   let blob=new Blob(chunks,{type:mime||'video/webm'});window.shortForgeLastWebM=blob;let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shortforge-final-short.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
   status.className='exportStatus done';status.textContent=`Exported successfully${hadNarr?' with narration':''}${hadMusic?' + ducked background music':''}.`;
 }catch(err){console.error(err);status.className='exportStatus';status.textContent='Export failed: '+err.message}
 finally{music.pause();narr.pause();if(audioCtx)try{await audioCtx.close()}catch(e){}btn.disabled=false;btn.textContent='⬇ Export Video'}
}
$('#record').onclick=exportVideo;


// v6 product upgrades: generated visual themes, autosave, project import, and clearer export readiness.
const visualThemes={
 Motivation:['#172554','#4c1d95','#be185d'], 'Life Advice':['#0f172a','#164e63','#0f766e'], Facts:['#111827','#1d4ed8','#0891b2'], Story:['#1f2937','#7c2d12','#9f1239'], Business:['#111827','#1e3a8a','#065f46'], Fitness:['#18181b','#991b1b','#c2410c'], Kids:['#312e81','#7e22ce','#db2777']
};
function applyGeneratedBackground(sceneIndex){
 const colors=visualThemes[project?.style]||visualThemes.Motivation, v=$('#video');
 if($('#imageMedia').hidden && $('#videoMedia').hidden){
   const a=colors[sceneIndex%colors.length],b=colors[(sceneIndex+1)%colors.length];
   v.style.background=`radial-gradient(circle at 50% 28%, ${b}, transparent 42%),linear-gradient(145deg,${a},#090b10 72%)`;
 }
}
const oldShowScene=showScene;showScene=function(){oldShowScene();if(project)applyGeneratedBackground(current)};
const oldRender=render;render=function(){oldRender();persistProject();updateReadiness()};
function persistProject(){if(!project)return;project.hook=$('#hook')?.value||project.hook;project.script=$('#script')?.value||project.lines?.join(' ')||'';project.captionStyle=$('#captionStyle')?.value||'bold';project.captionPosition=$('#captionPosition')?.value||'bottom';localStorage.setItem('shortforge-v6-project',JSON.stringify(project));}
function updateReadiness(){const el=$('#readiness');if(!el)return;let items=[];items.push('✓ Script');items.push('✓ '+(project?.scenes?.length||0)+' scenes');items.push($('#narrationAudio').src?'✓ Narration':'○ Narration optional');items.push($('#musicAudio').src?'✓ Music':'○ Music optional');el.textContent=items.join('   •   ')}
['hook','script','captionStyle','captionPosition'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener('input',()=>{persistProject();updateReadiness()})});
$('#scenes').addEventListener('input',()=>{persistProject();updateReadiness()});
$('#narration').addEventListener('change',updateReadiness);$('#music').addEventListener('change',updateReadiness);
$('#narrClear').addEventListener('click',updateReadiness);$('#musicClear').addEventListener('click',updateReadiness);
$('#importProject').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.scenes||!data.duration)throw new Error('Not a ShortForge project');project=data;$('#idea').value=data.idea||'';$('#style').value=data.style||'Motivation';$('#duration').value=String(data.duration||30);render();if(data.script)$('#script').value=data.script;if(data.captionStyle)$('#captionStyle').value=data.captionStyle;if(data.captionPosition)$('#captionPosition').value=data.captionPosition;showScene();persistProject()}catch(err){alert('Could not open project: '+err.message)}};
$('#restore').onclick=()=>{try{const data=JSON.parse(localStorage.getItem('shortforge-v6-project'));if(!data)return alert('No saved browser project yet.');project=data;$('#idea').value=data.idea||'';$('#style').value=data.style||'Motivation';$('#duration').value=String(data.duration||30);render();if(data.script)$('#script').value=data.script;showScene()}catch(e){alert('Saved project could not be restored.')}};
window.addEventListener('beforeunload',persistProject);
updateReadiness();

// v7: backend-aware product shell. Local mode remains the default fallback.
(async function v7(){
 const status=document.createElement('div');status.id='cloudStatus';status.className='cloudStatus';
 const header=document.querySelector('header')||document.body.firstElementChild; if(header) header.appendChild(status);
 const h=await ShortForgeAPI.health(); status.textContent=h.online?'● Backend connected':'● Local mode';status.classList.toggle('online',!!h.online);
 window.shortForgeBackend=h;
 const gen=$('#generate'); if(gen){const localGenerate=gen.onclick;gen.onclick=async()=>{
   if(!window.shortForgeBackend?.online){return localGenerate.call(gen)}
   const payload={idea:$('#idea').value.trim(),style:$('#style').value,tone:tone,duration:Number($('#duration').value)};
   if(!payload.idea)return alert('Enter a video idea first.');
   gen.disabled=true;const old=gen.textContent;gen.textContent='Generating…';
   try{const data=await ShortForgeAPI.generate(payload);if(data.project){project=data.project;render();showScene();persistProject()}else localGenerate.call(gen)}
   catch(e){console.warn(e);localGenerate.call(gen)}finally{gen.disabled=false;gen.textContent=old}
 }}
 const box=document.querySelector('.editorHead');if(box){const badge=document.createElement('span');badge.className='v7badge';badge.textContent='v7';box.appendChild(badge)}
})();

// v8: real provider-backed narration and stock-video automation.
(function v8(){
 const aiVoice=$('#aiVoice'),stockSearch=$('#stockSearch'),autoStatus=$('#automationStatus'),results=$('#stockResults');let aiNarrationUrl=null;
 function setAuto(msg){if(autoStatus)autoStatus.textContent=msg}
 if(aiVoice)aiVoice.onclick=async()=>{if(!project)return alert('Generate a short first.');if(!window.shortForgeBackend?.online)return alert('Start the ShortForge backend first.');aiVoice.disabled=true;setAuto('Generating narration…');try{const text=$('#script').value.trim()||project.scenes.map(s=>s.caption).join(' '),blob=await ShortForgeAPI.tts(text);if(aiNarrationUrl)URL.revokeObjectURL(aiNarrationUrl);aiNarrationUrl=URL.createObjectURL(blob);await saveNarrationBlob(blob);const a=$('#narrationAudio');a.src=aiNarrationUrl;a.volume=+$('#narrVolume').value/100;$('#narrationName').textContent='AI narration • generated';setAuto('✓ AI narration generated and ready for export.');updateReadiness()}catch(e){setAuto('AI voice unavailable: '+e.message)}finally{aiVoice.disabled=false}};
 if(stockSearch)stockSearch.onclick=async()=>{if(!window.shortForgeBackend?.online)return alert('Start the ShortForge backend first.');const q=($('#idea').value||project?.idea||'').trim();if(!q)return alert('Enter a video idea first.');stockSearch.disabled=true;setAuto('Searching portrait stock clips…');results.innerHTML='';try{const data=await ShortForgeAPI.media(q);setAuto(`✓ Found ${data.items.length} portrait clips. Videos provided by Pexels.`);results.innerHTML=data.items.map((x,i)=>`<div class="stockCard"><img src="${x.image}" alt="Stock clip ${i+1}"><div class="stockCredit">${x.creator}</div><button class="secondary useStock" data-i="${i}">Use clip</button></div>`).join('');results.querySelectorAll('.useStock').forEach(b=>b.onclick=()=>{const x=data.items[+b.dataset.i],vid=$('#videoMedia'),img=$('#imageMedia');img.hidden=true;vid.hidden=false;vid.crossOrigin='anonymous';vid.src=ShortForgeAPI.mediaProxy(x.url);vid.loop=true;vid.muted=true;vid.play().catch(()=>{});$('#sceneIcon').style.opacity=.15;setAuto('✓ Stock clip loaded. It will be used in preview and browser export.')})}catch(e){setAuto('Stock media unavailable: '+e.message)}finally{stockSearch.disabled=false}};
 const wait=setInterval(()=>{if(window.shortForgeBackend){clearInterval(wait);const h=window.shortForgeBackend;if(h.online)setAuto(`Backend connected • AI voice ${h.voiceConfigured?'ready':'needs key'} • stock media ${h.mediaConfigured?'ready':'needs key'}`)}},150);
})();


// v9: scene-by-scene stock media + real server MP4/H.264 transcoding.
(function v9(){
 const auto=$('#autoScenes'),mp4=$('#mp4'),status=$('#automationStatus');
 const setStatus=m=>{if(status)status.textContent=m};
 async function attachSceneVideo(scene,item){
   scene.media={provider:'pexels',creator:item.creator,page:item.page,url:item.url,preview:item.image};
   const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.crossOrigin='anonymous';v.preload='auto';v.src=ShortForgeAPI.mediaProxy(item.url);v.style.display='none';document.body.appendChild(v);scene._videoEl=v;
   try{await v.play();v.pause();v.currentTime=0}catch(e){}
 }
 if(auto)auto.onclick=async()=>{
   if(!project)return alert('Generate a short first.');if(!window.shortForgeBackend?.online)return alert('Start the ShortForge backend first.');
   auto.disabled=true;let filled=0;
   try{
     for(let i=0;i<project.scenes.length;i++){
       setStatus(`Finding media for scene ${i+1} of ${project.scenes.length}…`);
       const q=(project.scenes[i].visual||project.scenes[i].caption||project.idea).slice(0,100);
       try{const data=await ShortForgeAPI.media(q);if(data.items?.[0]){await attachSceneVideo(project.scenes[i],data.items[0]);filled++}}catch(e){console.warn('Scene media',i,e)}
     }
     persistProject();showScene();setStatus(`✓ Added automatic stock video to ${filled}/${project.scenes.length} scenes. Videos provided by Pexels.`);
   } finally {auto.disabled=false}
 };
 const baseShow=showScene;showScene=function(){baseShow();const scene=project?.scenes?.[current];if(scene?._videoEl){const vid=$('#videoMedia'),img=$('#imageMedia');img.hidden=true;vid.hidden=false;vid.crossOrigin='anonymous';if(vid.src!==scene._videoEl.src)vid.src=scene._videoEl.src;vid.muted=true;vid.loop=true;vid.play().catch(()=>{});$('#sceneIcon').style.opacity=.12}else if(scene?.media?.url&&window.shortForgeBackend?.online){const vid=$('#videoMedia');$('#imageMedia').hidden=true;vid.hidden=false;vid.crossOrigin='anonymous';vid.src=ShortForgeAPI.mediaProxy(scene.media.url);vid.play().catch(()=>{})}};
 const baseDraw=drawRenderFrame;drawRenderFrame=function(sceneIndex,sceneProgress){const scene=project?.scenes?.[sceneIndex],globalVid=$('#videoMedia');if(scene?._videoEl&&scene._videoEl.readyState>=2){const oldHidden=globalVid.hidden;globalVid.hidden=true;const c=$('#renderCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height,s=scene;ctx.clearRect(0,0,W,H);drawCover(ctx,scene._videoEl,W,H);ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(0,0,W,H);const pos=$('#captionPosition').value,style=$('#captionStyle').value;let y=pos==='top'?300:pos==='middle'?850:1370;ctx.font='700 74px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='top';let lines=wrapCanvasText(ctx,s.caption,W-150).slice(0,6),lh=92,total=lines.length*lh;if(style==='boxed'){ctx.fillStyle='rgba(0,0,0,.68)';roundedRect(ctx,55,y-35,W-110,total+70,34)}for(let i=0;i<lines.length;i++){if(style==='bold'){ctx.lineWidth=14;ctx.strokeStyle='rgba(0,0,0,.78)';ctx.strokeText(lines[i],W/2,y+i*lh)}ctx.fillStyle='white';ctx.fillText(lines[i],W/2,y+i*lh)}ctx.font='600 36px Arial, sans-serif';ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText('ShortForge AI',54,H-105);ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(54,H-62,W-108,12);ctx.fillStyle='white';ctx.fillRect(54,H-62,(W-108)*((sceneIndex+sceneProgress)/project.scenes.length),12);globalVid.hidden=oldHidden;return}baseDraw(sceneIndex,sceneProgress)};
 if(mp4)mp4.onclick=async()=>{
   if(!window.shortForgeBackend?.online)return alert('Start the ShortForge backend first.');if(!window.shortForgeBackend?.renderConfigured)return alert('FFmpeg is not available on the ShortForge server.');
   if(!window.shortForgeLastWebM){setStatus('Create the browser video first with Export Video, then click Export MP4.');return}
   mp4.disabled=true;const old=mp4.textContent;mp4.textContent='Converting…';setStatus('Converting WebM to MP4/H.264 on the server…');
   try{const blob=await ShortForgeAPI.render(window.shortForgeLastWebM),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shortforge-final-short.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);setStatus('✓ MP4/H.264 exported successfully.')}catch(e){setStatus('MP4 export failed: '+e.message)}finally{mp4.disabled=false;mp4.textContent=old}
 };
 const wait=setInterval(()=>{if(window.shortForgeBackend){clearInterval(wait);const h=window.shortForgeBackend;if(h.online)setStatus(`Backend connected • AI voice ${h.voiceConfigured?'ready':'needs key'} • stock ${h.mediaConfigured?'ready':'needs key'} • MP4 ${h.renderConfigured?'ready':'needs FFmpeg'}`)}},200);
})();


// Public-launch layer: accounts, authenticated sessions, quotas and online project storage.
(function launchLayer(){
 const accountBtn=$('#accountBtn'),auth=$('#authDialog'),authTitle=$('#authTitle'),nameWrap=$('#nameWrap'),authSubmit=$('#authSubmit'),authSwitch=$('#authSwitch'),authError=$('#authError'),cloudSave=$('#cloudSave'),cloudProjects=$('#cloudProjects'),projectsDialog=$('#projectsDialog'),list=$('#cloudProjectList'),quota=$('#quotaBox');
 let mode='login',user=null,currentCloudId=null;
 function snapshot(){if(!project)return null;project.hook=$('#hook').value;project.script=$('#script').value;project.captionStyle=$('#captionStyle').value;project.captionPosition=$('#captionPosition').value;return JSON.parse(JSON.stringify(project,(k,v)=>k.startsWith('_')?undefined:v))}
 function updateAccount(){accountBtn.textContent=user?`👤 ${user.name}`:'Sign in';cloudSave.disabled=!user;cloudProjects.disabled=!user}
 function showAuth(next='login'){mode=next;authTitle.textContent=mode==='login'?'Sign in':'Create account';nameWrap.hidden=mode==='login';authSubmit.textContent=mode==='login'?'Sign in':'Create account';authSwitch.textContent=mode==='login'?'Create an account':'Already have an account? Sign in';authError.textContent='';auth.showModal()}
 accountBtn.onclick=async()=>{if(!window.shortForgeBackend?.online)return alert('Start ShortForge in server mode to use accounts.');if(!user)return showAuth();if(confirm(`Signed in as ${user.email}. Sign out?`)){await ShortForgeAPI.logout();user=null;currentCloudId=null;updateAccount();window.shortForgeBackend=await ShortForgeAPI.health()}};
 authSwitch.onclick=()=>showAuth(mode==='login'?'signup':'login');authSubmit.onclick=async()=>{authError.textContent='';authSubmit.disabled=true;try{const email=$('#authEmail').value.trim(),password=$('#authPassword').value,data=mode==='login'?await ShortForgeAPI.login(email,password):await ShortForgeAPI.signup($('#authName').value.trim(),email,password);user=data.user;auth.close();updateAccount();window.shortForgeBackend=await ShortForgeAPI.health()}catch(e){authError.textContent=e.message}finally{authSubmit.disabled=false}};
 cloudSave.onclick=async()=>{if(!user)return showAuth();const data=snapshot();if(!data)return alert('Generate a short first.');cloudSave.disabled=true;const old=cloudSave.textContent;cloudSave.textContent='Saving…';try{let r;if(currentCloudId)r=await ShortForgeAPI.updateProject(currentCloudId,data,data.idea);else{r=await ShortForgeAPI.saveProject(data,data.idea);currentCloudId=r.project.id}cloudSave.textContent='✓ Saved';setTimeout(()=>cloudSave.textContent=old,1300)}catch(e){alert('Online save failed: '+e.message);cloudSave.textContent=old}finally{cloudSave.disabled=false}};
 async function refreshProjects(){list.innerHTML='<div class="note">Loading…</div>';try{const [p,m]=await Promise.all([ShortForgeAPI.projects(),ShortForgeAPI.me()]);quota.innerHTML=`Daily usage: AI/media <b>${m.quota.ai.used}/${m.quota.ai.limit}</b> • MP4 renders <b>${m.quota.render.used}/${m.quota.render.limit}</b>`;list.innerHTML=p.projects.length?p.projects.map(x=>`<div class="cloudProject"><div><b>${escapeHtml(x.name)}</b><small>${new Date(x.updatedAt).toLocaleString()}</small></div><div><button class="secondary loadCloud" data-id="${x.id}">Open</button><button class="secondary deleteCloud" data-id="${x.id}">Delete</button></div></div>`).join(''):'<div class="emptyMini">No online projects yet.</div>';list.querySelectorAll('.loadCloud').forEach(b=>b.onclick=async()=>{const r=await ShortForgeAPI.loadProject(b.dataset.id);project=r.project.data;currentCloudId=r.project.id;$('#idea').value=project.idea||'';$('#style').value=project.style||'Motivation';$('#duration').value=String(project.duration||30);render();if(project.script)$('#script').value=project.script;if(project.captionStyle)$('#captionStyle').value=project.captionStyle;if(project.captionPosition)$('#captionPosition').value=project.captionPosition;showScene();persistProject();projectsDialog.close()});list.querySelectorAll('.deleteCloud').forEach(b=>b.onclick=async()=>{if(confirm('Delete this online project?')){await ShortForgeAPI.deleteProject(b.dataset.id);if(currentCloudId===b.dataset.id)currentCloudId=null;refreshProjects()}})}catch(e){list.innerHTML=`<div class="error">${escapeHtml(e.message)}</div>`}}
 function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 cloudProjects.onclick=()=>{if(!user)return showAuth();projectsDialog.showModal();refreshProjects()};$('#projectsClose').onclick=()=>projectsDialog.close();
 const wait=setInterval(()=>{if(window.shortForgeBackend){clearInterval(wait);user=window.shortForgeBackend.user||null;updateAccount()}},100);updateAccount();
})();

window.addEventListener('DOMContentLoaded',()=>restoreNarrationBlob());
