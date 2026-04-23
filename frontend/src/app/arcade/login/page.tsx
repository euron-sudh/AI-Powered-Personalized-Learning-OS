import { Byte, FloatingPixels } from "@/components/arcade";

export default function ArcadeLoginPage() {
  const stats = [
    { k: "Players", v: "2.4M" },
    { k: "Quests", v: "50k+" },
    { k: "Buddies", v: "∞" },
  ];
  return (
    <div
      className="screen"
      style={{ minHeight: 900, position: "relative", display: "grid", placeItems: "center" }}
    >
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
      <FloatingPixels count={22} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          maxWidth: 900,
          padding: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                border: "3px solid #170826",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 6px 0 #170826, 0 0 24px rgba(255,62,165,0.5)",
                fontFamily: "var(--f-pixel)",
                fontSize: 24,
                color: "#fff",
              }}
            >
              L
            </div>
            <div className="h-display" style={{ fontSize: 32 }}>
              Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
            </div>
          </div>
          <h1 className="h-display" style={{ fontSize: 52, lineHeight: 1.02, marginBottom: 18 }}>
            School, but <span style={{ color: "var(--neon-yel)" }}>fun</span>.<br />
            Press <span style={{ color: "var(--neon-mag)" }}>start</span> to play.
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, maxWidth: 380 }}>
            Quests, boss battles, and a tiny buddy named Byte. Grades K–12.
          </p>
          <div style={{ display: "flex", gap: 18, marginTop: 28 }}>
            {stats.map((s) => (
              <div key={s.k}>
                <div className="h-display" style={{ fontSize: 24, color: "var(--neon-cyan)" }}>
                  {s.v}
                </div>
                <div className="label">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="panel cyan"
          style={{ padding: 32, position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ margin: "0 auto 12px", display: "inline-block" }}>
              <Byte size={72} />
            </div>
            <div className="h-display" style={{ fontSize: 22 }}>
              Welcome back, hero
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
              Sign in to resume your quest
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label>
              <div className="label" style={{ marginBottom: 6 }}>Email</div>
              <input
                placeholder="you@school.edu"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "2px solid var(--line)",
                  background: "rgba(0,0,0,0.35)",
                  color: "var(--ink)",
                  fontFamily: "var(--f-body)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>
            <label>
              <div className="label" style={{ marginBottom: 6 }}>Password</div>
              <input
                type="password"
                defaultValue="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "2px solid var(--line)",
                  background: "rgba(0,0,0,0.35)",
                  color: "var(--ink)",
                  fontFamily: "var(--f-body)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>
            <button
              className="chunky-btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            >
              ▶ Press Start
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-mute)" }}>
              — or —
            </div>
            <button
              className="pill"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                cursor: "pointer",
              }}
            >
              Continue with Google
            </button>
            <button
              className="pill"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                cursor: "pointer",
              }}
            >
              Continue as Guest
            </button>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 18,
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            New here?{" "}
            <span style={{ color: "var(--neon-cyan)", fontWeight: 700 }}>
              Create your player
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
