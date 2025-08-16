export default function init(el: HTMLElement, ctx: any) {
  const wrap = document.createElement('div');
  (wrap.style as any).minHeight = '120px';
  wrap.style.display = 'grid';
  (wrap.style as any).placeItems = 'center';
  wrap.style.background = 'linear-gradient(180deg,#0e1220,#0c101c)';
  wrap.style.border = '1px dashed #2a3143';
  const p = document.createElement('div');
  p.style.color = '#9aa4b2';
  (p.style as any).fontSize = '0.9rem';
  const count = Array.isArray(ctx?.links) ? ctx.links.length : 0;
  const slug = typeof ctx?.slug === 'string' ? ctx.slug : '';
  p.innerHTML = `Connections: <strong>${count}</strong> (open full <a href="/graph?focus=${encodeURIComponent(slug)}">Graph</a>)`;
  wrap.appendChild(p);
  el.replaceChildren(wrap);
}
