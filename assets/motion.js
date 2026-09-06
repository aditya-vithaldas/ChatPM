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
  // Deterministic sampling prevents a reshuffle when resized or paused.
  field.particles = Array.from({ length: 144 }, (_, i) => ({
    phase: i * 2.39996323,
    radius: Math.sqrt((i + .5) / 144),
    speed: .075 + (i % 7) * .003,
    size: 1.1 + (i % 4) * .3,
    slate: i % 5 === 0,
  }));
  function draw() {
    const { width: w, height: h, time: t, context: ctx } = field;
    ctx.clearRect(0, 0, w, h);
    const stride = mobile.matches ? 2.4 : 1;
    const count = mobile.matches ? 60 : 144;
    for (let i = 0; i < count; i++) {
      const p = field.particles[Math.floor(i * stride)];
      const a = p.phase + t * p.speed;
      const breathing = 1 + .055 * Math.sin(t * .16 + p.radius * 3);
      const depth = (Math.sin(a + p.radius * 2) + 1) / 2;
      const spread = p.radius * breathing;
      const dx = Math.cos(a) * spread * .37 + Math.sin(a * 2 + t * .09) * .045;
      const dy = Math.sin(a) * spread * .265 + Math.sin(a * 1.5 + t * .13) * .065;
      const px = w * (.5 + dx) + field.x * (.25 + depth * .75);
      const py = h * (.46 + dy) + field.y * (.25 + depth * .75);
      const opacity = .25 + depth * .38;
      ctx.strokeStyle = p.slate ? `rgba(95,101,114,${opacity})` : `rgba(32,77,255,${opacity})`;
      ctx.lineWidth = p.size * (.65 + depth * .35);
      ctx.lineCap = 'round';
      // Short tangent strokes give the field a flowing, swarm-like texture.
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - Math.sin(a) * (1.8 + depth * 2), py + Math.cos(a) * (1.8 + depth * 2));
      ctx.stroke();
    }
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
