// Local, bounded motion. Never blocks reading or navigation.
const visual = document.querySelector('.hero-visual');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
let frame = 0;
let x = 0, y = 0, targetX = 0, targetY = 0;
function tick() {
  x += (targetX - x) * 0.12;
  y += (targetY - y) * 0.12;
  visual.style.setProperty('--mx', x.toFixed(3));
  visual.style.setProperty('--my', y.toFixed(3));
  frame = Math.abs(targetX - x) + Math.abs(targetY - y) > .002 ? requestAnimationFrame(tick) : 0;
}
function move(event) {
  if (!visual || reduced.matches || !pointer.matches) return;
  targetX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
  targetY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
  if (!frame) frame = requestAnimationFrame(tick);
}
function reset() {
  targetX = targetY = 0;
  if (reduced.matches || !pointer.matches) {
    cancelAnimationFrame(frame); frame = 0; x = y = 0;
    visual?.style.removeProperty('--mx'); visual?.style.removeProperty('--my');
  } else if (visual && !frame) frame = requestAnimationFrame(tick);
}
document.addEventListener('pointermove', move, { passive: true });
document.documentElement.addEventListener('pointerleave', reset);
window.addEventListener('blur', reset);
reduced.addEventListener('change', reset);
pointer.addEventListener('change', reset);
