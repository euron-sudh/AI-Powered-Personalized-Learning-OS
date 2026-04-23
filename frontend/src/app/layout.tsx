import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import "./arcade.css";
import Nav from "@/components/Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LearnOS - AI-Powered Personalized Learning",
  description: "A Netflix-like AI education platform for K-12 students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&family=Nunito:wght@400;600;700;800&family=Baloo+2:wght@500;700;800&family=Space+Grotesk:wght@500;700&family=Press+Start+2P&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-page)] text-[var(--text-body)] antialiased font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
