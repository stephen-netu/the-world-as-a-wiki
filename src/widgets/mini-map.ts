export default function init(el: HTMLElement, ctx: any) {
  // ctx: { slug, title, coordinates, date, links }
  const body = el as HTMLElement;
  const coords = ctx && ctx.coordinates;
  if (!coords || coords.kind !== 'image' || !coords.imageId) {
    const msg = document.createElement('div');
    msg.style.color = '#9aa4b2';
    msg.textContent = 'No map coordinates';
    body.replaceChildren(msg);
    return;
  }

  let x = Number(coords.x), y = Number(coords.y);
  if (isFinite(x) && isFinite(y) && x <= 1 && y <= 1) { x *= 100; y *= 100; }
  if (!isFinite(x) || !isFinite(y)) {
    const msg = document.createElement('div');
    msg.style.color = '#9aa4b2';
    msg.textContent = 'Invalid coordinates';
    body.replaceChildren(msg);
    return;
  }

  const box = document.createElement('div');
  box.style.position = 'relative';
  box.style.width = '180px';
  box.style.height = '120px';
  box.style.border = '1px solid #222733';
  box.style.borderRadius = '8px';
  box.style.overflow = 'hidden';
  box.style.background = 'linear-gradient(180deg,#0e1220,#0c101c)';
  box.style.cursor = 'pointer';
  box.title = 'Open in Atlas';

  const img = document.createElement('img');
  img.alt = coords.imageId + ' map';
  (img as any).decoding = 'async';
  (img as any).loading = 'lazy';
  img.src = `/assets/atlas/${coords.imageId}.jpg`;
  img.style.width = '100%';
  img.style.height = '100%';
  (img.style as any).objectFit = 'contain';
  img.style.display = 'block';

  const marker = document.createElement('div');
  marker.style.position = 'absolute';
  marker.style.width = '10px';
  marker.style.height = '10px';
  (marker.style as any).borderRadius = '50%';
  marker.style.background = 'var(--accent)';
  marker.style.boxShadow = '0 0 0 2px rgba(15,17,23,0.9), 0 0 10px rgba(59,130,246,0.8)';
  (marker.style as any).transform = 'translate(-50%, -50%)';
  marker.title = ctx.title || '';

  const err = document.createElement('div');
  err.textContent = 'Map image not found';
  err.style.position = 'absolute';
  (err.style as any).inset = '0';
  err.style.display = 'none';
  (err.style as any).alignItems = 'center';
  (err.style as any).justifyContent = 'center';
  err.style.color = '#9aa4b2';
  err.style.background = 'rgba(10,12,20,0.6)';

  img.addEventListener('load', () => placeMarker());
  img.addEventListener('error', () => { err.style.display = 'flex'; });
  window.addEventListener('resize', () => placeMarker());

  function placeMarker(){
    const cw = box.clientWidth, ch = box.clientHeight;
    const iw = (img as HTMLImageElement).naturalWidth || cw;
    const ih = (img as HTMLImageElement).naturalHeight || ch;
    const scale = Math.min(cw/iw, ch/ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    const px = ox + (x/100) * dw;
    const py = oy + (y/100) * dh;
    (marker.style as any).left = px + 'px';
    (marker.style as any).top = py + 'px';
  }

  box.addEventListener('click', () => {
    const url = new URL('/atlas/', location.origin);
    url.searchParams.set('imageId', coords.imageId);
    location.href = url.toString();
  });

  box.appendChild(img);
  box.appendChild(marker);
  box.appendChild(err);
  body.replaceChildren(box);
}
