import { FloatingPixels, PixelBar, SUBJECTS, SubjectChip, TopBar } from "@/components/arcade";

export default function ArcadeLearnPage() {
  const nodes = [
    { subj: SUBJECTS[0], x: 8,  y: 78, status: "done" as const },
    { subj: SUBJECTS[2], x: 26, y: 56, status: "active" as const },
    { subj: SUBJECTS[1], x: 44, y: 68, status: "unlocked" as const },
    { subj: SUBJECTS[4], x: 58, y: 36, status: "unlocked" as const },
    { subj: SUBJECTS[5], x: 72, y: 50, status: "locked" as const },
    { subj: SUBJECTS[3], x: 88, y: 18, status: "locked" as const },
  ];
  return (
    <div className="screen" style={{ minHeight: 1300, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
      <FloatingPixels count={14} />
      <TopBar active="Learn" />

      <div style={{ padding: "28px 32px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>World Map · Grade 6</span>
            <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 6px" }}>
              Choose your <span style={{ color: "var(--neon-mag)" }}>adventure</span>
            </h1>
            <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>6 worlds · 52 chapters · 14 boss battles</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pill" style={{ cursor: "pointer" }}>All</button>
            <button
              className="pill"
              style={{ cursor: "pointer", color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
            >
              In progress
            </button>
            <button className="pill" style={{ cursor: "pointer" }}>Locked</button>
          </div>
        </div>

        <div className="panel" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <svg viewBox="0 0 1000 420" style={{ width: "100%", height: 420, display: "block" }}>
            <path
              d="M 80 340 Q 200 220, 300 300 T 520 180 Q 620 120, 720 200 T 920 80"
              stroke="var(--neon-vio)"
              strokeWidth="4"
              strokeDasharray="4 14"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>

          {nodes.map((n, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
              className={n.status === "active" ? "anim-float" : ""}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 24,
                  background:
                    n.status === "locked"
                      ? "rgba(255,255,255,0.04)"
                      : `linear-gradient(135deg, ${n.subj.color}40, transparent)`,
                  border:
                    "3px solid " + (n.status === "locked" ? "var(--ink-mute)" : n.subj.color),
                  display: "grid",
                  placeItems: "center",
                  boxShadow:
                    n.status === "locked"
                      ? "0 6px 0 #170826"
                      : `0 6px 0 #170826, 0 0 24px ${n.subj.color}`,
                  fontSize: 40,
                  color: n.subj.color,
                  fontFamily: "var(--f-display)",
                  fontWeight: 900,
                  position: "relative",
                  filter: n.status === "locked" ? "grayscale(1) opacity(0.5)" : "none",
                }}
              >
                {n.status === "locked" ? "🔒" : n.subj.icon}
                {n.status === "active" && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: -12,
                      background: "var(--neon-yel)",
                      color: "#170826",
                      padding: "3px 8px",
                      borderRadius: 8,
                      border: "2px solid #170826",
                      fontSize: 9,
                      fontFamily: "var(--f-display)",
                      fontWeight: 900,
                    }}
                  >
                    YOU
                  </div>
                )}
                {n.status === "done" && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      background: "var(--neon-lime)",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: "2px solid #170826",
                      display: "grid",
                      placeItems: "center",
                      color: "#170826",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
              <div
                className="h-display"
                style={{
                  fontSize: 14,
                  marginTop: 10,
                  color: n.status === "locked" ? "var(--ink-mute)" : "var(--ink)",
                }}
              >
                {n.subj.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-mute)",
                  fontFamily: "var(--f-display)",
                  fontWeight: 700,
                }}
              >
                {n.status === "locked" ? "Reach Lv 10" : `Lv ${i + 2}`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2 className="h-display" style={{ fontSize: 22, marginBottom: 14 }}>
            Keep playing
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {SUBJECTS.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="panel"
                style={{ padding: 20, position: "relative", overflow: "hidden" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${s.color}22, transparent 70%)`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 14,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <SubjectChip subject={s} />
                    <div>
                      <div className="h-display" style={{ fontSize: 20 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                        World {s.id === "math" ? 1 : 2} · 24 quests
                      </div>
                    </div>
                  </div>
                  <div className="pill" style={{ color: s.color, borderColor: s.color }}>
                    {s.progress}%
                  </div>
                </div>
                <PixelBar value={s.progress} color={s.color} />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {["Intro", "Boss", "Mini-quiz"].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: "1.5px solid var(--line-soft)",
                        background: i === 0 ? `${s.color}22` : "rgba(255,255,255,0.04)",
                        color: i === 0 ? s.color : "var(--ink-dim)",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
