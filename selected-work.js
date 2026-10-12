(() => {
 const hoverDevice=matchMedia('(hover:hover) and (pointer:fine)');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const previews=[...document.querySelectorAll('.work-motion')];
 function sync(preview){
  const video=preview.querySelector('video');if(!video)return;
  const row=preview.closest('.work-row');
  const active=!hoverDevice.matches||row.matches(':hover')||row.matches(':focus-within');
  if(active&&preview.dataset.visible==='true'&&preview.dataset.paused!=='true'&&!document.hidden)video.play().catch(()=>{});else video.pause();
 }
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.dataset.visible=String(entry.isIntersecting);sync(entry.target);}),{threshold:.15});
 previews.forEach(preview=>{
  const video=preview.querySelector('video'),toggle=preview.querySelector('.motion-toggle');
  if(video){video.muted=true;if(reduced.matches){preview.dataset.paused='true';toggle.setAttribute('aria-label',`Play ${preview.dataset.projectName} preview`);}}
  observer.observe(preview);
  toggle.addEventListener('click',()=>{const paused=preview.dataset.paused!=='true';preview.dataset.paused=String(paused);toggle.setAttribute('aria-label',`${paused?'Play':'Pause'} ${preview.dataset.projectName} preview`);sync(preview);});
  const row=preview.closest('.work-row');
  ['pointerenter','pointerleave','focusin','focusout'].forEach(type=>row.addEventListener(type,()=>requestAnimationFrame(()=>sync(preview))));
 });
 document.addEventListener('visibilitychange',()=>previews.forEach(sync));
 hoverDevice.addEventListener('change',()=>previews.forEach(sync));
})();
