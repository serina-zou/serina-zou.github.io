/* Decrypted text interaction for the static portfolio.
   Inspired by React Bits DecryptedText: https://reactbits.dev/text-animations/decrypted-text
   Uses the existing headings; no React mount or layout replacement is needed. */
(() => {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const characters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?';
  const titles=[...document.querySelectorAll('[data-decrypted-title]')];
  for(const heading of titles){
    const text=heading.textContent;
    const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=text;
    const visual=document.createElement('span');visual.className='decrypted-title';visual.setAttribute('aria-hidden','true');
    let word=null;
    const keepWords=heading.hasAttribute('data-decrypt-words');
    const letters=Array.from(text).map(character=>{
      const cell=document.createElement('span');cell.className='decrypt-cell';
      const measure=document.createElement('span');measure.className='decrypt-measure';measure.textContent=character;
      const ink=document.createElement('span');ink.className='decrypt-ink revealed';ink.textContent=character;
      cell.append(measure,ink);
      if(keepWords && character !== ' '){
        if(!word){word=document.createElement('span');word.className='decrypt-word';visual.append(word);}
        word.append(cell);
      }else{word=null;visual.append(cell);}
      return {character,ink};
    });
    heading.replaceChildren(accessible,visual);
    const measureContext=document.createElement('canvas').getContext('2d');
    const glyphPools=new Map();
    function randomGlyph(original){
      const style=getComputedStyle(heading),key=style.font+'|'+original;
      let pool=glyphPools.get(key);
      if(!pool){
        measureContext.font=style.font;
        const width=measureContext.measureText(original).width;
        const candidates=Array.from(characters).map(char=>({char,difference:Math.abs(measureContext.measureText(char).width-width)}));
        const closest=Math.min(...candidates.map(c=>c.difference));
        pool=candidates.filter(c=>c.difference<=Math.max(closest,width*.04)).map(c=>c.char);
        glyphPools.set(key,pool);
      }
      return pool[Math.floor(Math.random()*pool.length)];
    }
    let timer=null,hasPlayed=false;
    function finish(){clearInterval(timer);timer=null;letters.forEach(({character,ink})=>{ink.textContent=character;ink.className='decrypt-ink revealed';ink.style.transform='';});heading.dataset.decrypting='false';}
    function play(){
      if(timer||reducedMotion.matches)return;
      let revealed=0;heading.dataset.decrypting='true';
      function draw(){letters.forEach(({character,ink},i)=>{const done=i<revealed||character===' ';ink.textContent=done?character:randomGlyph(character);ink.className='decrypt-ink '+(done?'revealed':'encrypted');ink.style.transform='';});}
      draw();timer=setInterval(()=>{revealed++;if(revealed>=letters.length)finish();else draw();},60);
    }
    visual.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')play();});
    reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)finish();});
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!hasPlayed){hasPlayed=true;play();observer.disconnect();}},{threshold:.2});
    function observe(){observer.observe(heading);}
    // Wait until the loading screen is gone so the entry effect is actually seen.
    if(document.querySelector('.loader')){const ready=new MutationObserver(()=>{if(!document.querySelector('.loader')){ready.disconnect();observe();}});ready.observe(document.body,{childList:true});}else observe();
    window.addEventListener('pagehide',()=>{finish();observer.disconnect();},{once:true});
  }
})();
