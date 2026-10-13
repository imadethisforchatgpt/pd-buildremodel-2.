/* P&D 2.0 - focused workspace navigation and concise actions. */
(function(){
'use strict';
const mainTabs=['Dashboard','Estimates','Invoices','Clients','Projects'];
const labels={'Dashboard':'Overview','Estimates':'Estimates','Invoices':'Invoices','Clients':'Clients','Projects':'Projects'};
const extras=['Material Planner','Price Templates','Customer Care','Settings'];
const previousRender=render;
render=function(){
 previousRender();
 const nav=document.getElementById('nav');if(!nav)return;
 nav.setAttribute('aria-label','Main navigation');
 const isExtra=extras.includes(tab);
 nav.innerHTML='<div class="pd-nav-inner">'+mainTabs.map(t=>'<button type="button" class="pd-nav-link '+(tab===t?'active':'')+'" '+(tab===t?'aria-current="page"':'')+' data-pd-tab="'+esc(t)+'">'+labels[t]+'</button>').join('')+
 '<div class="pd-nav-more"><button type="button" id="pdMoreToggle" aria-haspopup="true" aria-expanded="false" class="pd-nav-link '+(isExtra?'active':'')+'">More <span aria-hidden="true">⌄</span></button><div id="pdMoreMenu" class="pd-nav-menu" hidden>'+extras.map(t=>'<button type="button" class="'+(tab===t?'active':'')+'" data-pd-tab="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div></div></div>';
 nav.querySelectorAll('[data-pd-tab]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.pdTab)));
 const toggle=nav.querySelector('#pdMoreToggle'),menu=nav.querySelector('#pdMoreMenu');
 toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});
 const close=e=>{if(!nav.contains(e.target)){menu.hidden=true;toggle.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',close)}};
 toggle.addEventListener('click',()=>{if(!menu.hidden)document.addEventListener('pointerdown',close)});
 const title=document.querySelector('#main h1');
 if(title&&tab==='Dashboard'&&title.textContent.includes('Welcome back'))title.textContent='Business overview';
 const subtitle=document.querySelector('#main .hero p');
 if(subtitle&&tab==='Dashboard')subtitle.textContent='Your work, payments and clients — all in one place.';
};
})();
