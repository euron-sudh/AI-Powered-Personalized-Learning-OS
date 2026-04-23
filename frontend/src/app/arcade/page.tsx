import { FloatingPixels, PixelBar, SUBJECTS, SubjectChip, TopBar } from "@/components/arcade";

export default function ArcadeDashboardPage() {
  return (
    <div className="screen" style={{ minHeight: 1400, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
      <FloatingPixels count={22} />

      <TopBar active="Dashboard" />

      <div style={{ padding: "28px 32px", position: "relative", zIndex: 2 }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 20,
            marginBottom: 24,
          }}
        >
          <div
            className="panel mag"
            style={{ padding: 28, position: "relative", overflow: "hidden" }}
          >
            <div className="scanline" />
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,62,165,0.35), transparent 70%)",
              }}
            />
            <span
              className="pill"
              style={{ color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
            >
              <span
                className="dot"
                style={{ color: "var(--neon-mag)", background: "var(--neon-mag)" }}
              />
              Press start to play
            </span>
            <h1 className="h-display" style={{ fontSize: 56, margin: "18px 0 10px", maxWidth: 560 }}>
              Ready, <span style={{ color: "var(--neon-cyan)" }}>Maya?</span>
              <br />
              Your quest awaits.
            </h1>
            <p
              style={{
                color: "var(--ink-dim)",
                maxWidth: 460,
                fontSize: 16,
                marginBottom: 22,
              }}
            >
              3 lessons queued, a Science boss battle at level 2, and today&apos;s daily doubled XP
              — let&apos;s go.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="chunky-btn">▶ Resume Lesson</button>
              <button className="chunky-btn cyan">⚡ Quick Quiz</button>
            </div>

            <div
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              {[
                { label: "Level", value: "7", color: "var(--neon-cyan)", sub: "320 / 500 xp" },
                { label: "Streak", value: "7d", color: "var(--neon-ora)", sub: "🔥 personal best: 12" },
                { label: "Rank", value: "#4", color: "var(--neon-yel)", sub: "in Grade 6" },
                { label: "Mastery", value: "64%", color: "var(--neon-lime)", sub: "avg across subjects" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.35)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <div className="label">{s.label}</div>
                  <div
                    className="h-display"
                    style={{
                      fontSize: 26,
                      color: s.color,
                      textShadow: `0 0 14px ${s.color}`,
                      margin: "4px 0 2px",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="panel cyan"
            style={{ padding: 22, position: "relative", overflow: "hidden" }}
          >
            <div className="scanline" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div className="label" style={{ color: "var(--neon-cyan)" }}>
                  Daily Quest
                </div>
                <h2 className="h-display" style={{ fontSize: 24, margin: "4px 0 2px" }}>
                  The Fraction Dungeon
                </h2>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Math · 15 min · rewards 2x</div>
              </div>
              <div
                className="pill"
                style={{ color: "var(--neon-yel)", borderColor: "var(--neon-yel)" }}
              >
                +120 XP
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                height: 220,
                borderRadius: 14,
                background: "linear-gradient(180deg, #0a051a 0%, #140b28 100%)",
                border: "2px solid var(--line)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <svg viewBox="0 0 400 220" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none">
                <path
                  d="M 30 190 Q 90 120, 160 150 T 300 80 Q 340 50, 370 30"
                  stroke="var(--neon-cyan)"
                  strokeWidth="3"
                  strokeDasharray="2 10"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              {[
                { x: 30, y: 190, done: true, icon: "★" },
                { x: 130, y: 150, done: true, icon: "✦" },
                { x: 210, y: 130, done: false, active: true, icon: "?" },
                { x: 290, y: 90, done: false, icon: "◆" },
                { x: 370, y: 30, done: false, icon: "♛" },
              ].map((n, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${(n.x / 400) * 100}%`,
                    top: `${(n.y / 220) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: n.active ? 46 : 36,
                    height: n.active ? 46 : 36,
                    borderRadius: 12,
                    background: n.done
                      ? "var(--neon-lime)"
                      : n.active
                        ? "var(--neon-cyan)"
                        : "rgba(255,255,255,0.06)",
                    border: "3px solid #170826",
                    display: "grid",
                    placeItems: "center",
                    color: "#170826",
                    fontWeight: 900,
                    fontFamily: "var(--f-display)",
                    fontSize: n.active ? 18 : 14,
                    boxShadow: n.active
                      ? "0 0 20px var(--neon-cyan), 0 4px 0 #170826"
                      : "0 4px 0 #170826",
                  }}
                  className={n.active ? "anim-bop" : ""}
                >
                  {n.icon}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  left: "52.5%",
                  top: "60%",
                  transform: "translate(-50%, -100%)",
                  fontSize: 28,
                }}
                className="anim-float"
              >
                🎮
              </div>
            </div>

            <button
              className="chunky-btn yel"
              style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
            >
              ▶ Enter Dungeon
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h2 className="h-display" style={{ fontSize: 22 }}>
              Your Worlds
            </h2>
            <span className="label">6 unlocked · 2 locked</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {SUBJECTS.map((s) => (
              <div
                key={s.id}
                className="panel"
                style={{ padding: 18, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${s.color}33, transparent 70%)`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    marginBottom: 14,
                    position: "relative",
                  }}
                >
                  <SubjectChip subject={s} />
                  <div>
                    <div className="h-display" style={{ fontSize: 18 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                      {s.done} / {s.chapters} chapters
                    </div>
                  </div>
                </div>
                <PixelBar value={s.progress} color={s.color} height={12} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                    {s.progress}% complete
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: s.color,
                      fontFamily: "var(--f-display)",
                      fontWeight: 800,
                    }}
                  >
                    PLAY →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <h2 className="h-display" style={{ fontSize: 20 }}>
                Daily Challenges
              </h2>
              <span
                className="pill"
                style={{ color: "var(--neon-yel)", borderColor: "var(--neon-yel)" }}
              >
                1 / 3 claimed
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { title: "Finish 1 lesson", xp: 40, done: true, icon: "📖", progress: 100 },
                { title: "Quiz with 80%+", xp: 60, done: false, progress: 60, icon: "🎯" },
                { title: "Talk to Byte 3x", xp: 30, done: false, progress: 30, icon: "💬" },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: c.done ? "rgba(166,255,59,0.08)" : "rgba(0,0,0,0.3)",
                    border:
                      "2px solid " + (c.done ? "var(--neon-lime)" : "var(--line-soft)"),
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: c.done ? "var(--neon-lime)" : "var(--neon-yel)",
                      fontFamily: "var(--f-display)",
                      fontWeight: 800,
                    }}
                  >
                    +{c.xp} XP {c.done && "✓ Claimed"}
                  </div>
                  {!c.done && (
                    <div style={{ marginTop: 8 }}>
                      <PixelBar value={c.progress} color="var(--neon-yel)" height={6} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="panel yel" style={{ padding: 20 }}>
            <div className="label" style={{ color: "var(--neon-yel)" }}>
              Power-Ups
            </div>
            <h3 className="h-display" style={{ fontSize: 18, margin: "6px 0 14px" }}>
              Streak shields · 2x boosters
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🛡", name: "Freeze", count: 2, color: "var(--neon-cyan)" },
                { icon: "⚡", name: "2x XP", count: 1, color: "var(--neon-yel)" },
                { icon: "💡", name: "Hint", count: 5, color: "var(--neon-lime)" },
                { icon: "⏱", name: "Slow-mo", count: 0, color: "var(--neon-mag)" },
              ].map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.35)",
                    border: "2px solid var(--line-soft)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22 }}>{p.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: p.color,
                      fontFamily: "var(--f-display)",
                      fontWeight: 800,
                    }}
                  >
                    × {p.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
