"use client";

import { useState, useEffect } from "react";
import { useWindowActions } from "@/hooks/useWindowActions";
import { useSystemActions } from "@/hooks/useSystemActions";
import { useRegistry } from "@/hooks/useRegistry";
import { useMessageBox } from "@/hooks/useMessageBox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Layers,
  FolderTree,
  Database,
  Zap,
  Settings,
  Monitor,
  FileCode,
  HardDrive,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Command,
  SlidersHorizontal,
  Cpu,
} from "lucide-react";

/* ── Forced inline style tokens ────────────────────────────────
 *  Using inline styles to guarantee colors regardless of the
 *  parent OS theme (light/dark). Tailwind utility classes alone
 *  can be overridden by the window frame's theme provider.
 * ───────────────────────────────────────────────────────────── */
const palette = {
  // Backgrounds
  pageBg: "#0c111c",           // deep navy
  cardBg: "#151d2e",           // raised card surface
  cardBgAlt: "#1a2438",        // slightly lighter surface
  cardBorder: "#243049",       // visible card border
  inputBg: "#0f1726",          // inset surface
  headerBg: "rgba(12,17,28,0.92)",
  footerBg: "rgba(12,17,28,0.95)",

  // Text
  textPrimary: "#e8ecf4",      // warm off-white — NOT pure white
  textSecondary: "#a3b1cb",    // readable muted blue-gray
  textMuted: "#6b7fa0",        // lighter info text — good on dark bg
  textAccent: "#818cf8",       // indigo highlight
  textCyan: "#67e8f9",         // cyan highlight
  textPurple: "#c084fc",       // purple highlight
  textEmerald: "#6ee7b7",      // emerald highlight

  // Accents
  accentIndigo: "#6366f1",
  accentViolet: "#8b5cf6",
  accentCyan: "#22d3ee",
  accentEmerald: "#34d399",
  accentPurple: "#a855f7",
};

/** Small reusable inline-style helper for cards */
const cardStyle = (highlight?: string): React.CSSProperties => ({
  background: palette.cardBg,
  border: `1px solid ${highlight || palette.cardBorder}`,
  borderRadius: 14,
});

const pillBadgeStyle = (bg: string, fg: string, border: string): React.CSSProperties => ({
  background: bg,
  color: fg,
  border: `1px solid ${border}`,
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.3,
});

