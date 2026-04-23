import { Byte, FloatingPixels } from "@/components/arcade";

export default function ArcadeOnboardingPage() {
  const step = 3;
  const total = 6;
  const worlds = [
    { n: "Math", i: "∑", c: "var(--s-math)", on: true },
    { n: "Science", i: "⚛", c: "var(--s-sci)", on: true },
    { n: "English", i: "A", c: "var(--s-eng)", on: false },
    { n: "Coding", i: "</>", c: "var(--s-cs)", on: true },
    { n: "Arts", i: "✦", c: "var(--s-art)", on: false },
    { n: "History", i: "⚜", c: "var(--s-his)", on: false },
  ];
  return (
    <div className="screen" style={{ minHeight: 900, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
      <FloatingPixels count={20} />

      <div style={{ padding: 28, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 30 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 4,
                background: i < step ? "var(--neon-cyan)" : "rgba(255,255,255,0.08)",
                boxShadow: i < step ? "0 0 10px var(--neon-cyan)" : "none",
                border: "2px solid " + (i < step ? "var(--neon-cyan)" : "var(--line-soft)"),
              }}
            />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <span className="label" style={{ color: "var(--neon-yel)" }}>
              Step {step} of {total}
            </span>
            <h1 className="h-display" style={{ fontSize: 48, margin: "10px 0 14px" }}>
              Which <span style={{ color: "var(--neon-mag)" }}>worlds</span>
              <br />
              spark your brain?
            </h1>
            <p style={{ color: "var(--ink-dim)", fontSize: 16, maxWidth: 440, marginBottom: 24 }}>
              Pick 3+ favorites. Byte will build your first quest path from them. You can change this anytime.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                maxWidth: 500,
              }}
            >
              {worlds.map((s, i) => (
                <button
                  key={i}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: s.on ? `${s.c}22` : "rgba(0,0,0,0.3)",
                    border: "3px solid " + (s.on ? s.c : "var(--line)"),
                    boxShadow: s.on
                      ? `0 4px 0 #170826, 0 0 18px ${s.c}`
                      : "0 4px 0 #170826",
                    color: "var(--ink)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transform: s.on ? "translateY(-2px)" : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      color: s.c,
                      textShadow: `0 0 14px ${s.c}`,
                      fontFamily: "var(--f-display)",
                      fontWeight: 900,
                    }}
                  >
                    {s.i}
                  </div>
                  <div className="h-display" style={{ fontSize: 14 }}>{s.n}</div>
                  {s.on && (
                    <div
                      style={{
                        fontSize: 10,
                        color: s.c,
                        fontFamily: "var(--f-display)",
                        fontWeight: 900,
                      }}
                    >
                      ✓ PICKED
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
              <button className="pill" style={{ cursor: "pointer" }}>← Back</button>
              <button className="chunky-btn cyan">Continue ▶</button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div className="anim-float" style={{ position: "relative" }}>
              <Byte size={200} />
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -80,
                  background: "var(--neon-yel)",
                  color: "#170826",
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "3px solid #170826",
                  fontWeight: 800,
                  fontSize: 13,
                  boxShadow: "0 4px 0 #170826",
                  transform: "rotate(4deg)",
                  maxWidth: 200,
                }}
              >
                You got this, new hero!
                <div
                  style={{
                    position: "absolute",
                    bottom: -8,
                    left: 20,
                    width: 0,
                    height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "10px solid #170826",
                  }}
                />
              </div>
            </div>
            <div
              className="panel"
              style={{ padding: 18, maxWidth: 320, textAlign: "center" }}
            >
              <div className="label">Meet</div>
              <div className="h-display" style={{ fontSize: 20, margin: "4px 0" }}>
                Byte, your buddy
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                I&apos;ll quiz you, cheer you on, and never judge a mistake. Ready to roll?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
