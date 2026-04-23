import { PixelBar, TopBar } from "@/components/arcade";

export default function ArcadeLessonPage() {
  const steps = [
    "What is a fraction?",
    "Numerator vs denominator",
    "Splitting the pizza",
    "Equivalent fractions",
    "Adding fractions",
    "Subtracting",
    "Mini-quiz",
    "Boss battle",
  ];
  return (
    <div className="screen" style={{ minHeight: 1100, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
      <TopBar active="Learn" />

      <div style={{ padding: "20px 32px", position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            color: "var(--ink-mute)",
            marginBottom: 14,
          }}
        >
          <span className="label">Math</span>
          <span>›</span>
          <span className="label">World 2</span>
          <span>›</span>
          <span className="label" style={{ color: "var(--neon-cyan)" }}>Fractions &amp; You</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          <div className="panel" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
            <div className="scanline" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 }}>
              <div>
                <span
                  className="pill"
                  style={{ color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
                >
                  Chapter 3 / 12
                </span>
                <h1 className="h-display" style={{ fontSize: 36, margin: "10px 0 6px" }}>
                  Splitting the <span style={{ color: "var(--neon-yel)" }}>pizza</span>, fairly.
                </h1>
                <p style={{ color: "var(--ink-dim)", maxWidth: 600 }}>
                  When three friends share a pizza, how much does each get? Drag the slices below to split the pie into equal parts.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  className="pill"
                  style={{ color: "var(--neon-lime)", borderColor: "var(--neon-lime)" }}
                >
                  ⏱ 12:04
                </div>
                <div className="pill">3 / 8 steps</div>
              </div>
            </div>

            <div
              style={{
                height: 340,
                borderRadius: 16,
                background: "radial-gradient(circle at center, #201343, #0b0716)",
                border: "2px solid var(--line)",
                position: "relative",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg width="220" height="220" viewBox="-110 -110 220 220">
                <circle r="100" fill="#ffb547" stroke="#170826" strokeWidth="4" />
                <circle r="92" fill="#ff8a3d" opacity="0.2" />
                {[
                  [30, -40],
                  [-40, 20],
                  [10, 50],
                  [-50, -30],
                  [50, 30],
                ].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="11" fill="#ff3ea5" stroke="#170826" strokeWidth="2" />
                ))}
                {[0, 120, 240].map((a, i) => {
                  const rad = ((a - 90) * Math.PI) / 180;
                  return (
                    <line
                      key={i}
                      x1="0"
                      y1="0"
                      x2={Math.cos(rad) * 100}
                      y2={Math.sin(rad) * 100}
                      stroke="#170826"
                      strokeWidth="4"
                      strokeDasharray="6 4"
                    />
                  );
                })}
              </svg>
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  background: "rgba(0,0,0,0.5)",
                  border: "2px solid var(--line)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  maxWidth: 280,
                }}
              >
                <b style={{ color: "var(--neon-cyan)" }}>Byte:</b> Each friend gets one-third of the pizza — one slice each!
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  fontFamily: "var(--f-pixel)",
                  color: "var(--neon-yel)",
                  fontSize: 10,
                }}
              >
                TRY IT →
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
              {[
                { t: "1/2", sub: "two halves", correct: false },
                { t: "1/3", sub: "three thirds", correct: true },
                { t: "1/4", sub: "four quarters", correct: false },
                { t: "2/3", sub: "two thirds", correct: false },
              ].map((o, i) => (
                <button
                  key={i}
                  style={{
                    padding: "18px 12px",
                    borderRadius: 14,
                    background: o.correct ? "rgba(166,255,59,0.08)" : "rgba(0,0,0,0.35)",
                    border: "2px solid " + (o.correct ? "var(--neon-lime)" : "var(--line)"),
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    className="h-display"
                    style={{
                      fontSize: 28,
                      color: o.correct ? "var(--neon-lime)" : "var(--ink)",
                    }}
                  >
                    {o.t}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{o.sub}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button className="pill" style={{ cursor: "pointer" }}>← Back</button>
              <button className="chunky-btn cyan">Check Answer ▶</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="panel cyan" style={{ padding: 16 }}>
              <div className="label" style={{ color: "var(--neon-cyan)" }}>Lesson progress</div>
              <div className="h-display" style={{ fontSize: 30, margin: "4px 0 12px" }}>37%</div>
              <PixelBar value={37} color="var(--neon-cyan)" />
              <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 8 }}>+60 XP if you finish</div>
            </div>

            <div className="panel" style={{ padding: 16 }}>
              <div className="label">Steps</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {steps.map((t, i) => {
                  const state = i < 2 ? "done" : i === 2 ? "active" : "locked";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: state === "active" ? "rgba(39,224,255,0.10)" : "transparent",
                        border:
                          "1.5px solid " +
                          (state === "active" ? "var(--neon-cyan)" : "transparent"),
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background:
                            state === "done"
                              ? "var(--neon-lime)"
                              : state === "active"
                                ? "var(--neon-cyan)"
                                : "rgba(255,255,255,0.06)",
                          color: "#170826",
                          fontWeight: 900,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          border: "2px solid #170826",
                        }}
                      >
                        {state === "done" ? "✓" : state === "active" ? "▶" : i + 1}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: state === "locked" ? "var(--ink-mute)" : "var(--ink)",
                        }}
                      >
                        {t}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 38 }}>💡</div>
              <div className="h-display" style={{ fontSize: 14, marginTop: 4 }}>Stuck? Ask Byte</div>
              <button
                className="chunky-btn yel"
                style={{ marginTop: 10, fontSize: 12, padding: "10px 14px" }}
              >
                Use Hint (3 left)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
