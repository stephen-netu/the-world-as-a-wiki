export default function init(el, ctx) {
  // ctx: { slug, title, coordinates, date, links }
  const c = ctx.coordinates;
  const wrap = document.createElement('div');
  wrap.style.minHeight = '120px';
  wrap.style.display = 'grid';
  wrap.style.placeItems = 'center';
  wrap.style.background = 'linear-gradient(180deg,#0e1220,#0c101c)';
  wrap.style.border = '1px dashed #2a3143';
  const p = document.createElement('div');
  p.style.color = '#9aa4b2';
  p.style.fontSize = '0.9rem';
  p.innerHTML = c && c.kind === 'image'
    ? `Image Map anchor: <code>${c.imageId}</code> @ (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`
    : c && c.kind === 'geo'
      ? `Geo: ${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}${c.zoom?` (z${c.zoom})`:''}`
      : 'No coordinates';
  wrap.appendChild(p);
  el.replaceChildren(wrap);
}
