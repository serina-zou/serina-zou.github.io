const world=document.querySelector('#world'),cat=document.querySelector('#cat'),menu=document.querySelector('#menu'),status=document.querySelector('#status'),cursor=document.querySelector('.lemon'),stop=document.querySelector('#stop'),canvas=cat.querySelector('canvas'),ctx=canvas.getContext('2d');
canvas.width=480;canvas.height=480;
const hdWalkRight=new Image(),hdWalkLeft=new Image();hdWalkRight.src='lemon-walk-hd-right.png';hdWalkLeft.src='lemon-walk-hd-left.png';
const hdRunRight=new Image(),hdRunLeft=new Image();hdRunRight.src='lemon-run-hd-right.png';hdRunLeft.src='lemon-run-hd-left.png';
const smoothSheets=['walk','run','groom','reach'].map(name=>{const im=new Image();im.src='lemon-smooth-'+name+(name==='reach'?'-spaced':'')+'.png';return im;});let smoothWalk=[],smoothWalkLeft=[],smoothRun=[],smoothRunLeft=[],smoothGroom=[],smoothReach=[],smoothReachLeft=[];
const neckSheet=new Image();neckSheet.src='lemon-neck-underlay.png';let neckUnderlay;const approvedSheet=new Image(),feedingSheet=new Image(),approvedLeftSheet=new Image();approvedSheet.src='lemon-approved-reference.png';feedingSheet.src='lemon-approved-feeding.png';approvedLeftSheet.src='lemon-approved-left.png';let approved=[],feeding=[],approvedLeft=[],approvedDims=[],feedingDims=[];
const sheet=new Image();sheet.src='lemon-face-base.png';
let frames=[],scale=1,state='wander',hover=false,x=70,y=80,tx=300,ty=100,facing=1,clock=0,last=performance.now(),nextWander=0,tilt=0,chewUntil=0,px=-1000,py=-1000,inside=false,touching=false,lastFed=-10,meals=0,currentFrame=0,previousFrame=0,changedAt=0;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
// Render only the main connected character in each cell, dropping isolated sprite debris.
function extract(sheet,count=8,alphaCutoff=45){
 const frames=[];
 const full=document.createElement('canvas');full.width=sheet.width;full.height=sheet.height;const g=full.getContext('2d');g.drawImage(sheet,0,0);
 const W=sheet.width,H=sheet.height,image=g.getImageData(0,0,W,H),pixels=image.data,seen=new Uint8Array(W*H),components=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||pixels[p*4+3]<alphaCutoff)continue;
  const queue=[p];seen[p]=1;let l=W,t=H,r=0,b=0;
  for(let k=0;k<queue.length;k++){
   const q=queue[k],qx=q%W,qy=Math.floor(q/W);l=Math.min(l,qx);r=Math.max(r,qx);t=Math.min(t,qy);b=Math.max(b,qy);
   for(const v of [qx>0?q-1:-1,qx<W-1?q+1:-1,q-W,q+W])if(v>=0&&v<seen.length&&!seen[v]&&pixels[v*4+3]>=alphaCutoff){seen[v]=1;queue.push(v)}
  }
  if(queue.length>2500)components.push({queue,l,t,r,b,cx:(l+r)/2,cy:(t+b)/2});
 }
 const main=components.sort((a,b)=>b.queue.length-a.queue.length).slice(0,count||components.length).sort((a,b)=>a.cy-b.cy),ordered=[];
 const heights=main.map(p=>p.b-p.t).sort((a,b)=>a-b),threshold=heights[Math.floor(heights.length/2)]*.6,rows=[];for(const part of main){let row=rows[rows.length-1];if(!row||part.cy-row.cy>threshold){row={cy:part.cy,parts:[]};rows.push(row);}row.parts.push(part);}for(const row of rows)ordered.push(...row.parts.sort((a,b)=>a.cx-b.cx));
 for(const part of ordered){
  const w=part.r-part.l+1,h=part.b-part.t+1,c=document.createElement('canvas');c.width=w+16;c.height=h+16;
  const cg=c.getContext('2d'),clean=cg.createImageData(c.width,c.height);
  for(const q of part.queue){const dx=q%W-part.l+8,dy=Math.floor(q/W)-part.t+8,from=q*4,to=(dy*c.width+dx)*4;clean.data[to]=pixels[from];clean.data[to+1]=pixels[from+1];clean.data[to+2]=pixels[from+2];clean.data[to+3]=pixels[from+3];}
  cg.putImageData(clean,0,0);frames.push({c,l:0,t:0,w:c.width,h:c.height});
 }
 return frames;
};
function extractGrid(im,cols,rows,rowBounds=null){const bank=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const cell=document.createElement('canvas');cell.width=Math.ceil(im.width/cols);const top=rowBounds?Math.max(0,rowBounds[y]-20):y*im.height/rows,bottom=rowBounds?Math.min(im.height,rowBounds[y+1]+20):(y+1)*im.height/rows;cell.height=Math.ceil(bottom-top);cell.getContext('2d').drawImage(im,x*im.width/cols,top,im.width/cols,bottom-top,0,0,cell.width,cell.height);const f=extract(cell,1,180)[0];if(f)bank.push(f);}return bank;}
const idleSheet=new Image();idleSheet.src='lemon-jr-idle-v2.png';let idleFrames=[],gaze=false,vx=0,vy=0,stride=0,motion=0,turn=1;const poses=[];let metrics={w:0,h:0,left:0,top:0,size:240};
function measure(){const r=world.getBoundingClientRect();metrics={w:Math.max(0,world.clientWidth-cat.clientWidth),h:Math.max(0,world.clientHeight-cat.clientHeight),left:r.left,top:r.top,size:cat.clientWidth};}addEventListener('resize',measure);addEventListener('scroll',measure,{passive:true});
const gaitSheet=new Image(),actionSheet=new Image();gaitSheet.src='lemon-gait-cycle.png';actionSheet.src='lemon-action-cycle.png';let gait=[],actions=[],lookX=0,lookY=0,blink=0,blinkAt=-5,nextBlink=2,mouth=0,reach=0,anticipation=0,nearSince=-1,restStart=0,lastMoving=false;const cleanDims=[];
function cacheBank(bank,k){return bank.map(f=>{const c=document.createElement('canvas');c.width=c.height=480;c.getContext('2d').drawImage(f.c,(480-f.w*k)/2,420-f.h*k,f.w*k,f.h*k);return c;});}
// Measure the same anatomical feature in every pose. Moving feet never define scale.
function faceLandmark(f){
 const d=f.c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,f.w,f.h).data;const pink=[];
 for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){const i=(y*f.w+x)*4;if(d[i+3]>200&&d[i]>165&&d[i]>d[i+1]*1.25&&d[i+2]>d[i+1]*.65)pink.push([x,y]);}
 const pinkSet=new Set(pink.map(([x,y])=>y*f.w+x)),blobs=[];
 for(const seed of pinkSet){if(!pinkSet.has(seed))continue;pinkSet.delete(seed);const queue=[seed];let sx=0,sy=0,l=f.w,r=0,t=f.h,b=0;for(let q=0;q<queue.length;q++){const v=queue[q],x=v%f.w,y=Math.floor(v/f.w);sx+=x;sy+=y;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const z of [v-1,v+1,v-f.w,v+f.w])if(pinkSet.has(z)){pinkSet.delete(z);queue.push(z);}}const w=r-l+1,h=b-t+1;if(sy/queue.length>f.h*.4&&queue.length>=5&&w<f.w*.14&&h<f.h*.075&&w/h>1.05&&w/h<4)blobs.push({x:sx/queue.length,y:sy/queue.length,area:queue.length});}
 blobs.sort((a,b)=>b.area-a.area);const nose=blobs[0];const noseX=nose?nose.x:f.w*.7,noseY=nose?nose.y:f.h*.56;
 const spans=[];for(let y=Math.max(0,Math.floor(noseY-f.h*.16));y<noseY-f.h*.065;y++){let x=Math.round(noseX);if(d[(y*f.w+x)*4+3]<180)continue;let l=x,r=x;while(l>0&&d[(y*f.w+l-1)*4+3]>180)l--;while(r<f.w-1&&d[(y*f.w+r+1)*4+3]>180)r++;spans.push({l,r,w:r-l});}
 spans.sort((a,b)=>a.w-b.w);const span=spans[Math.floor(spans.length*.65)]||{l:f.w*.3,r:f.w*.95,w:f.w*.65};let footLeft=f.w,footRight=0,footY=0;for(let y=Math.floor(f.h*.88);y<f.h;y++)for(let x=0;x<f.w;x++)if(d[(y*f.w+x)*4+3]>200){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);footY=Math.max(footY,y);}return {noseX,noseY,headX:(span.l+span.r)/2,headWidth:span.w,footLeft,footRight,footY};
}
const sizeCalibration={};let sharedHeadWidth=190,motionRenderer=null,riseRight=[],riseLeft=[],wanderElapsed=0,wanderCycle=-1;
const motionMeta=new WeakMap();
function registeredBank(frames,kind,direction=1){
 const targetX=(kind==='reach'||kind==='rise')?240+direction*26:kind==='groom'?282:kind==='feed'?294:kind==='pet'?300:240+direction*65;
 const targetNoseY=(kind==='reach'||kind==='rise')?248:kind==='groom'||kind==='feed'?287:kind==='pet'?352:302;
 const landmarks=frames.map(faceLandmark),median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];const widths=landmarks.map(a=>a.headWidth).sort((a,b)=>a-b),baseWidth=widths[Math.floor(widths.length*.25)],valid=landmarks.filter(a=>a.headWidth>=baseWidth*.75&&a.headWidth<=baseWidth*1.3),bankWidth=({walk:direction>0?190:185,run:direction>0?193:186,groom:174,reach:174,rise:direction>0?155:230,pet:245,feed:280})[kind],noseOffset=direction>0?.22:-.22;
 sizeCalibration[kind+direction]={bankWidth,heads:landmarks.map(a=>Math.round(a.headWidth)),noses:landmarks.map(a=>[Math.round(a.noseX),Math.round(a.noseY)])};canvas.dataset.sizeCalibration=JSON.stringify(sizeCalibration);
 return frames.map((f,index)=>{const a=landmarks[index],k=sharedHeadWidth/bankWidth;a.headX=a.noseX-noseOffset*bankWidth;const c=document.createElement('canvas');c.width=c.height=480;
 let ox=targetX-a.headX*k,oy=targetNoseY-a.noseY*k;
 if(kind==='groom'){ox=178-a.footLeft*k;oy=420-a.footY*k;}
 if(kind==='pet'||kind==='feed'){ox=(kind==='pet'?280:270)-(a.footLeft+a.footRight)*.5*k;oy=420-a.footY*k;}if(kind==='reach'||kind==='rise'){ox=250-(a.footLeft+a.footRight)*.5*k;oy=420-a.footY*k;}
 // Keep one camera scale and translate within its safe frame; never shrink a pose to fit.
 ox=Math.max(12,Math.min(468-f.w*k,ox));oy=Math.max(12,Math.min(432-f.h*k,oy));
 c.getContext('2d').drawImage(f.c,ox,oy,f.w*k,f.h*k);motionMeta.set(c,{x:ox,y:oy,w:f.w*k,h:f.h*k,noseX:ox+a.noseX*k,noseY:oy+a.noseY*k,headWidth:a.headWidth*k,groundY:oy+a.footY*k,scale:k});return c;});
}
function installCuratedMotion(cf,ff,hr,hl,rr,rl,sg,ss,af,lr){
 const reference=faceLandmark(cf[0]);sharedHeadWidth=reference.headWidth*(322/Math.max(...cf.slice(0,4).map(f=>f.h)));
 // Omit variant poses that change the torso angle within a gait.
 const pick=(a,ids)=>ids.map(i=>a[i]).filter(Boolean);
 smoothWalk=registeredBank(pick(hr,[0,1,2,3,4]),'walk',1);smoothWalkLeft=registeredBank(pick(hl,[0,1,2,3,4]),'walk',-1);
 // Matched contact, gathering, push-off, extension, landing and recovery.
 // Left uses its own artwork so the asymmetric coat is never mirrored.
 smoothRun=registeredBank(pick(rr,[0,1,2,7,8,10]),'run',1);smoothRunLeft=registeredBank(pick(rl,[2,4,1,6,0,9]),'run',-1);
 smoothGroom=registeredBank(pick(sg,[0,1,2,3,4,5,6,7,6,7,8,10,12,15]),'groom');
 smoothReach=registeredBank(pick(ss.slice(0,8),[0,1,2,1]),'reach',1);smoothReachLeft=registeredBank(pick(ss.slice(8),[0,1,2,1]),'reach',-1);
 riseRight=registeredBank(pick(af,[8,9,10]),'rise',1);riseLeft=registeredBank(pick(lr,[0,2,4]),'rise',-1);
 const pets=registeredBank(cf.slice(4,6),'pet');approved[4]=pets[0];approved[5]=pets[1];feeding=registeredBank(ff,'feed');feedingDims=feeding.map(c=>motionMeta.get(c));
 const banks=[smoothWalk,smoothWalkLeft,smoothRun,smoothRunLeft,smoothGroom,smoothReach,smoothReachLeft];
 canvas.dataset.motionFrames=JSON.stringify(banks.map(b=>b.length));canvas.dataset.headWidths=JSON.stringify(banks.flat().map(c=>Math.round(motionMeta.get(c).headWidth)));
 motionRenderer=new window.CatMotionRenderer(canvas);motionRenderer.setReference(approved[0]);for(const bank of banks)motionRenderer.prepare(bank);motionRenderer.prepare(riseRight);motionRenderer.prepare(riseLeft);
 for(const a of smoothRun)motionRenderer.pair(a,riseRight[0]);for(const a of smoothRunLeft)motionRenderer.pair(a,riseLeft[0]);motionRenderer.pair(riseRight[2],smoothReach[0]);motionRenderer.pair(riseLeft[2],smoothReachLeft[0]);
}
const eyeSource=new Image();eyeSource.src='lemon-eye-reference.png';let walkEyeSprite,walkScale=1;
const smileSource=new Image();smileSource.src='lemon-smile-reference.png';let smileSprite,smileRightSprite,actionScale=1;
const leftGaitSheet=new Image(),leftReachSheet=new Image();leftGaitSheet.src='lemon-left-gait.png';leftReachSheet.src='lemon-left-reach-two-paws.png';let leftGait=[],leftReach=[];
const originalSheet=new Image();originalSheet.src='lemon-jr-interaction-v2.png';let originalPoses=[],faceLayers=[];
Promise.all([hdRunRight,hdRunLeft,hdWalkRight,hdWalkLeft,...smoothSheets,neckSheet,approvedSheet,feedingSheet,approvedLeftSheet,sheet,gaitSheet,actionSheet,originalSheet,smileSource,eyeSource,leftGaitSheet,leftReachSheet].map(im=>new Promise(resolve=>{im.onload=resolve;if(im.complete&&im.naturalWidth)resolve()}))).then(()=>{const [sw,sr,sg,ss]=smoothSheets.map((im,i)=>i===2?extract(im,16,180):extractGrid(im,4,i>=2?4:6));function sizeBank(frames,height){return cacheBank(frames,height/Math.max(...frames.map(f=>f.h)));}const hr=extract(hdWalkRight,12),hl=extract(hdWalkLeft,12);smoothWalk=registeredBank(hr,"walk",1);smoothWalkLeft=registeredBank(hl,"walk",-1);const rr=extract(hdRunRight,12),rl=extract(hdRunLeft,12),runScale=Math.min(290/Math.max(...[...rr,...rl].map(f=>f.h)),420/Math.max(...[...rr,...rl].map(f=>f.w)));smoothRun=registeredBank(rr,'run',1);smoothRunLeft=registeredBank(rl,'run',-1);smoothGroom=registeredBank(sg,'groom');smoothReach=registeredBank(ss.slice(0,ss.length/2),'reach',1);smoothReachLeft=registeredBank(ss.slice(ss.length/2),'reach',-1);canvas.dataset.motionFrames=JSON.stringify([hr.length+hl.length,rr.length+rl.length,sg.length,ss.length]);const cf=extract(approvedSheet),ff=extract(feedingSheet),lf=extract(approvedLeftSheet);const ck=322/Math.max(...cf.slice(0,4).map(f=>f.h)),fk=322/Math.max(...ff.map(f=>f.h));approved=cacheBank(cf,ck);const nf=extract(neckSheet)[0];neckUnderlay=document.createElement('canvas');neckUnderlay.width=neckUnderlay.height=480;neckUnderlay.getContext('2d').drawImage(nf.c,(480-cf[0].w*ck)/2,420-nf.h*ck,nf.w*ck,nf.h*ck);feeding=cacheBank(ff,fk);approvedLeft=cacheBank(lf,322/Math.max(...lf.slice(0,4).map(f=>f.h)));approvedDims=cf.map(f=>({x:(480-f.w*ck)/2,y:420-f.h*ck,w:f.w*ck,h:f.h*ck}));feedingDims=ff.map(f=>({x:(480-f.w*fk)/2,y:420-f.h*fk,w:f.w*fk,h:f.h*fk}));frames=extract(sheet);scale=322/Math.max(...frames.slice(0,3).map(f=>f.h));poses.push(...cacheBank(frames,scale));for(const f of frames)cleanDims.push({x:(480-f.w*scale)/2,y:420-f.h*scale,w:f.w*scale,h:f.h*scale});const gf=extract(gaitSheet,16),af=extract(actionSheet,16);walkScale=322/Math.max(...gf.slice(0,8).map(f=>f.h));gait=[...cacheBank(gf.slice(0,8),walkScale),...cacheBank(gf.slice(8),322/Math.max(...gf.slice(8).map(f=>f.h)))];actionScale=322/Math.max(...af.slice(0,8).map(f=>f.h));actions=[...cacheBank(af.slice(0,8),actionScale),...cacheBank(af.slice(8),380/Math.max(...af.slice(10,15).map(f=>f.h)))];const lg=extract(leftGaitSheet,16),lr=extract(leftReachSheet,8);leftGait=[...cacheBank(lg.slice(0,8),322/Math.max(...lg.slice(0,8).map(f=>f.h))),...cacheBank(lg.slice(8),322/Math.max(...lg.slice(8).map(f=>f.h)))];leftReach=cacheBank(lr,380/Math.max(...lr.slice(2,7).map(f=>f.h)));originalPoses=cacheBank(extract(originalSheet),scale);buildFaceLayers();buildSmile();buildWalkEye();installCuratedMotion(cf,ff,hr,hl,rr,rl,sg,ss,af,lr);measure();last=performance.now();requestAnimationFrame(tick)});
function bounds(){return metrics}
function localPointer(){const s=480/metrics.size;let lx=(px-metrics.left-x)*s,ly=(py-metrics.top-y)*s;return {x:lx,y:ly}}
function clearMode(){document.body.classList.remove('playing');cursor.hidden=true;stop.hidden=true;touching=false;}
function wander(){clearMode();state='wander';nextWander=clock+1;menu.hidden=true;status.textContent='Hover to say hello; click to interact.'}
let cursorMode='';function setCursor(){if(cursorMode!==state){cursorMode=state;cursor.innerHTML=state==='pet'?'🫳':state==='play'?'🍋':'<img src="taiyaki-cursor.png" alt="" style="width:34px;height:34px;object-fit:contain">';}cursor.style.transform=state==='feed'?'translate(8px,-50%)':'translate(-50%,-50%)';cursor.hidden=!inside;cursor.style.left=px+'px';cursor.style.top=py+'px'}
function setMode(mode){menu.hidden=true;clearMode();state=mode;if(mode==='pet'||mode==='feed'){vx=vy=0;tx=x;ty=y;}document.body.classList.add('playing');stop.hidden=false;stop.textContent='Done';setCursor();status.textContent={pet:'Move your hand over her head or body to pet her.',play:'Move the lemon—she’ll run after it and reach for it.',feed:'Bring the taiyaki to her mouth. You can keep feeding her.'}[mode]}
cat.onpointerenter=()=>hover=true;cat.onpointerleave=()=>hover=false;cat.onclick=()=>{if(['pet','play','feed'].includes(state))return;gaze=true;menu.hidden=!menu.hidden;state=menu.hidden?'wander':'menu';menu.style.left=Math.max(8,Math.min(world.clientWidth-menu.offsetWidth-8,x-30))+'px';menu.style.top=Math.max(8,y-45)+'px'};
menu.querySelectorAll('button').forEach(b=>b.onclick=()=>setMode(b.dataset.action));stop.onclick=wander;document.addEventListener('keydown',e=>{if(e.key==='Escape')wander()});
function pointer(e){px=e.clientX;py=e.clientY;const r=world.getBoundingClientRect();inside=px>=r.left&&px<=r.right&&py>=r.top&&py<=r.bottom;if(['pet','play','feed'].includes(state))setCursor();}
document.addEventListener('pointermove',pointer);document.addEventListener('pointerdown',pointer);
world.onclick=e=>{if(e.target===world&&!menu.hidden)wander()};
const anchors={0:[.61,.50,.885,.456,.767,.605],3:[.47,.36,.73,.26,.65,.41],4:[.616,.61,.885,.55,.77,.72],5:[.616,.61,.885,.55,.77,.72],6:[.58,.452,.865,.406,.758,.535],7:[.58,.452,.865,.406,.758,.535]};
function buildFaceLayers(){
 for(let index=0;index<8;index++){const d=cleanDims[index],a=anchors[index]||anchors[0],g=originalPoses[index].getContext('2d'),pixels=g.getImageData(0,0,480,480).data;const layers=[];
 for(let part=0;part<3;part++){const cx=d.x+a[part*2]*d.w,cy=d.y+a[part*2+1]*d.h,w=part===2?50:48,h=part===2?30:60,c=document.createElement('canvas');c.width=w;c.height=h;const cg=c.getContext('2d'),out=cg.createImageData(w,h),left=Math.round(cx-w/2),top=Math.round(cy-h/2);
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const sx=left+xx,sy=top+yy;if(sx<0||sy<0||sx>=480||sy>=480)continue;const i=(sy*480+sx)*4,r=pixels[i],gg=pixels[i+1],bb=pixels[i+2];const brown=r<140&&r-gg>6&&gg-bb>3;const highlight=part<2&&Math.hypot(sx-(cx-3),sy-(cy-8))<7&&r>170&&gg>160&&bb>130;if(!brown&&!highlight)continue;if(part<2&&((sx-cx)**2/15**2+(sy-cy)**2/22**2)>1)continue;const j=(yy*w+xx)*4;out.data[j]=r;out.data[j+1]=gg;out.data[j+2]=bb;out.data[j+3]=pixels[i+3];}if(part<2){const seen=new Uint8Array(w*h),parts=[];for(let q=0;q<w*h;q++){if(seen[q]||!out.data[q*4+3])continue;const queue=[q];seen[q]=1;for(let k=0;k<queue.length;k++){const v=queue[k],xx=v%w,yy=Math.floor(v/w);for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const nx=xx+ox,ny=yy+oy,n=ny*w+nx;if(nx>=0&&nx<w&&ny>=0&&ny<h&&!seen[n]&&out.data[n*4+3]){seen[n]=1;queue.push(n);}}}parts.push(queue);}parts.sort((a,b)=>b.length-a.length);const keep=new Uint8Array(w*h);for(const q of parts[0]||[])keep[q]=1;for(let q=0;q<w*h;q++)if(!keep[q])out.data[q*4+3]=0;}cg.putImageData(out,0,0);let noseX=cx;if(part===2){let total=0,sum=0;for(let ny=Math.round(cy-30);ny<cy;ny++)for(let nx=Math.round(cx-25);nx<cx+25;nx++){const n=(ny*480+nx)*4,r=pixels[n],g=pixels[n+1],b=pixels[n+2];if(r>180&&g>90&&b>80&&r-g>35&&g-b<35){sum+=nx;total++;}}if(total)noseX=sum/total;}layers.push({c,cx,cy,w,h,noseX});}faceLayers[index]=layers;
 }
}
function buildSmile(){const c=document.createElement('canvas');c.width=smileSource.width;c.height=smileSource.height;const g=c.getContext('2d');g.drawImage(smileSource,0,0);function cut(x,y,w,h){const pixels=g.getImageData(x,y,w,h);for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],gg=pixels.data[i+1],b=pixels.data[i+2];if(!(r<140&&r-gg>6&&gg-b>3))pixels.data[i+3]=0;}const sprite=document.createElement('canvas');sprite.width=w;sprite.height=h;sprite.getContext('2d').putImageData(pixels,0,0);return sprite;}smileSprite=cut(1305,117,36,23);smileRightSprite=cut(1378,106,28,20);}
function buildWalkEye(){const c=document.createElement('canvas');c.width=eyeSource.width;c.height=eyeSource.height;const g=c.getContext('2d');g.drawImage(eyeSource,0,0);const pixels=g.getImageData(230,126,29,37);for(let y=0;y<37;y++)for(let x=0;x<29;x++){const i=(y*29+x)*4,r=pixels.data[i],gg=pixels.data[i+1],b=pixels.data[i+2];const dark=r<140&&r-gg>6&&gg-b>3,white=Math.hypot(x-14,y-10)<6&&r>180&&gg>150&&b>110;if(!dark&&!white)pixels.data[i+3]=0;if(white){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=pixels.data[i+3]=255;}}walkEyeSprite=document.createElement('canvas');walkEyeSprite.width=29;walkEyeSprite.height=37;walkEyeSprite.getContext('2d').putImageData(pixels,0,0);}
function drawFace(index){const layers=faceLayers[index];if(!layers)return;const happy=state==='pet'&&touching;const closed=happy?1:Math.min(1,Math.max(0,(blink-.15)/.65));const midX=(layers[0].cx+layers[1].cx)/2,midY=(layers[0].cy+layers[1].cy)/2;
 for(let part=0;part<3;part++){if(part===2&&mouth>.1)continue;const f=layers[part];ctx.save();
 if(part<2){
  if(closed<1){ctx.save();ctx.globalAlpha=1-closed;ctx.translate(midX+(part===0?-40:40)+lookX,f.cy+lookY);ctx.drawImage(walkEyeSprite,-29*walkScale/2,-37*walkScale/2,29*walkScale,37*walkScale);ctx.restore();}
  if(closed>0){ctx.globalAlpha=closed;const sprite=part===0?smileSprite:smileRightSprite;ctx.translate(midX+(part===0?-1:1)*68.5*actionScale/2,midY);ctx.drawImage(sprite,-sprite.width*actionScale/2,-sprite.height*actionScale/2,sprite.width*actionScale,sprite.height*actionScale);}
 }else{ctx.translate(f.cx,f.cy);ctx.drawImage(f.c,-f.w/2,-f.h/2);}ctx.restore();}
 if(mouth>.03){const f=layers[2];ctx.fillStyle='#5b312a';ctx.beginPath();ctx.ellipse(f.noseX,f.cy+3,8,mouth*12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ec9ba3';ctx.beginPath();ctx.ellipse(f.noseX,f.cy+8*mouth,4,mouth*3,0,0,Math.PI*2);ctx.fill();}
}
function headVertex(x,y){const weight=Math.max(0,Math.min(1,(330-y)/32))*Math.max(0,Math.min(1,(x-150)/35));const angle=tilt*weight,dx=x-290,dy=y-318;return [290+dx*Math.cos(angle)-dy*Math.sin(angle),318+dx*Math.sin(angle)+dy*Math.cos(angle)];}
function drawTriangle(pose,a,b,c,aa,bb,cc){ctx.save();ctx.beginPath();ctx.moveTo(...aa);ctx.lineTo(...bb);ctx.lineTo(...cc);ctx.closePath();ctx.clip();const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);const u=((bb[0]-aa[0])*(c[1]-a[1])-(cc[0]-aa[0])*(b[1]-a[1]))/det,v=((cc[0]-aa[0])*(b[0]-a[0])-(bb[0]-aa[0])*(c[0]-a[0]))/det,w=((bb[1]-aa[1])*(c[1]-a[1])-(cc[1]-aa[1])*(b[1]-a[1]))/det,z=((cc[1]-aa[1])*(b[0]-a[0])-(bb[1]-aa[1])*(c[0]-a[0]))/det;ctx.transform(u,w,v,z,aa[0]-u*a[0]-v*a[1],aa[1]-w*a[0]-z*a[1]);ctx.drawImage(pose,0,0);ctx.restore();}
// Move an isolated head as a rigid layer; body pixels never enter the deformation mesh.
let rigidHeadSource=null,rigidHeadCanvas=null,neckShadowCanvas=null;
function headBoundary(g){g.beginPath();g.moveTo(200,0);g.lineTo(480,0);g.lineTo(480,290);g.bezierCurveTo(390,310,255,310,223,282);g.lineTo(200,250);g.closePath();}
function drawRigidHead(pose){
 if(rigidHeadSource!==pose){rigidHeadSource=pose;rigidHeadCanvas=document.createElement('canvas');rigidHeadCanvas.width=rigidHeadCanvas.height=480;const g=rigidHeadCanvas.getContext('2d');g.save();headBoundary(g);g.clip();g.drawImage(pose,0,0);g.restore();}
 if(!neckShadowCanvas){neckShadowCanvas=document.createElement('canvas');neckShadowCanvas.width=neckShadowCanvas.height=480;const g=neckShadowCanvas.getContext('2d');g.drawImage(neckUnderlay,0,0);g.globalCompositeOperation='source-in';g.save();g.translate(325,303);g.scale(1,.27);const shade=g.createRadialGradient(0,0,0,0,0,76);shade.addColorStop(0,'rgba(69,48,30,.23)');shade.addColorStop(.5,'rgba(69,48,30,.12)');shade.addColorStop(1,'rgba(69,48,30,0)');g.fillStyle=shade;g.fillRect(-480,-1800,960,3600);g.restore();}
 ctx.drawImage(neckUnderlay,0,0);ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(neckShadowCanvas,0,0);ctx.restore();ctx.save();ctx.translate(248,296);ctx.rotate(tilt*.55);ctx.translate(-248,-292);ctx.drawImage(rigidHeadCanvas,0,0);ctx.restore();
}
function render(index,bank='base'){if(['smoothWalk','smoothRun','smoothGroom','smoothReach'].includes(bank)){ctx.clearRect(0,0,480,480);const pose=bank==='smoothWalk'?(facing<0?smoothWalkLeft[index]:smoothWalk[index]):bank==='smoothRun'?(facing<0?smoothRunLeft[index]:smoothRun[index]):bank==='smoothReach'?(facing<0?smoothReachLeft[index]:smoothReach[index]):smoothGroom[index];if(pose)ctx.drawImage(pose,0,0);canvas.dataset.motionState=bank+':'+index;return;}if(bank==='approved'||bank==='feeding'||bank==='approvedLeft'){ctx.clearRect(0,0,480,480);ctx.save();const pose=bank==='approved'?approved[index]:bank==='feeding'?feeding[index]:approvedLeft[index];if(bank==='approved'&&index===0){drawRigidHead(pose);}else ctx.drawImage(pose,0,0);ctx.restore();return;}ctx.clearRect(0,0,480,480);ctx.save();const pose=bank==='gait'?(facing<0?leftGait[index]:gait[index]):bank==='action'?(facing<0&&index>=8?leftReach[state==='play'&&index>=10?({10:4,11:5,12:4,13:5,14:5,15:4})[index]:index-8]:actions[state==='play'&&index>=10?({10:10,11:11,12:10,13:11,14:11,15:10})[index]:index]):poses[index];
 if(bank==='base'&&index===0&&Math.abs(tilt)>.0005){for(let y=0;y<480;y+=40)for(let x=0;x<480;x+=40){const a=[x,y],b=[x+40,y],c=[x,y+40],d=[x+40,y+40],aa=headVertex(...a),bb=headVertex(...b),cc=headVertex(...c),dd=headVertex(...d);drawTriangle(pose,a,b,c,aa,bb,cc);drawTriangle(pose,b,d,c,bb,dd,cc);}ctx.save();ctx.translate(290,318);ctx.rotate(tilt);ctx.translate(-290,-318);drawFace(index);ctx.restore();}
 else{ctx.drawImage(pose||poses[0],0,0);if(bank==='base')drawFace(index);}ctx.restore();}
// Short eased transitions reuse the existing frames without changing their artwork.
const transitionFrame=document.createElement('canvas');transitionFrame.width=transitionFrame.height=480;
const targetFrame=document.createElement('canvas');targetFrame.width=targetFrame.height=480;
let renderedKey='',renderedBank='',blendStarted=0,blendDuration=0,playCaught=false;
function motionBank(bank){return bank==='smoothWalk'?(facing<0?smoothWalkLeft:smoothWalk):bank==='smoothRun'?(facing<0?smoothRunLeft:smoothRun):bank==='smoothReach'?(facing<0?smoothReachLeft:smoothReach):bank==='smoothGroom'?smoothGroom:bank==='rise'?(facing<0?riseLeft:riseRight):null;}
let motionPhase=0,lastDrawPose=null,modeTransitionStart=-1,modeTransitionFrom=null,lastMotionName='';
function renderSmooth(index,bank){
 const poses=motionBank(bank);const name=bank+':'+(poses?facing:1);
 if(poses){const i=Math.floor(motionPhase)%poses.length,j=(bank==='smoothGroom'||bank==='rise')?Math.min(i+1,poses.length-1):(i+1)%poses.length,t=motionPhase-Math.floor(motionPhase);const a=poses[i],b=poses[j];canvas.dataset.motionSample=JSON.stringify({bank,phase:motionPhase,i,j,count:poses.length});if(!a||!b)return;
 motionRenderer.draw(a,b,t);lastDrawPose=a;canvas.dataset.motionState=name+':'+i;lastMotionName=name;return;}
 if((bank==='approved'&&index!==0)||bank==='feeding'||bank==='approvedLeft'){const pose=bank==='feeding'?feeding[index]:bank==='approvedLeft'?approvedLeft[index]:approved[index];motionRenderer.draw(pose);}else{render(index,bank);motionRenderer.draw(canvas,canvas,0,true);}lastDrawPose=canvas;lastMotionName=name;canvas.dataset.motionState=bank+':'+index;
}
function tick(now){requestAnimationFrame(tick);const dt=Math.max(0,Math.min(.035,(now-last)/1000));last=now;clock+=dt;const b=bounds();x=Math.max(0,Math.min(b.w,x));y=Math.max(0,Math.min(b.h,y));let moving=false,caught=false;
if(state==='wander'&&!hover)wanderElapsed+=dt;const idleTime=wanderElapsed%8.1,cycle=Math.floor(wanderElapsed/8.1);if(state==='wander'&&!hover&&cycle!==wanderCycle){wanderCycle=cycle;tx=x<b.w/2?b.w*.85:b.w*.15;ty=b.h*.55;}
if(state==='play'&&inside){const r={left:metrics.left,top:metrics.top};tx=Math.max(0,Math.min(b.w,px-r.left-cat.clientWidth*.5));ty=Math.max(0,Math.min(b.h,py-r.top-cat.clientHeight*.50));}
const active=(state==='wander'&&!hover&&idleTime<4.5)||(state==='play'&&inside);
const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy),speed=state==='play'?180:35;
const holdLemon=state==='play'&&inside&&d<(playCaught?95:62);const desired=active&&!holdLemon?Math.min(speed,Math.max(0,d-(state==='play'?42:0))*5):0,damp=1-Math.exp(-dt*9);
vx+=((d>1?dx/d*desired:0)-vx)*damp;vy+=((d>1?dy/d*desired:0)-vy)*damp;
x=Math.max(0,Math.min(b.w,x+vx*dt));y=Math.max(0,Math.min(b.h,y+vy*dt));
const velocity=Math.hypot(vx,vy);moving=velocity>4;caught=state==='play'&&inside&&d<(playCaught?95:62);playCaught=caught;
if(!caught&&Math.abs(vx)>8)facing=vx<0?-1:1;motion+=(Number(moving)-motion)*damp;stride+=velocity*dt/(state==='play'?14:12);
const p=localPointer();anticipation=0;touching=false;let index=0,bank='approved';
if(lastMoving&&!moving)restStart=clock;lastMoving=moving;
if(state==='pet'){touching=inside&&p.x>90&&p.x<430&&p.y>100&&p.y<415;index=touching?5:4;bank='approved';setStatus(touching?'Purr… that feels good.':'Move your hand over her head or body.');}
else if(state==='feed'){index=0;bank='feeding';const d=feedingDims[0],mx=d.noseX,my=d.noseY+12;const distance=Math.hypot(p.x-mx,p.y-my);anticipation=inside?Math.max(0,Math.min(1,(70-distance)/30)):0;if(inside&&distance<32){if(nearSince<0)nearSince=clock;if(clock-nearSince>.22&&clock-lastFed>.75){lastFed=clock;chewUntil=clock+.65;meals++;}}else nearSince=-1;setStatus(clock<chewUntil?'Nom nom… happy bite '+meals+'.':'Bring the taiyaki to her mouth.');}
else if(state==='play'){if(caught){reach+=dt;if(reach<.42){motionPhase=Math.min(2,reach/.42*2);index=Math.floor(motionPhase);bank='rise';}else{motionPhase=(reach-.42)*smoothReach.length/1.25;index=Math.floor(motionPhase)%smoothReach.length;bank='smoothReach';}}else{reach=0;if(moving){motionPhase=stride*smoothRun.length/8;index=Math.floor(motionPhase)%smoothRun.length;bank='smoothRun';}}}
else if(state==='wander'&&!hover){if(moving){motionPhase=stride*smoothWalk.length/3.2;index=Math.floor(motionPhase)%smoothWalk.length;bank='smoothWalk';}else if(idleTime>=4.8&&idleTime<7.4){motionPhase=Math.min(smoothGroom.length-1,Math.max(0,idleTime-4.8)/2.5*(smoothGroom.length-1));index=Math.floor(motionPhase);bank='smoothGroom';}}
const ease=1-Math.exp(-dt*10);tilt+=((hover&&['wander','menu'].includes(state)?Math.max(-.09,Math.min(.09,(p.x-290)*.001)):0)-tilt)*ease;
lookX+=((gaze&&inside?Math.max(-4,Math.min(4,(p.x-320)*.025)):Math.sin(clock*.7)*1.5)-lookX)*ease;lookY+=((gaze&&inside?Math.max(-3,Math.min(3,(p.y-260)*.025)):0)-lookY)*ease;
if(clock>nextBlink){blinkAt=clock;nextBlink=clock+2.8+Math.random()*1.5;}const q=(clock-blinkAt)/.22;blink=q<1?Math.sin(Math.max(0,q)*Math.PI):0;
mouth+=((state==='feed'?(clock<chewUntil?.75+.2*Math.sin(clock*16):anticipation):0)-mouth)*ease;
if(state==='feed'){index=clock<chewUntil?4+Math.floor(clock*9)%4:anticipation>.55?2:anticipation>.1?1:0;}
cat.style.transform='translate3d('+x+'px,'+y+'px,0)';renderSmooth(index,bank);}

function setStatus(text){if(status.textContent!==text)status.textContent=text;}
