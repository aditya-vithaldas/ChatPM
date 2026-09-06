// One calm current, shared by all particles. No dependencies or pointer capture.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const mobile = matchMedia('(max-width: 760px)');
const buttons = [...document.querySelectorAll('.motion-toggle')];
let paused = false;
const fields = [...document.querySelectorAll('.swarm-canvas')].map(canvas => {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const field = { canvas, context, width: 0, height: 0, time: 0, frame: 0, last: null, visible: true, x: 0, y: 0, aimX: 0, aimY: 0 };
  // Three disciplines begin independently, then converge into one smooth current.
  const laneColors = [[32, 77, 255], [95, 101, 114], [23, 25, 31]];
  const names = ['Product', 'Design', 'Engineering'];
  const smooth = u => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
  function point(u, lane, strand, t) {
    const merge = smooth((u - .1) / .75);
    const loose = 1 - merge;
    const wave = Math.sin(u * 15 + lane * 1.9 + t * .26 + strand * .28)
      + .42 * Math.sin(u * 29 - t * .18 + lane * 2.3 + strand * .5);
    const envelope = Math.sin(Math.PI * Math.min(1, u * 1.6));
    const center = (mobile.matches ? .35 : .43) + Math.sin(u * 4 - t * .13) * .011;
    return [
      field.width * (.09 + .82 * u) + field.x * .18 * Math.sin(Math.PI * u),
      field.height * (center + (lane - 1) * (mobile.matches ? .15 : .185) * loose
        + wave * (mobile.matches ? .035 : .055) * loose * envelope + strand * .005 * loose)
        + field.y * .32 * Math.sin(Math.PI * u),
    ];
  }
  function draw() {
    const { width: w, height: h, time: t, context: ctx } = field;
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;
    ctx.lineCap = 'round';
    const strands = mobile.matches ? 3 : 5;
    for (let lane = 0; lane < 3; lane++) {
      const color = laneColors[lane];
      // Fine continuous paths retain meaning even when motion is paused.
      for (let strand = 0; strand < strands; strand++) {
        const offset = strand - (strands - 1) / 2;
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) {
          const [x, y] = point(i / 90, lane, offset, t);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${color.join(',')},${strand === 0 ? .2 : .095})`;
        ctx.lineWidth = strand === 0 ? 1.3 : .8;
        ctx.stroke();
      }
      // Traveling marks follow the same paths, never random orbits.
      const count = mobile.matches ? 14 : 25;
      for (let i = 0; i < count; i++) {
        const u = (i / count + t * .036 + lane * .013) % 1;
        const merge = smooth((u - .1) / .75);
        const strand = Math.sin(i * 2.4 + lane) * 1.8;
        const [x, y] = point(u, lane, strand, t);
        const [nextX, nextY] = point(Math.min(1, u + .009), lane, strand, t);
        const rgb = color.map((c, j) => Math.round(c + (laneColors[0][j] - c) * merge));
        const fade = Math.min(1, u * 15, (1 - u) * 15);
        ctx.strokeStyle = `rgba(${rgb.join(',')},${fade * (.4 + merge * .3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nextX, nextY); ctx.stroke();
      }
      const label = point(0, lane, 0, t);
      ctx.font = `${mobile.matches ? 11 : 12}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = '#5f6572';
      ctx.fillText(names[lane], label[0], label[1] - 17);
    }
    // A soft, stable destination signals alignment without a flashy pulse.
    const end = point(.97, 1, 0, t);
    const glow = ctx.createRadialGradient(end[0], end[1], 0, end[0], end[1], w * .13);
    glow.addColorStop(0, 'rgba(32,77,255,.09)');
    glow.addColorStop(1, 'rgba(32,77,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(end[0], end[1], w * .13, 0, Math.PI * 2); ctx.fill();
  }
  function allowed() { return !paused && !reduced.matches && !document.hidden && field.visible; }
  function tick(now) {
    field.frame = 0;
    if (!allowed()) { field.last = null; return; }
    if (field.last === null) field.last = now;
    const delta = now - field.last;
    if (delta >= 1000 / 30) {
      field.time += Math.min(delta, 70) / 1000;
      field.last = now;
      field.x += (field.aimX - field.x) * .075;
      field.y += (field.aimY - field.y) * .075;
      draw();
    }
    field.frame = requestAnimationFrame(tick);
  }
  field.sync = () => {
    cancelAnimationFrame(field.frame);
    field.frame = 0;
    field.last = null;
    if (reduced.matches) { field.x = field.y = field.aimX = field.aimY = 0; }
    draw();
    if (allowed()) field.frame = requestAnimationFrame(tick);
  };
  const resize = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    field.width = rect.width; field.height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    field.sync();
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    field.visible = entry.isIntersecting;
    field.sync();
  });
  observer.observe(canvas);
  return field;
}).filter(Boolean);
function syncAll() {
  const stopped = paused || reduced.matches;
  buttons.forEach(button => {
    button.textContent = reduced.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(stopped));
    button.disabled = reduced.matches;
  });
  fields.forEach(field => field.sync());
}
buttons.forEach(button => button.addEventListener('click', () => { paused = !paused; syncAll(); }));
document.addEventListener('pointermove', event => {
  if (!finePointer.matches || reduced.matches || paused || mobile.matches) return;
  fields.forEach(field => {
    field.aimX = (Math.min(1, Math.max(0, event.clientX / innerWidth)) * 2 - 1) * 28;
    field.aimY = (Math.min(1, Math.max(0, event.clientY / innerHeight)) * 2 - 1) * 18;
  });
}, { passive: true });
function release() { fields.forEach(field => { field.aimX = field.aimY = 0; }); }
document.documentElement.addEventListener('pointerleave', release);
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', syncAll);
reduced.addEventListener('change', syncAll);
finePointer.addEventListener('change', () => { release(); syncAll(); });
mobile.addEventListener('change', () => { release(); syncAll(); });
syncAll();
