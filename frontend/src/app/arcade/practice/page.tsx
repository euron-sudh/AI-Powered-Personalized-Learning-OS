import { FloatingPixels, PixelBar, TopBar } from "@/components/arcade";

export default function ArcadePracticePage() {
  return (
    <div className="screen" style={{ minHeight: 1000, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
      <FloatingPixels count={10} />
      <TopBar active="Practice" />

      <div style={{ padding: "24px 32px", position: "relative", zIndex: 2 }}>
        <div style={{ marginBottom: 20 }}>
          <span className="label" style={{ color: "var(--neon-mag)" }}>⚔ BOSS BATTLE</span>
          <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
            Arithmetic <span style={{ color: "var(--neon-mag)" }}>Overlord</span>, Lv 4
          </h1>
          <p style={{ color: "var(--ink-dim)" }}>
            Beat the boss to unlock Chapter 4 and earn a gold badge.
          </p>
        </div>

        <div className="panel mag" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 70% 20%, rgba(255,62,165,0.25), transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(155,92,255,0.2), transparent 60%)",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              position: "relative",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="label" style={{ color: "var(--neon-cyan)" }}>You · Maya</span>
                <span className="label">HP 80 / 100</span>
              </div>
              <PixelBar value={80} color="var(--neon-cyan)" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="label" style={{ color: "var(--neon-mag)" }}>Overlord</span>
                <span className="label">HP 55 / 100</span>
              </div>
              <PixelBar value={55} color="var(--neon-mag)" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }} className="anim-float">
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 28,
                  margin: "0 auto",
                  background: "linear-gradient(135deg, #27e0ff, #9b5cff)",
                  border: "4px solid #170826",
                  boxShadow: "0 10px 0 #170826, 0 0 30px rgba(39,224,255,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 64,
                }}
              >
                🎮
              </div>
              <div
                className="pill"
                style={{ marginTop: 10, color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
              >
                Lv 7 · 320xp
              </div>
            </div>
            <div style={{ textAlign: "center" }} className="anim-wobble">
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 28,
                  margin: "0 auto",
                  background: "linear-gradient(135deg, #ff3ea5, #5c2fb8)",
                  border: "4px solid #170826",
                  boxShadow: "0 10px 0 #170826, 0 0 30px rgba(255,62,165,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 80,
                  position: "relative",
                }}
              >
                👾
                <div
                  style={{
                    position: "absolute",
                    top: -16,
                    left: -16,
                    background: "var(--neon-yel)",
                    color: "#170826",
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "2px solid #170826",
                    fontSize: 10,
                    fontFamily: "var(--f-display)",
                    fontWeight: 900,
                  }}
                >
                  BOSS
                </div>
              </div>
              <div
                className="pill"
                style={{ marginTop: 10, color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
              >
                Lv 4 · ELITE
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              padding: 22,
              background: "rgba(0,0,0,0.5)",
              border: "2px solid var(--line)",
              borderRadius: 16,
            }}
          >
            <span className="label" style={{ color: "var(--neon-yel)" }}>
              Question 4 / 8 · +15 dmg if correct
            </span>
            <h2 className="h-display" style={{ fontSize: 30, margin: "10px 0 18px" }}>
              What is <span style={{ color: "var(--neon-yel)" }}>3/4 + 1/2</span>?
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { t: "4/6", k: "A" },
                { t: "5/4", k: "B" },
                { t: "1 1/4", k: "C" },
                { t: "3/8", k: "D" },
              ].map((o, i) => (
                <button
                  key={i}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "2px solid var(--line)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 10,
                      fontFamily: "var(--f-pixel)",
                      fontSize: 9,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {o.k}
                  </div>
                  <div className="h-display" style={{ fontSize: 24 }}>{o.t}</div>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button className="pill" style={{ cursor: "pointer" }}>💡 Hint (3)</button>
              <button className="pill" style={{ cursor: "pointer" }}>⏱ Slow-mo (1)</button>
              <button className="pill" style={{ cursor: "pointer" }}>↻ Skip</button>
            </div>
            <button className="chunky-btn">⚔ ATTACK</button>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { t: "Multiplication", s: "92%", c: "var(--neon-lime)" },
            { t: "Division", s: "78%", c: "var(--neon-yel)" },
            { t: "Fractions", s: "64%", c: "var(--neon-ora)" },
            { t: "Decimals", s: "—", c: "var(--ink-mute)" },
          ].map((q, i) => (
            <div key={i} className="panel" style={{ padding: 14 }}>
              <div className="label">Last attempt</div>
              <div className="h-display" style={{ fontSize: 18, marginTop: 2 }}>{q.t}</div>
              <div className="h-display" style={{ fontSize: 26, color: q.c, marginTop: 6 }}>{q.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
