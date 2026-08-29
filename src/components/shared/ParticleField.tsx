'use client';

import { useEffect, useRef } from 'react';

/**
 * Canvas-based gold particle field. Hardware accelerated, <50 particles,
 * pauses under prefers-reduced-motion.
 */
export default function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = 36;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: (Math.random() * 1.6 + 0.6) * dpr,
      speed: Math.random() / 12000 + 1 / 24000,
      drift: (Math.random() - 0.5) / 8000,
      alpha: Math.random() * 0.35 + 0.12,
    }));

    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y -= p.speed * dt;
        p.x += p.drift * dt;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
