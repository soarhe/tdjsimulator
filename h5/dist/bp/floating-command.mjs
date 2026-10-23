// Retain a placeholder so docking/undocking never moves the draft underneath.
export function setupFloatingCommand(){
  const anchor=document.querySelector('.command-anchor');
  const command=anchor.querySelector('.command');
  const arena=document.querySelector('#arena');
  let frame=0;
  function update(){
    frame=0;
    if(arena.hidden){
      command.classList.remove('command-floating');
      command.style.removeProperty('left');
      command.style.removeProperty('width');
      anchor.style.removeProperty('height');
      return;
    }
    const bounds=anchor.getBoundingClientRect();
    const floating=bounds.top<0;
    command.classList.toggle('command-floating',floating);
    if(floating){
      command.style.left=`${bounds.left}px`;
      command.style.width=`${bounds.width}px`;
    }else{
      command.style.removeProperty('left');
      command.style.removeProperty('width');
    }
    const height=`${command.offsetHeight}px`;
    if(anchor.style.height!==height)anchor.style.height=height;
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  const observer=new ResizeObserver(schedule);
  observer.observe(command);
  observer.observe(anchor);
  schedule();
  return schedule;
}
