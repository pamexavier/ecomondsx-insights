import { useEffect, useRef } from "react";

interface Props {
  text: string;
  className?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

/**
 * Renders text using canvas, sampling pixels and animating particles
 * that converge from scattered positions into the final letterforms.
 */
export function ShatterText({
  text,
  className,
  fontSize = 72,
  fontWeight = 700,
  color = "#1FE08A",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement!;
    const cssW = parent.clientWidth;
    // measure text to size canvas
    ctx.font = `${fontWeight} ${fontSize}px "Space Grotesk", sans-serif`;
    const metrics = ctx.measureText(text);
    const cssH = Math.ceil(fontSize * 1.3);
    const textW = Math.min(metrics.width, cssW);

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.scale(dpr, dpr);

    // draw target text to sample
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.font = `${fontWeight} ${fontSize}px "Space Grotesk", sans-serif`;
    const startX = (cssW - textW) / 2;
    ctx.fillText(text, startX, cssH / 2);

    const img = ctx.getImageData(0, 0, cssW * dpr, cssH * dpr);
    const data = img.data;
    const step = Math.max(2, Math.round(3 * dpr));
    type P = { tx: number; ty: number; x: number; y: number; vx: number; vy: number };
    const particles: P[] = [];
    for (let y = 0; y < cssH * dpr; y += step) {
      for (let x = 0; x < cssW * dpr; x += step) {
        const a = data[(y * cssW * dpr + x) * 4 + 3];
        if (a > 128) {
          const tx = x / dpr;
          const ty = y / dpr;
          particles.push({
            tx,
            ty,
            x: tx + (Math.random() - 0.5) * cssW * 1.2,
            y: ty + (Math.random() - 0.5) * cssH * 4,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let raf = 0;
    let t = 0;
    const duration = 90; // frames
    const render = () => {
      t++;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = color;
      const progress = Math.min(1, t / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.x + (p.tx - p.x) * (0.08 + ease * 0.15);
        p.y = p.y + (p.ty - p.y) * (0.08 + ease * 0.15);
        const size = 1.2 + (1 - ease) * 1.5;
        ctx.globalAlpha = 0.4 + ease * 0.6;
        ctx.fillRect(p.x, p.y, size, size);
      }
      ctx.globalAlpha = 1;
      if (t < duration + 30) raf = requestAnimationFrame(render);
      else {
        // final crisp text
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = color;
        ctx.font = `${fontWeight} ${fontSize}px "Space Grotesk", sans-serif`;
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillText(text, startX, cssH / 2);
        ctx.shadowBlur = 0;
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [text, fontSize, fontWeight, color]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} aria-label={text} />
    </div>
  );
}
