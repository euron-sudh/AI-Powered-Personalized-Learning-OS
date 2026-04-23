"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play, RotateCcw, Target } from "lucide-react";
import { ArcadeShell } from "@/components/arcade";

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
    <ArcadeShell active="Practice" pixels={12}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Back link + header */}
        <Link
          href="/learn"
          className="pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--neon-cyan)",
            borderColor: "var(--neon-cyan)",
            background: "transparent",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          <ChevronLeft className="w-3 h-3" /> BACK TO LEARN
        </Link>

        <div style={{ marginBottom: 22 }}>
          <span className="label" style={{ color: "var(--neon-lime)" }}>
            <Target className="w-3 h-3" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            PHYSICS LAB
          </span>
          <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
            Projectile <span style={{ color: "var(--neon-mag)" }}>Lab</span>
          </h1>
          <p style={{ color: "var(--ink-dim)" }}>
            Dial the launcher. Predict with physics. Fire and verify.
          </p>
        </div>

        {/* Main grid: canvas + sidebar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Canvas panel */}
          <div className="panel cyan" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
            <div className="scanline" />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span className="label" style={{ color: "var(--neon-cyan)" }}>
                  ◉ LAUNCH CHAMBER
                </span>
                <span
                  className="label"
                  style={{
                    color: running ? "var(--neon-mag)" : landed ? "var(--neon-lime)" : "var(--ink-mute)",
                  }}
                >
                  {running ? "▶ FIRING" : landed ? "✓ LANDED" : "⏸ ARMED"}
                </span>
              </div>

              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{
                  width: "100%",
                  display: "block",
                  borderRadius: 14,
                  border: "3px solid #170826",
                  boxShadow: "0 6px 0 0 #0a0515, 0 0 24px rgba(39,224,255,0.35)",
                  background: "#eff6ff",
                }}
              />

              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  fontFamily: "var(--f-body)",
                }}
              >
                Dotted line = predicted parabola · solid blue = live trail · red marker = range.
              </p>
            </div>
          </div>

          {/* Sidebar: controls + predicted stats */}
          <div style={{ display: "grid", gap: 16 }}>
            {/* Controls panel */}
            <div className="panel mag" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative" }}>
                <span className="label" style={{ color: "var(--neon-mag)" }}>⚙ CONTROLS</span>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 6,
                    }}
                  >
                    <span className="label" style={{ color: "var(--neon-cyan)" }}>Angle</span>
                    <span
                      className="h-display"
                      style={{ fontSize: 20, color: "var(--neon-cyan)" }}
                    >
                      {angle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={85}
                    value={angle}
                    onChange={(e) => { setAngle(+e.target.value); reset(); }}
                    disabled={running}
                    style={{ width: "100%", accentColor: "#27e0ff" }}
                  />
                </div>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 6,
                    }}
                  >
                    <span className="label" style={{ color: "var(--neon-yel)" }}>Speed</span>
                    <span
                      className="h-display"
                      style={{ fontSize: 20, color: "var(--neon-yel)" }}
                    >
                      {speed} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    value={speed}
                    onChange={(e) => { setSpeed(+e.target.value); reset(); }}
                    disabled={running}
                    style={{ width: "100%", accentColor: "#ffe53d" }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.4)",
                    border: "2px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="label">Gravity</span>
                  <span
                    className="h-display"
                    style={{ fontSize: 14, color: "var(--neon-ora)" }}
                  >
                    {G} m/s²
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                  <button
                    onClick={running ? () => setRunning(false) : launch}
                    className="chunky-btn"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12,
                    }}
                  >
                    {running ? (
                      <>
                        <Pause className="w-4 h-4" /> PAUSE
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> FIRE!
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    className="pill"
                    style={{
                      cursor: "pointer",
                      color: "var(--neon-yel)",
                      borderColor: "var(--neon-yel)",
                      background: "transparent",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <RotateCcw className="w-3 h-3" /> RESET
                  </button>
                </div>
              </div>
            </div>

            {/* Predictions */}
            <div className="panel yel" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative" }}>
                <span className="label" style={{ color: "var(--neon-yel)" }}>
                  ✦ PREDICTED (analytical)
                </span>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  <StatTile label="Range" value={`${range.toFixed(1)} m`} color="var(--neon-cyan)" />
                  <StatTile label="Max height" value={`${maxHeight.toFixed(1)} m`} color="var(--neon-lime)" />
                  <StatTile label="Flight time" value={`${flightTime.toFixed(2)} s`} color="var(--neon-mag)" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The physics */}
        <div
          className="panel"
          style={{
            marginTop: 20,
            padding: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span className="label" style={{ color: "var(--neon-vio)" }}>📖 THE PHYSICS</span>
          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "var(--ink-dim)" }}>
            Horizontal:{" "}
            <span
              className="pixel"
              style={{ color: "var(--neon-cyan)", fontSize: 13 }}
            >
              x(t) = v·cos(θ)·t
            </span>
            . Vertical:{" "}
            <span
              className="pixel"
              style={{ color: "var(--neon-mag)", fontSize: 13 }}
            >
              y(t) = v·sin(θ)·t − ½gt²
            </span>{" "}
            with g = 9.81 m/s². Range is maximised at{" "}
            <span className="h-display" style={{ color: "var(--neon-yel)" }}>θ = 45°</span>
            . Try it — bump the angle past 45° and watch the range fall.
          </p>
        </div>
      </div>
    </ArcadeShell>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.45)",
        border: `2px solid ${color}`,
        boxShadow: `0 0 14px ${color}33`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span className="label" style={{ color: "var(--ink-dim)" }}>{label}</span>
      <span
        className="h-display"
        style={{
          fontSize: 18,
          color,
          textShadow: `0 0 10px ${color}`,
        }}
      >
        {value}
      </span>
    </div>
  );
}
