/* P&D document blocks: pure data operations and HTML rendering.
   Content is stored as structured blocks, never executable markup. */
(function(){
'use strict';
const uid=()=>('b'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));
const clean=blocks=>Array.isArray(blocks)?blocks.filter(b=>b&&['heading','text','photo','divider'].includes(b.type)).map(b=>({id:String(b.id||uid()),type:b.type,text:String(b.text||''),caption:String(b.caption||''),captionPosition:b.captionPosition==='above'?'above':'below',width:b.width==='half'?'half':'full',src:typeof b.src==='string'?b.src:''})):[];
window.PDBlocks={
 clean,
 make:type=>({id:uid(),type,text:'',caption:'',captionPosition:'below',width:'full',src:''}),
 move:(blocks,id,direction)=>{const next=clean(blocks),i=next.findIndex(b=>b.id===id),j=i+direction;if(i<0||j<0||j>=next.length)return next;[next[i],next[j]]=[next[j],next[i]];return next},
 escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 html:function(blocks){
  const e=this.escape;
  return '<section class="pd-document-blocks">'+clean(blocks).map(b=>{
   if(b.type==='divider')return '<hr class="pd-doc-divider">';
   if(b.type==='heading')return '<h3 class="pd-doc-heading">'+e(b.text)+'</h3>';
   if(b.type==='text')return '<div class="pd-doc-text">'+e(b.text).replace(/\n/g,'<br>')+'</div>';
   return b.src?'<figure class="pd-doc-photo '+(b.width==='half'?'pd-photo-half':'')+'">'+(b.caption&&b.captionPosition==='above'?'<figcaption>'+e(b.caption)+'</figcaption>':'')+'<img data-pd-photo="'+e(b.src)+'" alt="'+e(b.caption||'Project photo')+'">'+(b.caption&&b.captionPosition!=='above'?'<figcaption>'+e(b.caption)+'</figcaption>':'')+'</figure>':'';
  }).join('')+'</section>';
 }
};
})();
