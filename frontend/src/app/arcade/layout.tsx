import type { Metadata } from "next";
import ArcadeSubnav from "./_components/ArcadeSubnav";

export const metadata: Metadata = {
  title: "LearnOS Arcade",
  description: "Kid-friendly K–12 arcade concept for LearnOS",
};

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&family=Nunito:wght@400;600;700;800&family=Baloo+2:wght@500;700;800&family=Space+Grotesk:wght@500;700&family=Press+Start+2P&display=swap"
      />
      <div className="arcade-root" data-grade="68" data-motion="on" data-mascot="on">
        <ArcadeSubnav />
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </>
  );
}
