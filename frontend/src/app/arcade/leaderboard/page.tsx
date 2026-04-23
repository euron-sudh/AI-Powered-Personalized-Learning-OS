import { Byte, FloatingPixels, TopBar } from "@/components/arcade";

type Row = {
  r: number;
  n: string;
  lv: number;
  xp: number;
  streak: number;
  av: string;
  c: string;
  you?: boolean;
};

const ROWS: Row[] = [
  { r: 1, n: "Zara K.", lv: 14, xp: 8420, streak: 41, av: "Z", c: "var(--neon-yel)" },
  { r: 2, n: "Diego R.", lv: 12, xp: 7110, streak: 22, av: "D", c: "var(--neon-cyan)" },
  { r: 3, n: "Priya S.", lv: 11, xp: 6540, streak: 18, av: "P", c: "var(--neon-mag)" },
  { r: 4, n: "Maya T. (you)", lv: 7, xp: 2840, streak: 7, av: "M", c: "var(--neon-lime)", you: true },
  { r: 5, n: "Kai O.", lv: 7, xp: 2790, streak: 12, av: "K", c: "var(--neon-vio)" },
  { r: 6, n: "Leo M.", lv: 6, xp: 2410, streak: 4, av: "L", c: "var(--neon-ora)" },
  { r: 7, n: "Ana V.", lv: 6, xp: 2240, streak: 9, av: "A", c: "var(--neon-cyan)" },
  { r: 8, n: "Nia J.", lv: 5, xp: 1980, streak: 3, av: "N", c: "var(--neon-mag)" },
];

export default function ArcadeLeaderboardPage() {
  return (
    <div className="screen" style={{ minHeight: 1100, position: "relative" }}>
      <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
      <FloatingPixels count={16} />
      <TopBar active="Arena" />

      <div style={{ padding: "24px 32px", position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <span className="label" style={{ color: "var(--neon-yel)" }}>⚡ WEEKLY ARENA</span>
            <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 4px" }}>
              High <span style={{ color: "var(--neon-yel)" }}>scores</span>
            </h1>
            <p style={{ color: "var(--ink-dim)" }}>
              Grade 6 · Resets in 3d 14h · Top 3 earn golden badge
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="pill"
              style={{ cursor: "pointer", color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
            >
              Week
            </button>
            <button className="pill" style={{ cursor: "pointer" }}>Month</button>
            <button className="pill" style={{ cursor: "pointer" }}>All time</button>
          </div>
        </div>

        <div
          className="panel yel"
          style={{
            padding: "30px 24px 0",
            position: "relative",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 120,
              background:
                "radial-gradient(ellipse at center top, rgba(255,229,61,0.3), transparent 70%)",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20,
              alignItems: "end",
              position: "relative",
            }}
          >
            {[ROWS[1], ROWS[0], ROWS[2]].map((p, i) => {
              const h = i === 1 ? 210 : i === 0 ? 160 : 130;
              const place = i === 1 ? 1 : i === 0 ? 2 : 3;
              return (
                <div key={p.n} style={{ textAlign: "center" }}>
                  <div
                    className={i === 1 ? "anim-float" : ""}
                    style={{
                      width: i === 1 ? 110 : 88,
                      height: i === 1 ? 110 : 88,
                      margin: "0 auto 12px",
                      borderRadius: 24,
                      background: `linear-gradient(135deg, ${p.c}, #5c2fb8)`,
                      border: "4px solid #170826",
                      boxShadow: `0 8px 0 #170826, 0 0 30px ${p.c}`,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--f-display)",
                      fontWeight: 900,
                      fontSize: i === 1 ? 46 : 36,
                      color: "#170826",
                      position: "relative",
                    }}
                  >
                    {p.av}
                    {i === 1 && (
                      <div style={{ position: "absolute", top: -32, fontSize: 40 }}>👑</div>
                    )}
                  </div>
                  <div className="h-display" style={{ fontSize: 15 }}>{p.n}</div>
                  <div
                    className="h-display"
                    style={{
                      fontSize: 22,
                      color: p.c,
                      marginTop: 2,
                      textShadow: `0 0 10px ${p.c}`,
                    }}
                  >
                    {p.xp.toLocaleString()} XP
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      height: h,
                      borderRadius: "16px 16px 0 0",
                      background:
                        place === 1
                          ? "linear-gradient(180deg, var(--neon-yel), #b88a00)"
                          : place === 2
                            ? "linear-gradient(180deg, #d5d7e0, #7d8095)"
                            : "linear-gradient(180deg, #d9832e, #5a3410)",
                      border: "3px solid #170826",
                      borderBottom: "none",
                      position: "relative",
                      boxShadow:
                        "inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -8px 0 rgba(0,0,0,0.2)",
                    }}
                  >
                    <div
                      className="pixel"
                      style={{
                        position: "absolute",
                        top: 20,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 40,
                        color: "#170826",
                      }}
                    >
                      {place}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 80px 120px 100px 100px",
              padding: "12px 20px",
              borderBottom: "2px solid var(--line-soft)",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            {["Rank", "Player", "Level", "XP", "Streak", "Change"].map((h) => (
              <div key={h} className="label">{h}</div>
            ))}
          </div>
          {ROWS.map((r) => (
            <div
              key={r.n}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 80px 120px 100px 100px",
                padding: "14px 20px",
                alignItems: "center",
                borderBottom: "1px solid var(--line-soft)",
                background: r.you ? "rgba(166,255,59,0.06)" : "transparent",
                borderLeft: r.you ? "4px solid var(--neon-lime)" : "4px solid transparent",
              }}
            >
              <div
                className="h-display"
                style={{
                  fontSize: 22,
                  color: r.r <= 3 ? "var(--neon-yel)" : "var(--ink-dim)",
                }}
              >
                #{r.r}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${r.c}, #5c2fb8)`,
                    border: "2px solid #170826",
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                    color: "#170826",
                    fontFamily: "var(--f-display)",
                  }}
                >
                  {r.av}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: r.you ? "var(--neon-lime)" : "var(--ink)",
                  }}
                >
                  {r.n}
                </div>
              </div>
              <div className="h-display" style={{ fontSize: 14 }}>Lv {r.lv}</div>
              <div
                className="h-display"
                style={{ fontSize: 14, color: "var(--neon-cyan)" }}
              >
                {r.xp.toLocaleString()}
              </div>
              <div style={{ color: "var(--neon-ora)", fontWeight: 700, fontSize: 13 }}>
                🔥 {r.streak}
              </div>
              <div
                style={{
                  color:
                    r.r === 4
                      ? "var(--neon-lime)"
                      : r.r % 2 === 0
                        ? "var(--neon-lime)"
                        : "var(--neon-mag)",
                  fontFamily: "var(--f-display)",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                {r.r % 2 === 0 ? "▲ +2" : r.r === 5 ? "▼ -1" : "— 0"}
              </div>
            </div>
          ))}
        </div>

        <div
          className="panel cyan"
          style={{
            padding: 20,
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48 }}>
              <Byte size={48} />
            </div>
            <div>
              <div className="h-display" style={{ fontSize: 16 }}>
                50 XP away from #3!
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                Finish one lesson to climb the podium.
              </div>
            </div>
          </div>
          <button className="chunky-btn cyan">⚡ Earn XP Now</button>
        </div>
      </div>
    </div>
  );
}