export default function WelcomeApp() {
  const { close } = useWindowActions();
  const { launchApp } = useSystemActions();
  const registry = useRegistry();
  const { showMessageBox, showInputBox } = useMessageBox();

  const [showOnStartup, setShowOnStartup] = useState<boolean>(true);

  useEffect(() => {
    async function loadSetting() {
      const value = await registry.get<boolean>("showOnStartup", true);
      setShowOnStartup(value);
    }
    loadSetting();
  }, [registry]);

  const handleStartupToggle = async (checked: boolean) => {
    setShowOnStartup(checked);
    await registry.set("showOnStartup", checked);
  };

  const handleTestAlert = async () => {
    const result = await showMessageBox(
      "AmerOS System Message",
      "This is a native OS alert dialog managed by the Window Manager. Click OK to confirm.",
      true,
      ["OK", "Cancel"]
    );
    if (result) {
      showMessageBox("Action Confirmed", `You selected: ${result}`, true);
    }
  };

  const handleTestInput = async () => {
    const input = await showInputBox(
      "System Input Request",
      "Enter a custom string to test OS input messaging:",
      true
    );
    if (input !== null) {
      showMessageBox("Input Received", `You entered: "${input}"`, true);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: palette.pageBg,
        color: palette.textPrimary,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ─── HEADER ──────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: palette.headerBg,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${palette.cardBorder}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #22d3ee 100%)",
              padding: 2,
              boxShadow: "0 0 16px rgba(99,102,241,0.3)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 8,
                background: palette.pageBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles style={{ width: 18, height: 18, color: palette.textAccent }} />
            </div>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: palette.textPrimary, letterSpacing: -0.3 }}>
            AmerOS
          </span>
        </div>

        {/* Nav pills */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: palette.inputBg,
            border: `1px solid ${palette.cardBorder}`,
            borderRadius: 999,
            padding: 3,
          }}
        >
          {[
            { id: "window-engine", label: "Window Engine" },
            { id: "vfs", label: "Virtual FS" },
            { id: "db-registry", label: "DB & Registry" },
            { id: "boot", label: "Boot Pipeline" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                color: palette.textSecondary,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = palette.textPrimary;
                e.currentTarget.style.background = "rgba(99,102,241,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = palette.textSecondary;
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => launchApp("Settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              color: palette.textSecondary,
              background: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              cursor: "pointer",
            }}
          >
            <Settings style={{ width: 14, height: 14 }} />
            Settings
          </button>
          <button
            onClick={() => launchApp("DemoApp")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
            }}
          >
            <Monitor style={{ width: 14, height: 14 }} />
            System Demos
          </button>
        </div>
      </header>

      {/* ─── SCROLLING BODY ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* ─── HERO ──────────────────────────────────────── */}
        <section
          id="hero"
          style={{
            position: "relative",
            padding: "48px 32px 40px",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          {/* Ambient glows */}
          <div
            style={{
              position: "absolute",
              top: -60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 500,
              height: 260,
              background: "radial-gradient(ellipse, rgba(99,102,241,0.15), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 30,
              width: 300,
              height: 200,
              background: "radial-gradient(ellipse, rgba(168,85,247,0.1), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Status pill */}
          <div style={{ position: "relative", zIndex: 5, marginBottom: 20, display: "inline-block" }}>
            <span
              style={{
                ...pillBadgeStyle("rgba(99,102,241,0.12)", palette.textAccent, "rgba(99,102,241,0.3)"),
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: palette.accentEmerald,
                  boxShadow: `0 0 8px ${palette.accentEmerald}`,
                }}
              />
              AmerOS Architecture Guide & OS Systems
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              position: "relative",
              zIndex: 5,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: -0.5,
              color: palette.textPrimary,
              margin: "0 auto 12px",
              maxWidth: 600,
            }}
          >
            The Web-Native{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #818cf8, #c084fc, #67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Desktop Operating System
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              position: "relative",
              zIndex: 5,
              fontSize: 13,
              lineHeight: 1.7,
              color: palette.textSecondary,
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            AmerOS runs a full desktop environment inside the browser — with a real window manager,
            reactive file system, SQL database engine, and Windows-style registry, all on top of React & Next.js.
          </p>

          {/* Hero CTAs */}
          <div
            style={{
              position: "relative",
              zIndex: 5,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              onClick={() => launchApp("DemoApp")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              <Monitor style={{ width: 15, height: 15 }} />
              Explore UI Component Showcase
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={() => launchApp("Settings")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                color: palette.textSecondary,
                background: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                cursor: "pointer",
              }}
            >
              <Settings style={{ width: 15, height: 15 }} />
              Open OS Settings
            </button>
          </div>

          {/* 4-Pillar cards */}
          <div
            style={{
              position: "relative",
              zIndex: 5,
              maxWidth: 720,
              margin: "36px auto 0",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {[
              { id: "window-engine", icon: Layers, color: palette.textAccent, bgTint: "rgba(99,102,241,0.08)", borderTint: "rgba(99,102,241,0.25)", title: "Window Engine", desc: "Z-index focus, resize, taskbar & modal contexts" },
              { id: "vfs", icon: FolderTree, color: palette.textCyan, bgTint: "rgba(34,211,238,0.08)", borderTint: "rgba(34,211,238,0.25)", title: "Virtual VFS", desc: "IndexedDB storage + FSA API local mounts" },
              { id: "db-registry", icon: Database, color: palette.textPurple, bgTint: "rgba(168,85,247,0.08)", borderTint: "rgba(168,85,247,0.25)", title: "Database Engine", desc: "AlaSQL per-app database files synced to VFS" },
              { id: "boot", icon: Zap, color: palette.textEmerald, bgTint: "rgba(52,211,153,0.08)", borderTint: "rgba(52,211,153,0.25)", title: "Boot & Registry", desc: "5-stage startup pipeline & IPC message hook" },
            ].map((card) => (
              <div
                key={card.id}
                onClick={() => scrollTo(card.id)}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: card.bgTint,
                  border: `1px solid ${card.borderTint}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 4px 16px ${card.borderTint}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: card.bgTint,
                    border: `1px solid ${card.borderTint}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <card.icon style={{ width: 15, height: 15, color: card.color }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.title}</div>
                <div style={{ fontSize: 10.5, color: palette.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION: WINDOW ENGINE ────────────────────── */}
        <section id="window-engine" style={{ padding: "40px 32px", borderTop: `1px solid ${palette.cardBorder}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={pillBadgeStyle("rgba(99,102,241,0.12)", palette.textAccent, "rgba(99,102,241,0.25)")}>
                System Core 01
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.textPrimary, letterSpacing: -0.3 }}>
                Desktop Window Engine & Shell
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Left: Window State Management */}
              <div style={{ ...cardStyle(), padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Command style={{ width: 16, height: 16, color: palette.textAccent }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.textAccent }}>
                    Window State Management
                  </span>
                </div>
                <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>
                  Every window maintains dynamic coordinates, z-index hierarchy, min/max restore state, and child parent relationships.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {[
                    "Z-Index Focus Stacking & Drag/Resize boundaries",
                    "Taskbar docking & Start Menu registry resolution",
                    "Modal child window spawning via openChildWindow()",
                  ].map((item, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: palette.textSecondary,
                        padding: "4px 0",
                      }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14, color: palette.accentEmerald, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Interactive Dialog Sandbox */}
              <div
                style={{
                  ...cardStyle("rgba(99,102,241,0.35)"),
                  padding: 20,
                  background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, #151d2e 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <MessageSquare style={{ width: 16, height: 16, color: palette.textAccent }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.textPrimary }}>
                    Interactive Dialog Sandbox
                  </span>
                </div>
                <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>
                  Test OS-level modal dialogs directly over this window.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    onClick={handleTestAlert}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: palette.accentIndigo,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <MessageSquare style={{ width: 13, height: 13 }} />
                    Test Alert Box
                  </button>
                  <button
                    onClick={handleTestInput}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      color: palette.textSecondary,
                      background: palette.inputBg,
                      border: `1px solid ${palette.cardBorder}`,
                      cursor: "pointer",
                    }}
                  >
                    <SlidersHorizontal style={{ width: 13, height: 13, color: palette.textCyan }} />
                    Test Input Box
                  </button>
                  <button
                    onClick={() => launchApp("CommonDialogDemo")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      color: palette.textAccent,
                      background: "rgba(99,102,241,0.1)",
                      border: `1px solid rgba(99,102,241,0.3)`,
                      cursor: "pointer",
                    }}
                  >
                    <ExternalLink style={{ width: 13, height: 13 }} />
                    Common Dialogs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION: VFS ──────────────────────────────── */}
        <section id="vfs" style={{ padding: "40px 32px", borderTop: `1px solid ${palette.cardBorder}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={pillBadgeStyle("rgba(34,211,238,0.12)", palette.textCyan, "rgba(34,211,238,0.25)")}>
                System Core 02
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.textPrimary, letterSpacing: -0.3 }}>
                Virtual File System (VFS) Architecture
              </h2>
            </div>

            <div style={{ ...cardStyle(), padding: 20 }}>
              <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
                The AmerOS VFS (
                <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>
                  lib/vfs.ts
                </code>
                ) abstracts browser storage into standard OS drive paths —
                <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>/C/</code>,
                <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>/home/</code>, and
                <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>/System/</code>.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { icon: HardDrive, color: palette.textAccent, title: "IndexedDB Persistence", desc: "Files, system folders, wallpapers, and documents persist across browser sessions." },
                  { icon: ExternalLink, color: palette.textCyan, title: "Native FSA API Mounts", desc: "Mount actual host desktop folders directly into the AmerOS file tree using FileSystemHandles." },
                  { icon: Zap, color: palette.textEmerald, title: "Live Event Propagation", desc: "Real-time subscriptions notify open applications whenever file contents change." },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: palette.inputBg,
                      border: `1px solid ${palette.cardBorder}`,
                    }}
                  >
                    <item.icon style={{ width: 16, height: 16, color: item.color, marginBottom: 8 }} />
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: palette.textPrimary, marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: palette.textMuted, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION: DATABASE & REGISTRY ──────────────── */}
        <section id="db-registry" style={{ padding: "40px 32px", borderTop: `1px solid ${palette.cardBorder}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={pillBadgeStyle("rgba(168,85,247,0.12)", palette.textPurple, "rgba(168,85,247,0.25)")}>
                System Core 03
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.textPrimary, letterSpacing: -0.3 }}>
                OS Database Engine & System Registry
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Database Card */}
              <div style={{ ...cardStyle(), padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Database style={{ width: 16, height: 16, color: palette.textPurple }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.textPurple }}>
                    Relational Database
                  </span>
                </div>
                <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>
                  Powered by{" "}
                  <code style={{ color: palette.textPurple, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>
                    AlaSQL
                  </code>
                  , providing per-app SQL databases automatically synced to{" "}
                  <code style={{ color: palette.textSecondary, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>
                    /C/System/AppData/
                  </code>{" "}
                  in the VFS.
                </p>
                <button
                  onClick={() => launchApp("DBExplorer")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: palette.accentPurple,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(168,85,247,0.3)",
                  }}
                >
                  <HardDrive style={{ width: 13, height: 13 }} />
                  Open Database Explorer
                </button>
              </div>

              {/* Registry Card */}
              <div style={{ ...cardStyle(), padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FileCode style={{ width: 16, height: 16, color: palette.textCyan }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.textCyan }}>
                    Hierarchical Registry
                  </span>
                </div>
                <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>
                  Emulates Windows Registry trees (
                  <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>HKLM</code>,{" "}
                  <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>HKCU</code>,{" "}
                  <code style={{ color: palette.textCyan, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>HKCR</code>
                  ) storing themes, Start Menu structures, file associations, and isolated app settings.
                </p>
                <button
                  onClick={() => launchApp("Regedit")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(6,182,212,0.3)",
                  }}
                >
                  <FileCode style={{ width: 13, height: 13 }} />
                  Open Registry Editor (Regedit)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION: BOOT PIPELINE ────────────────────── */}
        <section id="boot" style={{ padding: "40px 32px", borderTop: `1px solid ${palette.cardBorder}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={pillBadgeStyle("rgba(52,211,153,0.12)", palette.textEmerald, "rgba(52,211,153,0.25)")}>
                System Core 04
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.textPrimary, letterSpacing: -0.3 }}>
                OS Boot Pipeline & Application IPC
              </h2>
            </div>

            <div style={{ ...cardStyle(), padding: 20 }}>
              {/* Boot stages */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: palette.textPrimary, marginBottom: 12 }}>
                  <ShieldCheck style={{ width: 16, height: 16, color: palette.textEmerald }} />
                  5-Phase Sequential Boot Pipeline
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {[
                    { stage: "1", name: "HARDWARE", desc: "VFS Storage" },
                    { stage: "2", name: "KERNEL", desc: "Registry Load" },
                    { stage: "3", name: "SERVICES", desc: "Database & Apps" },
                    { stage: "4", name: "ENVIRONMENT", desc: "User Configs" },
                    { stage: "5", name: "SHELL", desc: "Desktop Launch" },
                  ].map((s) => (
                    <div
                      key={s.stage}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: palette.inputBg,
                        border: `1px solid ${palette.cardBorder}`,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color: palette.textEmerald, letterSpacing: 0.5 }}>
                        STAGE {s.stage}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: palette.textPrimary, marginTop: 3 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 10, color: palette.textMuted, marginTop: 2 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IPC */}
              <div style={{ borderTop: `1px solid ${palette.cardBorder}`, paddingTop: 16 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: palette.textPrimary, marginBottom: 6 }}>
                  <Cpu style={{ width: 16, height: 16, color: palette.textAccent }} />
                  Application IPC & Single-Instance Messaging
                </h3>
                <p style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.6 }}>
                  Applications configured with{" "}
                  <code style={{ color: palette.textAccent, background: palette.inputBg, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>
                    acceptsMessages: true
                  </code>{" "}
                  receive live IPC payloads (e.g. opening a file while the app is already running), focusing the existing window instead of duplicating instances.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom spacer for footer */}
        <div style={{ height: 16 }} />
      </div>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 30,
          background: palette.footerBg,
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${palette.cardBorder}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            color: palette.textSecondary,
          }}
        >
          <Checkbox
            checked={showOnStartup}
            onCheckedChange={(checked) => handleStartupToggle(checked === true)}
            style={{ borderColor: palette.textMuted }}
          />
          Show Welcome app on system startup
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => launchApp("Settings")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              color: palette.textSecondary,
              background: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              cursor: "pointer",
            }}
          >
            <Settings style={{ width: 14, height: 14 }} />
            OS Settings
          </button>
          <button
            onClick={close}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 18px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: palette.accentIndigo,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
            }}
          >
            Explore AmerOS
          </button>
        </div>
      </footer>
    </div>
  );
}
