import { Byte, FloatingPixels, TopBar } from "@/components/arcade";

type Msg = { who: "byte" | "me"; text: string; image?: boolean };

const MSGS: Msg[] = [
  { who: "byte", text: "Hey Maya! Ready to break down today's Science chapter?" },
  { who: "me",   text: "yes! but quickly — what's photosynthesis again 😅" },
  { who: "byte", text: "Plants eating sunlight! They take in CO₂ + water + light → make sugar + oxygen. Wanna see a drawing?" },
  { who: "me",   text: "yes pls" },
  { who: "byte", image: true, text: "Here you go — sunlight zaps into leaves, plant factory goes brrr." },
  { who: "me",   text: "ohhh makes sense. quiz me on it?" },
];

export default function ArcadeBuddyPage() {
  return (
    <div className="screen" style={{ minHeight: 1000, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
      <FloatingPixels count={12} />
      <TopBar active="Buddy" />

      <div
        style={{
          padding: "24px 32px",
          display: "grid",
          gridTemplateColumns: "320px 1fr 280px",
          gap: 18,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="panel"
          style={{ padding: 22, textAlign: "center", position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 30%, rgba(155,92,255,0.35), transparent 60%)",
            }}
          />
          <div style={{ position: "relative", marginTop: 10, display: "inline-block" }}>
            <Byte size={160} />
          </div>
          <h2 className="h-display" style={{ fontSize: 26, marginTop: 16 }}>Byte</h2>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>
            Your study buddy · Lv 12
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { k: "Mood", v: "Pumped", c: "var(--neon-lime)", i: "🤩" },
              { k: "Energy", v: "98%", c: "var(--neon-cyan)", i: "⚡" },
              { k: "Chats", v: "47", c: "var(--neon-yel)", i: "💬" },
              { k: "Bond", v: "♥♥♥", c: "var(--neon-mag)", i: "💖" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.3)",
                  border: "1.5px solid var(--line-soft)",
                }}
              >
                <div style={{ fontSize: 16 }}>{s.i}</div>
                <div className="label" style={{ fontSize: 9 }}>{s.k}</div>
                <div className="h-display" style={{ fontSize: 14, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div className="label">Equipped</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
            {["🎩", "🕶", "🎸"].map((i, idx) => (
              <div
                key={idx}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.4)",
                  border: "2px solid var(--neon-vio)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 18,
                }}
              >
                {i}
              </div>
            ))}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(0,0,0,0.4)",
                border: "2px dashed var(--ink-mute)",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              +
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 680 }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "2px solid var(--line-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div className="h-display" style={{ fontSize: 18 }}>Chat with Byte</div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                Science · Photosynthesis · 6 msgs
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="pill" style={{ cursor: "pointer" }}>↻ New chat</button>
              <button
                className="pill"
                style={{ cursor: "pointer", color: "var(--neon-yel)", borderColor: "var(--neon-yel)" }}
              >
                🎯 Quiz me
              </button>
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
            {MSGS.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: m.who === "me" ? "row-reverse" : "row",
                  alignItems: "flex-end",
                }}
              >
                {m.who === "byte" ? (
                  <div style={{ width: 36, height: 36, flexShrink: 0 }}>
                    <Byte size={36} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-vio))",
                      border: "2px solid #170826",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    M
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: m.who === "byte" ? "rgba(155,92,255,0.12)" : "var(--neon-cyan)",
                    color: m.who === "byte" ? "var(--ink)" : "#170826",
                    border: "2px solid " + (m.who === "byte" ? "var(--line)" : "#170826"),
                    fontSize: 14,
                    fontWeight: m.who === "me" ? 600 : 400,
                  }}
                >
                  {m.image && (
                    <div
                      style={{
                        height: 120,
                        marginBottom: 8,
                        borderRadius: 8,
                        background: "linear-gradient(180deg, #27e0ff 0%, #a6ff3b 100%)",
                        position: "relative",
                        overflow: "hidden",
                        border: "2px solid #170826",
                      }}
                    >
                      <div style={{ position: "absolute", top: 10, right: 14, fontSize: 32 }}>☀️</div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 50,
                          background: "#a6ff3b",
                        }}
                      />
                      {["🌱", "🌿", "🪴"].map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            bottom: 36,
                            left: `${20 + idx * 28}%`,
                            fontSize: 22,
                          }}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                color: "var(--ink-mute)",
                fontSize: 12,
              }}
            >
              <div style={{ width: 36, height: 36 }}>
                <Byte size={36} />
              </div>
              Byte is typing<span className="anim-glow" style={{ color: "var(--neon-cyan)" }}>...</span>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderTop: "2px solid var(--line-soft)",
              display: "flex",
              gap: 10,
            }}
          >
            <input
              placeholder="Ask Byte anything..."
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.35)",
                border: "2px solid var(--line)",
                color: "var(--ink)",
                fontSize: 14,
                fontFamily: "var(--f-body)",
                outline: "none",
              }}
            />
            <button className="chunky-btn cyan" style={{ padding: "12px 18px" }}>Send ▶</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel yel" style={{ padding: 16 }}>
            <div className="label" style={{ color: "var(--neon-yel)" }}>Suggest</div>
            <div className="h-display" style={{ fontSize: 16, margin: "6px 0 12px" }}>
              Try asking Byte
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Explain mitosis like I'm 8",
                "Quiz me on fractions",
                "Why is the sky blue?",
                "Help with homework",
              ].map((q, i) => (
                <button
                  key={i}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.3)",
                    border: "1.5px solid var(--line-soft)",
                    color: "var(--ink-dim)",
                    cursor: "pointer",
                  }}
                >
                  💭 {q}
                </button>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 16 }}>
            <div className="label">Byte&apos;s memory</div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 8, lineHeight: 1.6 }}>
              Remembers: you love{" "}
              <b style={{ color: "var(--neon-mag)" }}>soccer</b>, struggle with{" "}
              <b style={{ color: "var(--neon-yel)" }}>long division</b>, and crushed the last{" "}
              <b style={{ color: "var(--neon-lime)" }}>spelling</b> quiz.
            </div>
            <button className="pill" style={{ marginTop: 12, cursor: "pointer" }}>
              Manage memory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
