export default function init(el, ctx) {
  const wrap = document.createElement('div');
  wrap.style.minHeight = '120px';
  wrap.style.display = 'grid';
  wrap.style.placeItems = 'center';
  wrap.style.background = 'linear-gradient(180deg,#0e1220,#0c101c)';
  wrap.style.border = '1px dashed #2a3143';
  const p = document.createElement('div');
  p.style.color = '#9aa4b2';
  p.style.fontSize = '0.9rem';
  const date = ctx.date ? String(ctx.date) : null;
  p.innerHTML = date ? `Occurs on <strong>${date}</strong>` : 'No date in frontmatter';
  wrap.appendChild(p);
  el.replaceChildren(wrap);
}
