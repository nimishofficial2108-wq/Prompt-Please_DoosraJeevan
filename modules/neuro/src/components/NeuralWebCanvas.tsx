import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Pulse {
  sourceIdx: number;
  targetIdx: number;
  progress: number;
  speed: number;
}

export const NeuralWebCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initialize neural network nodes
    const nodeCount = Math.min(65, Math.floor((width * height) / 22000));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
        alpha: Math.random() * 0.4 + 0.25,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
      });
    }

    // Action potential pulses traveling along axons
    const pulses: Pulse[] = [];
    const maxPulses = 12;

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Subtle cybernetic grid dots
      ctx.fillStyle = 'rgba(34, 211, 238, 0.025)';
      const step = 48;
      for (let gx = 0; gx < width; gx += step) {
        for (let gy = 0; gy < height; gy += step) {
          ctx.fillRect(gx, gy, 1, 1);
        }
      }

      // Update nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        // Gentle boundary bounce
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Mouse proximity gentle interaction
        const dxM = n.x - mouseX;
        const dyM = n.y - mouseY;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < 120 && distM > 0) {
          const force = (120 - distM) / 120 * 0.2;
          n.x += (dxM / distM) * force;
          n.y += (dyM / distM) * force;
        }

        n.pulsePhase += n.pulseSpeed;
      }

      // Draw axon links between close nodes
      const maxDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Randomly spawn action potential pulse along this axon
            if (pulses.length < maxPulses && Math.random() < 0.003) {
              pulses.push({
                sourceIdx: i,
                targetIdx: j,
                progress: 0,
                speed: Math.random() * 0.02 + 0.015,
              });
            }
          }
        }
      }

      // Update & render action potential pulses
      for (let pIdx = pulses.length - 1; pIdx >= 0; pIdx--) {
        const p = pulses[pIdx];
        p.progress += p.speed;

        if (p.progress >= 1.0) {
          pulses.splice(pIdx, 1);
          continue;
        }

        const s = nodes[p.sourceIdx];
        const t = nodes[p.targetIdx];
        if (!s || !t) {
          pulses.splice(pIdx, 1);
          continue;
        }

        const px = s.x + (t.x - s.x) * p.progress;
        const py = s.y + (t.y - s.y) * p.progress;

        // Glowing pulse head
        ctx.beginPath();
        ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
        ctx.arc(px, py, 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.arc(px, py, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render synaptic nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = 1 + Math.sin(n.pulsePhase) * 0.25;
        const rad = n.radius * pulse;

        // Outer glow
        ctx.beginPath();
        ctx.fillStyle = `rgba(34, 211, 238, ${n.alpha * 0.35})`;
        ctx.arc(n.x, n.y, rad * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.fillStyle = `rgba(34, 211, 238, ${n.alpha})`;
        ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
      style={{ background: '#000000' }}
    />
  );
};
