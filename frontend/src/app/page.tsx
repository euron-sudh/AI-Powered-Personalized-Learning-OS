import Link from "next/link";
import { Byte, FloatingPixels } from "@/components/arcade";

export default function HomePage() {
  return (
    <div className="arcade-root" data-grade="68" data-motion="on" data-mascot="on" style={{ minHeight: "100vh" }}>
      <main
        className="screen"
        style={{
          minHeight: "100vh",
          position: "relative",
          borderRadius: 0,
          border: "none",
          overflow: "hidden",
        }}
      >
        <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <FloatingPixels count={26} />

        {/* Top nav */}
        <header style={{ position: "relative", zIndex: 5 }}>
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "20px 24px 0",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                  border: "2px solid #170826",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 0 #170826, 0 0 20px rgba(255,62,165,0.5)",
                  fontFamily: "var(--f-pixel)",
                  fontSize: 16,
                  color: "#fff",
                }}
              >
                L
              </div>
              <span className="h-display" style={{ fontSize: 22 }}>
                Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
              </span>
            </Link>

            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginLeft: 28,
              }}
              className="landing-nav-links"
            >
              {[
                { href: "#features", label: "Features" },
                { href: "#subjects", label: "Courses" },
                { href: "#testimonials", label: "About" },
                { href: "#pricing", label: "Pricing" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  style={{
                    fontFamily: "var(--f-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--ink-dim)",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <Link
                href="/parent"
                className="pill"
                style={{
                  cursor: "pointer",
                  color: "var(--neon-lime)",
                  borderColor: "var(--neon-lime)",
                  textDecoration: "none",
                }}
              >
                Parent / Teacher
              </Link>
              <Link
                href="/login"
                className="chunky-btn cyan"
                style={{ textDecoration: "none", padding: "10px 18px", fontSize: 13 }}
              >
                ▶ Log In
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section style={{ position: "relative", zIndex: 3 }}>
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "48px 24px 32px",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
              gap: 40,
              alignItems: "center",
            }}
            className="landing-hero-grid"
          >
            <div>
              <span
                className="pill"
                style={{ color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
              >
                <span
                  className="dot"
                  style={{ color: "var(--neon-mag)", background: "var(--neon-mag)" }}
                />
                Press start — grades K–12
              </span>
              <h1
                className="h-display"
                style={{ fontSize: 60, lineHeight: 1.04, margin: "18px 0 14px" }}
              >
                School, but <span style={{ color: "var(--neon-yel)" }}>fun</span>.
                <br />
                Unlock your potential with{" "}
                <span style={{ color: "var(--neon-cyan)" }}>LearnOS</span>.
              </h1>
              <p
                style={{
                  fontSize: 18,
                  color: "var(--ink-dim)",
                  maxWidth: 520,
                  marginBottom: 28,
                  lineHeight: 1.55,
                }}
              >
                Quests, boss battles, AI tutor voice chat, and a tiny buddy named Byte —
                standards-aligned K–12 learning, reimagined as an arcade.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href="/register"
                  className="chunky-btn"
                  style={{ textDecoration: "none", padding: "16px 26px", fontSize: 15 }}
                >
                  ▶ Start Learning Today
                </Link>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--ink-mute)",
                  }}
                >
                  <span
                    className="h-display"
                    style={{ fontSize: 24, color: "var(--neon-cyan)" }}
                  >
                    6–16
                  </span>
                  <span style={{ fontSize: 18, color: "var(--neon-yel)" }}>✦</span>
                </div>
              </div>
            </div>

            {/* Hero panel with Byte + stats */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                <div className="anim-float">
                  <Byte size={96} />
                </div>
                <div>
                  <div className="label" style={{ color: "var(--neon-yel)" }}>Meet</div>
                  <div className="h-display" style={{ fontSize: 24 }}>Byte</div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    Your study buddy
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                {[
                  { k: "Players", v: "2.4M", c: "var(--neon-cyan)" },
                  { k: "Quests", v: "50k+", c: "var(--neon-yel)" },
                  { k: "Buddies", v: "∞", c: "var(--neon-lime)" },
                ].map((s) => (
                  <div
                    key={s.k}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.35)",
                      border: "2px solid var(--line-soft)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      className="h-display"
                      style={{
                        fontSize: 22,
                        color: s.c,
                        textShadow: `0 0 10px ${s.c}`,
                      }}
                    >
                      {s.v}
                    </div>
                    <div className="label" style={{ fontSize: 9 }}>{s.k}</div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.35)",
                  border: "2px solid var(--line-soft)",
                  fontSize: 13,
                  color: "var(--ink-dim)",
                  lineHeight: 1.5,
                }}
              >
                <b style={{ color: "var(--neon-cyan)" }}>Byte:</b> Ready to try the Fraction
                Dungeon? I&apos;ll cheer you on and never judge a mistake.
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div
            id="features"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <FeatureCard
              glyph="⚔"
              color="var(--neon-cyan)"
              title="Boss Battles"
              desc="Turn quizzes into boss fights — real standards, real XP."
            />
            <FeatureCard
              glyph="🗺"
              color="var(--neon-mag)"
              title="World Maps"
              desc="Quest through Math, Science, English, Coding, Arts & History."
            />
            <FeatureCard
              glyph="✦"
              color="var(--neon-yel)"
              title="AI Tutor + Byte"
              desc="Voice-chat tutor that adapts to mood, pace, and confusion."
            />
          </div>
        </section>

        {/* Popular subjects */}
        <section id="subjects" style={{ position: "relative", zIndex: 3, marginTop: 80 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ marginBottom: 24 }}>
              <span className="label" style={{ color: "var(--neon-cyan)" }}>Worlds</span>
              <h2 className="h-display" style={{ fontSize: 34, margin: "8px 0 4px" }}>
                Popular <span style={{ color: "var(--neon-mag)" }}>subjects</span>
              </h2>
              <p style={{ color: "var(--ink-dim)" }}>Pick a world, start the quest.</p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {[
                { title: "Math", color: "var(--s-math)", icon: "∑" },
                { title: "English", color: "var(--s-eng)", icon: "A" },
                { title: "Science", color: "var(--s-sci)", icon: "⚛" },
                { title: "Coding", color: "var(--s-cs)", icon: "</>" },
                { title: "Arts", color: "var(--s-art)", icon: "✦" },
              ].map((s) => (
                <div
                  key={s.title}
                  style={{
                    padding: 22,
                    borderRadius: 22,
                    aspectRatio: "1 / 1",
                    background: `linear-gradient(135deg, ${s.color}22, transparent)`,
                    border: `3px solid ${s.color}`,
                    boxShadow: `0 6px 0 #170826, 0 0 22px ${s.color}44`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  <div className="subj-chip" style={{ color: s.color }}>
                    <span
                      style={{
                        fontFamily: "var(--f-display)",
                        fontWeight: 900,
                        fontSize: 28,
                        color: s.color,
                        textShadow: `0 0 10px ${s.color}`,
                      }}
                    >
                      {s.icon}
                    </span>
                  </div>
                  <div
                    className="h-display"
                    style={{ fontSize: 18, color: s.color, textShadow: `0 0 10px ${s.color}` }}
                  >
                    {s.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          style={{ position: "relative", zIndex: 3, marginTop: 96 }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
              gap: 48,
              alignItems: "center",
            }}
            className="landing-testimonials-grid"
          >
            <div
              className="panel cyan"
              style={{
                padding: 8,
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(39,224,255,0.2), rgba(255,62,165,0.18))",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div className="scanline" />
              <div style={{ fontSize: 140, lineHeight: 1 }}>👩‍🏫</div>
              <div style={{ position: "absolute", top: 14, left: 14, fontSize: 30 }}>📚</div>
              <div style={{ position: "absolute", top: 14, right: 14, fontSize: 30 }}>🌟</div>
              <div style={{ position: "absolute", bottom: 14, left: 14, fontSize: 30 }}>✏️</div>
              <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 30 }}>🎨</div>
            </div>

            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Testimonials
              </span>
              <h2 className="h-display" style={{ fontSize: 36, margin: "8px 0 6px" }}>
                Happy <span style={{ color: "var(--neon-lime)" }}>players</span>
              </h2>
              <p style={{ color: "var(--ink-mute)", marginBottom: 20 }}>
                Students &amp; parents in the arena
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <TestimonialCard
                  quote="LearnOS completely changed how my daughter approaches homework. The AI tutor feels like a patient friend — she actually asks for more lessons."
                  author="Priya · Parent of Grade 6"
                  color="var(--neon-cyan)"
                />
                <TestimonialCard
                  quote="I love the voice tutor! It explains things in a way I actually get. Plus the XP and streaks make me want to keep going every day."
                  author="Leo · Grade 8"
                  color="var(--neon-mag)"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Partners */}
        <section style={{ position: "relative", zIndex: 3, marginTop: 80 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <h3
              className="label"
              style={{ textAlign: "center", color: "var(--ink-mute)", marginBottom: 24 }}
            >
              Partners
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: 32,
                opacity: 0.85,
              }}
            >
              {[
                { label: "Common Core", icon: "🛡" },
                { label: "STEM Certified", icon: "✅" },
                { label: "COPPA Safe", icon: "🛡" },
                { label: "ISTE Standards", icon: "✅" },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--ink-dim)",
                    fontFamily: "var(--f-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 0.6,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                      border: "2px solid var(--line-soft)",
                      color: "var(--neon-cyan)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 16,
                    }}
                  >
                    {p.icon}
                  </span>
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Get Started CTA */}
        <section id="pricing" style={{ position: "relative", zIndex: 3, marginTop: 96 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div
              className="panel mag"
              style={{
                padding: "48px 40px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div className="scanline" />
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  left: -30,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,229,61,0.35), transparent 70%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -30,
                  right: -30,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(39,224,255,0.3), transparent 70%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 24,
                  right: 36,
                  fontSize: 40,
                  opacity: 0.8,
                }}
                className="anim-float"
              >
                ⭐
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 36,
                  fontSize: 32,
                  opacity: 0.8,
                }}
                className="anim-float"
              >
                ✨
              </div>

              <span className="label" style={{ color: "var(--neon-yel)" }}>Insert coin</span>
              <h2
                className="h-display"
                style={{ fontSize: 40, margin: "10px 0 12px" }}
              >
                Get started in <span style={{ color: "var(--neon-yel)" }}>minutes</span>
              </h2>
              <p
                style={{
                  color: "var(--ink-dim)",
                  maxWidth: 560,
                  margin: "0 auto 24px",
                  fontSize: 15,
                }}
              >
                Your child&rsquo;s personalized learning journey starts in minutes.
                No credit card required.
              </p>
              <Link
                href="/register"
                className="chunky-btn"
                style={{ textDecoration: "none", padding: "16px 30px", fontSize: 16 }}
              >
                ▶ Start Learning Today
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            position: "relative",
            zIndex: 3,
            marginTop: 80,
            borderTop: "2px solid var(--line-soft)",
            background: "rgba(11, 7, 22, 0.4)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "48px 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1.2fr) repeat(3, minmax(0,1fr))",
              gap: 40,
            }}
            className="landing-footer-grid"
          >
            <div>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                    border: "2px solid #170826",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 4px 0 #170826, 0 0 16px rgba(255,62,165,0.5)",
                    fontFamily: "var(--f-pixel)",
                    fontSize: 14,
                    color: "#fff",
                  }}
                >
                  L
                </div>
                <span className="h-display" style={{ fontSize: 20 }}>
                  Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
                </span>
              </Link>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-mute)",
                  marginTop: 16,
                  maxWidth: 280,
                  lineHeight: 1.6,
                }}
              >
                AI-powered, personalized, standards-aligned learning for every K-12 student.
              </p>
            </div>

            <FooterCol title="Company" items={["About", "Careers", "Press", "Media"]} />
            <FooterCol title="Courses" items={["Math", "Science", "English", "Coding"]} />
            <FooterCol title="Help" items={["Blog", "Contact", "FAQ", "Support"]} />
          </div>
          <div style={{ borderTop: "1px solid var(--line-soft)" }}>
            <div
              style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: "18px 24px",
                fontSize: 11,
                color: "var(--ink-mute)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12,
                fontFamily: "var(--f-display)",
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              <div>© 2026 LearnOS. All rights reserved.</div>
              <div style={{ display: "flex", gap: 16 }}>
                <a href="#" style={{ color: "var(--ink-mute)", textDecoration: "none" }}>
                  Privacy
                </a>
                <a href="#" style={{ color: "var(--ink-mute)", textDecoration: "none" }}>
                  Terms
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  glyph,
  color,
  title,
  desc,
}: {
  glyph: string;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="panel" style={{ padding: 22, textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 14px",
          borderRadius: 18,
          border: `3px solid ${color}`,
          background: "rgba(255,255,255,0.04)",
          display: "grid",
          placeItems: "center",
          boxShadow: `0 0 18px ${color}, inset 0 0 18px rgba(255,255,255,0.06)`,
          fontFamily: "var(--f-display)",
          fontWeight: 900,
          fontSize: 32,
          color,
          textShadow: `0 0 10px ${color}`,
        }}
      >
        {glyph}
      </div>
      <div className="h-display" style={{ fontSize: 19, marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>{desc}</p>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  color,
}: {
  quote: string;
  author: string;
  color: string;
}) {
  return (
    <div className="panel" style={{ padding: 18, borderColor: color }}>
      <p
        style={{
          color: "var(--ink-dim)",
          fontSize: 15,
          lineHeight: 1.6,
          fontStyle: "italic",
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color,
          fontFamily: "var(--f-display)",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {author}
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="label" style={{ color: "var(--ink)", marginBottom: 12 }}>
        {title}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <li key={it}>
            <a
              href="#"
              style={{
                fontSize: 13,
                color: "var(--ink-mute)",
                textDecoration: "none",
              }}
            >
              {it}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
