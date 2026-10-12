(() => {
  const groups=[...document.querySelectorAll('.header-disclosure')];
  function close(group){clearTimeout(group.closeTimer);group.classList.remove('is-open');group.querySelector('button').setAttribute('aria-expanded','false');group.querySelector('.header-pills').inert=true;}
  function open(group){groups.filter(other=>other!==group).forEach(close);clearTimeout(group.closeTimer);group.classList.add('is-open');group.querySelector('button').setAttribute('aria-expanded','true');group.querySelector('.header-pills').inert=false;}
  groups.forEach(group=>{
    const trigger=group.querySelector('button');
    group.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')open(group);});
    group.addEventListener('pointerleave',()=>{group.closeTimer=setTimeout(()=>{if(!group.contains(document.activeElement))close(group);},120);});
    group.addEventListener('focusin',()=>open(group));
    group.addEventListener('focusout',event=>{if(!group.contains(event.relatedTarget))close(group);});
    trigger.addEventListener('click',()=>open(group));
    trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open(group);group.querySelector('a').focus();}});
    group.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();trigger.focus();close(group);}});
    group.querySelectorAll('a').forEach(link=>{if(new URL(link.href).pathname===location.pathname)link.setAttribute('aria-current','page');});
  });
  document.addEventListener('pointerdown',event=>groups.forEach(group=>{if(!group.contains(event.target))close(group);}));
})();
