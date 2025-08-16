export default function init(el: HTMLElement, ctx: any) {
  const dateStr = ctx && ctx.date ? String(ctx.date) : null;
  if (!dateStr) {
    const msg = document.createElement('div');
    msg.style.color = '#9aa4b2';
    msg.textContent = 'No date in frontmatter';
    el.replaceChildren(msg);
    return;
  }

  // Parse year and date
  const d = new Date(dateStr);
  const y = isFinite(d.getTime()) ? d.getFullYear() : Number(String(dateStr).slice(0,4));
  if (!isFinite(y)) {
    const msg = document.createElement('div');
    msg.style.color = '#9aa4b2';
    msg.textContent = `Unrecognized date: ${dateStr}`;
    el.replaceChildren(msg);
    return;
  }

  // Context window: +/- 50 years around the note's year
  const span = 50;
  const startY = y - span;
  const endY = y + span;
  const width = 220;
  const height = 56;

  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '6px';

  const bar = document.createElement('div');
  bar.style.position = 'relative';
  bar.style.width = width + 'px';
  bar.style.height = height + 'px';
  bar.style.background = 'linear-gradient(180deg,#0e1220,#0c101c)';
  bar.style.border = '1px solid #222733';
  bar.style.borderRadius = '8px';
  bar.style.padding = '10px 8px 8px 8px';

  const line = document.createElement('div');
  line.style.position = 'absolute';
  (line.style as any).left = '8px';
  (line.style as any).right = '8px';
  (line.style as any).top = '28px';
  (line.style as any).height = '2px';
  line.style.background = '#2a3143';
  line.style.boxShadow = 'inset 0 0 0 1px #1f2533';
  bar.appendChild(line);

  // Major ticks every 10 years
  for (let ty = Math.ceil(startY/10)*10; ty <= endY; ty += 10) {
    const t = document.createElement('div');
    const pct = (ty - startY) / (endY - startY);
    t.style.position = 'absolute';
    (t.style as any).left = `calc(8px + ${pct*100}% * (1 - 16px/${width}))`;
    (t.style as any).top = '22px';
    (t.style as any).width = '1px';
    (t.style as any).height = '12px';
    t.style.background = '#3a4258';
    bar.appendChild(t);

    const label = document.createElement('div');
    label.textContent = String(ty);
    label.style.position = 'absolute';
    (label.style as any).top = '2px';
    (label.style as any).transform = 'translateX(-50%)';
    (label.style as any).left = `calc(8px + ${pct*100}% * (1 - 16px/${width}))`;
    label.style.fontSize = '10px';
    label.style.color = '#9aa4b2';
    bar.appendChild(label);
  }

  // Marker at note year
  const marker = document.createElement('div');
  const mpct = (y - startY) / (endY - startY);
  marker.style.position = 'absolute';
  (marker.style as any).left = `calc(8px + ${mpct*100}% * (1 - 16px/${width}))`;
  (marker.style as any).top = '18px';
  (marker.style as any).width = '2px';
  (marker.style as any).height = '20px';
  marker.style.background = 'var(--accent)';
  marker.style.boxShadow = '0 0 10px rgba(59,130,246,0.8)';
  marker.title = dateStr + (ctx.era ? ` — ${ctx.era}` : '');
  bar.appendChild(marker);

  // Caption
  const caption = document.createElement('div');
  caption.style.color = '#9aa4b2';
  caption.style.fontSize = '0.85rem';
  caption.style.display = 'flex';
  (caption.style as any).justifyContent = 'space-between';
  caption.innerHTML = `<span>${ctx.era ? `<strong>${escapeHtml(ctx.era)}</strong> · ` : ''}${escapeHtml(dateStr)}</span><span>${startY}–${endY}</span>`;

  wrap.appendChild(bar);
  wrap.appendChild(caption);
  el.replaceChildren(wrap);
}

function escapeHtml(s: any) {
  return String(s).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[ch]);
}
