"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play, RotateCcw, Target } from "lucide-react";

const G = 9.81;
const W = 720;
const H = 360;
const GROUND_Y = H - 30;
const SCALE = 4; // pixels per metre

export default function ProjectileSimPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(40);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [landed, setLanded] = useState<{ range: number; height: number; flight: number } | null>(null);

  // Pre-compute analytical predictions
  const rad = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = speed * Math.sin(rad);
  const flightTime = (2 * vy) / G;
  const maxHeight = (vy * vy) / (2 * G);
  const range = (speed * speed * Math.sin(2 * rad)) / G;

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const baseTime = time;

    function tick(now: number) {
      const t = baseTime + (now - start) / 1000;
      const x = vx * t;
      const y = vy * t - 0.5 * G * t * t;

      if (y <= 0 && t > 0.05) {
        setLanded({ range: vx * t, height: maxHeight, flight: t });
        setRunning(false);
        setTime(t);
        return;
      }

      setTime(t);
      setTrail((prev) => [...prev, { x, y }]);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Draw
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, "#dbeafe");
    grad.addColorStop(1, "#eff6ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Ground
    ctx.fillStyle = "#86efac";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Predicted parabola (faint)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let t = 0; t <= flightTime; t += 0.05) {
      const px = vx * t * SCALE;
      const py = GROUND_Y - (vy * t - 0.5 * G * t * t) * SCALE;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Trail
    if (trail.length > 1) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((p, i) => {
        const px = p.x * SCALE;
        const py = GROUND_Y - p.y * SCALE;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Projectile
    const last = trail[trail.length - 1] || { x: 0, y: 0 };
    const px = Math.max(0, Math.min(W - 4, last.x * SCALE));
    const py = Math.max(4, GROUND_Y - last.y * SCALE);
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Launcher arrow at origin
    const arrowLen = 28;
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(arrowLen * Math.cos(rad), GROUND_Y - arrowLen * Math.sin(rad));
    ctx.stroke();

    // Range marker
    if (landed) {
      const rx = landed.range * SCALE;
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(rx, GROUND_Y);
      ctx.lineTo(rx, GROUND_Y - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${landed.range.toFixed(1)}m`, rx - 14, GROUND_Y - 16);
    }
  }, [trail, angle, speed, vx, vy, flightTime, landed, rad]);

  function reset() {
    setRunning(false);
    setTime(0);
    setTrail([]);
    setLanded(null);
  }

  function launch() {
    reset();
    setTimeout(() => setRunning(true), 50);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/learn"
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Back to Learn
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Target className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Projectile lab
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Tweak the angle and speed, see what physics predicts.
          </p>
        </header>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-deep)]"
          />

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Angle: {angle}°
              </label>
              <input
                type="range"
                min={5}
                max={85}
                value={angle}
                onChange={(e) => { setAngle(+e.target.value); reset(); }}
                disabled={running}
                className="w-full accent-[var(--brand-blue)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Speed: {speed} m/s
              </label>
              <input
                type="range"
                min={10}
                max={80}
                value={speed}
                onChange={(e) => { setSpeed(+e.target.value); reset(); }}
                disabled={running}
                className="w-full accent-[var(--brand-blue)]"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={running ? () => setRunning(false) : launch}
              className="flex-1 bg-[var(--brand-blue)] hover:opacity-90 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Launch</>}
            </button>
            <button
              onClick={reset}
              className="bg-white border border-[var(--border)] hover:bg-[var(--bg-deep)] text-[var(--text-body)] font-semibold rounded-xl py-2.5 px-4 text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Predictions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Range" value={`${range.toFixed(1)} m`} />
          <Stat label="Max height" value={`${maxHeight.toFixed(1)} m`} />
          <Stat label="Flight time" value={`${flightTime.toFixed(2)} s`} />
        </div>

        <section className="mt-4 bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card text-sm text-[var(--text-body)]">
          <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
            The physics
          </div>
          <p className="leading-relaxed">
            Horizontal: <span className="font-mono">x(t) = v·cos(θ)·t</span>. Vertical:{" "}
            <span className="font-mono">y(t) = v·sin(θ)·t − ½gt²</span> with g = 9.81 m/s². Range
            is maximised at θ = 45°. Try it — bump the angle past 45° and watch range fall.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mt-1">{value}</div>
    </div>
  );
}
