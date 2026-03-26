"use client";
import { useState, useEffect, useRef, useCallback, FC, RefObject } from "react";

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────
interface TermLine {
  text: string;
  type: "sys" | "input" | "out" | "err";
}
interface SkillDef {
  cat: string;
  items: string[];
  level: number;
}
interface ProjectDef {
  id: string;
  title: string;
  period: string;
  desc: string;
  tags: string[];
  status: "ACTIVE" | "IN DEV" | "COMPLETE";
}

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const STALL_POINTS: number[] = [19, 42, 88];
const STALL_DURATION = 1400;

const LOAD_LINES: string[] = [
  "INITIALIZING SATELLITE UPLINK...",
  "LOADING ASSET MANIFESTS...",
  "DECRYPTING PAYLOAD HEADERS...",
  "AUTHENTICATING OPERATOR ID...",
  "FETCHING PROJECT METADATA...",
  "CALIBRATING GLITCH RENDERER...",
  "ESTABLISHING SECURE CHANNEL...",
  "COMPILING SKILL MATRICES...",
  "SYNCHRONIZING PORTFOLIO DATA...",
  "RUNNING FINAL DIAGNOSTICS...",
  "ALL SYSTEMS NOMINAL. LAUNCHING.",
];

const SKILLS: SkillDef[] = [
  { cat: "Languages", level: 9, items: ["Python", "Java", "C", "Bash", "SQL"] },
  {
    cat: "Security",
    level: 8,
    items: ["Nmap", "Burp Suite", "Wireshark", "Hashcat", "Hydra"],
  },
  {
    cat: "DevOps",
    level: 7,
    items: ["Docker", "Git", "Linux", "Shell Scripting"],
  },
  {
    cat: "AI / ML",
    level: 6,
    items: ["OpenCV", "PyTorch", "TinyLlama", "Whisper"],
  },
  {
    cat: "Embedded",
    level: 8,
    items: ["ESP8266", "Arduino", "RPi Pico", "C/C++"],
  },
  {
    cat: "UI / Design",
    level: 5,
    items: ["PySide6", "Figma", "Qt Designer", "UE5"],
  },
];

const PROJECTS: ProjectDef[] = [
  {
    id: "01",
    title: "AttendX",
    period: "Apr 2024 – Present",
    desc: "Real-time face recognition attendance tracker. Single-camera per classroom. CSV logging, modular biometric architecture (iris/fingerprint ready).",
    tags: ["Python", "OpenCV", "DeepFace", "Flask", "Pandas"],
    status: "ACTIVE",
  },
  {
    id: "02",
    title: "Katana MoCap System",
    period: "2025 – Present",
    desc: "DIY motion capture system in development. Hardware-first weapon tracking without commercial sensor arrays.",
    tags: ["Hardware", "Embedded", "Python", "Sensors"],
    status: "IN DEV",
  },
  {
    id: "03",
    title: "DIY Sim Racing Rig",
    period: "2024",
    desc: "Custom-built sim racing cockpit from scratch. Structural design, seat mount, wheel/pedal integration — all self-engineered.",
    tags: ["Hardware", "Fabrication", "DIY"],
    status: "COMPLETE",
  },
  {
    id: "04",
    title: "Vile Discord Bot",
    period: "Mar – May 2023",
    desc: "Multipurpose Discord bot with music via Lavalink, moderation, and logging. Dynamic command loading, deployed on Heroku.",
    tags: ["Python", "discord.py", "Lavalink", "Heroku"],
    status: "COMPLETE",
  },
  {
    id: "05",
    title: "WiFi LED Controller",
    period: "2024",
    desc: "ESP8266-powered LED strip controller with web UI, button logic, custom animation patterns. ULN2003A driver with ghost-fix wiring.",
    tags: ["ESP8266", "C++", "NodeMCU", "Hardware"],
    status: "COMPLETE",
  },
  {
    id: "06",
    title: "HID Payload Device",
    period: "2024",
    desc: "Pro Micro rubber ducky clone. Custom keystroke payloads, scripted automation, plug-and-play USB HID.",
    tags: ["Pro Micro", "Arduino", "HID", "Security"],
    status: "COMPLETE",
  },
];

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-active",
  "IN DEV": "status-wip",
  COMPLETE: "status-done",
};

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────
function randHex(len = 8): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16)
      .toString(16)
      .toUpperCase(),
  ).join("");
}

// Formats a coord number, optionally "jittering" it
function jitterCoord(base: number, jitter: boolean): string {
  if (!jitter) return base.toFixed(2);
  return (base + (Math.random() - 0.5) * 2).toFixed(2);
}

// ─────────────────────────────────────────────────────────────
//  HOOK: useScrollReveal
//  Attaches an IntersectionObserver to the returned ref.
//  Once the element enters the viewport, adds `.is-visible`.
//  threshold: 0.12 means 12% of the element must be visible.
// ─────────────────────────────────────────────────────────────
function useScrollReveal<T extends HTMLElement>(
  threshold = 0.12,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // Once visible, stop watching — no repeated re-triggers
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}

// ─────────────────────────────────────────────────────────────
//  HOOK: useParallaxOrbs
//  Returns a translateY offset (in px) derived from scrollY,
//  at a reduced rate (factor) so orbs drift slower than page.
//  Uses passive scroll listener + rAF for performance.
// ─────────────────────────────────────────────────────────────
function useParallaxOrbs(factor = 0.18): number {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setOffset(window.scrollY * factor);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [factor]);

  return offset;
}

// ─────────────────────────────────────────────────────────────
//  HOOK: useScrollJitter
//  Returns true while the user is actively scrolling.
//  Resets after 500 ms of inactivity.
// ─────────────────────────────────────────────────────────────
function useScrollJitter(): boolean {
  const [jitter, setJitter] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setJitter(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJitter(false), 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return jitter;
}

// ─────────────────────────────────────────────────────────────
//  GLASS ORBS BACKGROUND  — parallax-linked
// ─────────────────────────────────────────────────────────────
const ORBS = [
  { size: 340, top: "8%", left: "12%", delay: "0s", dur: "18s", pSpeed: 0.12 },
  { size: 260, top: "55%", left: "70%", delay: "-6s", dur: "22s", pSpeed: 0.2 },
  {
    size: 200,
    top: "75%",
    left: "20%",
    delay: "-3s",
    dur: "16s",
    pSpeed: 0.08,
  },
  {
    size: 180,
    top: "20%",
    left: "60%",
    delay: "-10s",
    dur: "20s",
    pSpeed: 0.16,
  },
  {
    size: 140,
    top: "45%",
    left: "40%",
    delay: "-8s",
    dur: "14s",
    pSpeed: 0.24,
  },
  {
    size: 120,
    top: "10%",
    left: "85%",
    delay: "-14s",
    dur: "25s",
    pSpeed: 0.1,
  },
];

const GlassBackground: FC<{ enabled: boolean; scrollOffset: number }> = ({
  enabled,
  scrollOffset,
}) => {
  if (!enabled) return null;
  return (
    <div className="glass-bg" aria-hidden="true">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="glass-orb"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            animationDelay: o.delay,
            animationDuration: o.dur,
            // Each orb moves at its own speed, creating depth layering
            transform: `translateY(${scrollOffset * o.pSpeed}px)`,
          }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  HEX STREAM
// ─────────────────────────────────────────────────────────────
const HexStream: FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const initialLines = Array.from(
      { length: 30 },
      () => `0x${randHex(4)}: ${randHex(8)} ${randHex(8)} ${randHex(8)}`,
    );
    setLines(initialLines);
    const id = setInterval(() => {
      setLines((l) => {
        const next = [...l];
        next.shift();
        next.push(`0x${randHex(4)}: ${randHex(8)} ${randHex(8)} ${randHex(8)}`);
        return next;
      });
    }, 60);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <div className="hex-stream" />;

  return (
    <div className="hex-stream">
      {lines.map((l, i) => (
        <div key={i} className="hex-line">
          {l}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  WORLD MAP
// ─────────────────────────────────────────────────────────────
const WorldMap: FC = () => {
  const kx = ((76.27 + 180) / 360) * 800;
  const ky = ((90 - 10.85) / 180) * 400;
  return (
    <svg
      className="world-map-svg"
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
    >
      {Array.from({ length: 13 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * (800 / 12)}
          y1="0"
          x2={i * (800 / 12)}
          y2="400"
          stroke="rgba(0,229,255,0.07)"
          strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * (400 / 6)}
          x2="800"
          y2={i * (400 / 6)}
          stroke="rgba(0,229,255,0.07)"
          strokeWidth="0.5"
        />
      ))}
      <g
        fill="rgba(0,229,255,0.06)"
        stroke="rgba(0,229,255,0.12)"
        strokeWidth="0.5"
      >
        <path d="M80,60 L200,55 L215,80 L225,130 L210,170 L180,185 L140,200 L100,190 L75,160 L65,110 Z" />
        <path d="M155,210 L205,210 L215,255 L210,310 L185,345 L160,340 L145,300 L140,255 Z" />
        <path d="M355,50 L415,48 L430,70 L420,100 L390,110 L360,100 L345,80 Z" />
        <path d="M360,120 L420,115 L440,150 L445,210 L435,270 L400,300 L365,285 L345,240 L340,180 L350,140 Z" />
        <path d="M430,45 L620,40 L640,65 L645,110 L600,140 L540,145 L480,130 L440,105 L425,75 Z" />
        <path d="M490,120 L530,118 L545,150 L535,185 L510,200 L490,185 L480,155 L482,130 Z" />
        <path d="M610,230 L690,225 L710,255 L705,290 L680,305 L640,300 L615,275 L605,250 Z" />
      </g>
      <circle cx={kx} cy={ky} r="3" fill="var(--cyan)" />
      <circle
        cx={kx}
        cy={ky}
        r="3"
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="1.5"
      >
        <animate
          attributeName="r"
          from="3"
          to="22"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="1"
          to="0"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={kx}
        cy={ky}
        r="3"
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="1"
      >
        <animate
          attributeName="r"
          from="3"
          to="16"
          dur="2s"
          begin="0.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.8"
          to="0"
          dur="2s"
          begin="0.6s"
          repeatCount="indefinite"
        />
      </circle>
      <text
        x={kx + 6}
        y={ky - 6}
        fill="var(--cyan)"
        fontSize="7"
        fontFamily="'JetBrains Mono',monospace"
        opacity="0.9"
      >
        10.85N / 76.27E
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
//  LOADER
// ─────────────────────────────────────────────────────────────
interface LoaderProps {
  onDone: () => void;
}

const Loader: FC<LoaderProps> = ({ onDone }) => {
  const [progress, setProgress] = useState<number>(0);
  const [lineIdx, setLineIdx] = useState<number>(0);
  const [stalling, setStalling] = useState<boolean>(false);
  const [stallingFlash, setStallingFlash] = useState<boolean>(false);
  const [shutterOut, setShutterOut] = useState<boolean>(false);
  const progressRef = useRef<number>(0);
  const stallingRef = useRef<boolean>(false);
  const doneRef = useRef<boolean>(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setShutterOut(true);
    setTimeout(() => onDone(), 650);
  }, [onDone]);

  useEffect(() => {
    if (!stalling) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStallingFlash(false);
      return;
    }
    const id = setInterval(() => setStallingFlash((f) => !f), 200);
    return () => clearInterval(id);
  }, [stalling]);

  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (stallingRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      progressRef.current = Math.min(
        progressRef.current + (Math.random() * 2.8 + 1) * (dt / 80),
        100,
      );
      const p = progressRef.current;
      const stall = STALL_POINTS.find((sp) => p >= sp && p < sp + 4);
      if (stall !== undefined && !stallingRef.current) {
        stallingRef.current = true;
        setStalling(true);
        setTimeout(() => {
          stallingRef.current = false;
          setStalling(false);
          progressRef.current = stall + 4.5;
        }, STALL_DURATION);
      }
      setProgress(Math.floor(Math.min(p, 100)));
      setLineIdx(Math.floor((Math.min(p, 99) / 100) * LOAD_LINES.length));
      if (p >= 100) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const SEGS = 20;
  const filled = Math.floor((progress / 100) * SEGS);

  return (
    <div className={`loader-overlay${shutterOut ? " shutter-active" : ""}`}>
      <div className="shutter-top" />
      <div className="shutter-bottom" />
      <WorldMap />
      <div className="loader-scanlines" />
      <button className="loader-skip" onClick={finish}>
        SKIP ▶▶
      </button>
      <div className="loader-layout">
        <div className="loader-inner">
          <div className="loader-bracket tl" />
          <div className="loader-bracket tr" />
          <div className="loader-bracket bl" />
          <div className="loader-bracket br" />
          <div className="loader-logo">
            <span className="loader-name">IHSAN BIN SAJID</span>
            <span className="loader-sub">
              SATELLITE UPLINK // COORD: 10.85N / 76.27E
            </span>
          </div>
          <div className="loader-log">
            {LOAD_LINES.slice(0, Math.max(lineIdx + 1, 1)).map((l, i) => (
              <div
                key={i}
                className={`loader-log-line ${i === lineIdx ? "active" : "done"}`}
              >
                <span className="loader-log-prefix">
                  {i < lineIdx ? "✓" : "›"}
                </span>{" "}
                {l}
              </div>
            ))}
            {stalling && (
              <div
                className={`loader-log-line stall ${stallingFlash ? "stall-vis" : "stall-hid"}`}
              >
                <span className="loader-log-prefix">!</span> RETRIEVING...
              </div>
            )}
          </div>
          <div className="loader-bottom">
            <div className="loader-bar-wrap">
              <div className="loader-segments">
                {Array.from({ length: SEGS }).map((_, i) => (
                  <div
                    key={i}
                    className={[
                      "loader-seg",
                      i < filled ? "filled" : "",
                      i === filled && !stalling ? "active-seg" : "",
                      stalling && i === filled ? "stall-seg" : "",
                    ].join(" ")}
                  />
                ))}
              </div>
              <div className="loader-pct">{progress}%</div>
            </div>
            <div className={`loader-status${stalling ? " status-stall" : ""}`}>
              {stalling
                ? stallingFlash
                  ? "⚠ RETRIEVING — DECRYPTION STALLED"
                  : "⚠ RETRYING UPLINK HANDSHAKE..."
                : progress < 100
                  ? LOAD_LINES[lineIdx]
                  : "UPLINK ESTABLISHED"}
            </div>
          </div>
        </div>
        <div className="hex-panel">
          <div className="hex-panel-label">MEM DUMP // LIVE</div>
          <HexStream />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  GLITCH TEXT
// ─────────────────────────────────────────────────────────────
interface GlitchTextProps {
  text: string;
  className?: string;
}
const GlitchText: FC<GlitchTextProps> = ({ text, className = "" }) => {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          setGlitching(true);
          setTimeout(() => setGlitching(false), 320);
          schedule();
        },
        3000 + Math.random() * 3000,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, []);
  return (
    <span
      className={`glitch-host${glitching ? " glitch-hue" : ""} ${className}`}
    >
      <span className="glitch-wrap" data-text={text}>
        {text}
      </span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
//  TYPEWRITER
// ─────────────────────────────────────────────────────────────
interface TypeWriterProps {
  text: string;
  speed?: number;
  onDone?: () => void;
}
const TypeWriter: FC<TypeWriterProps> = ({ text, speed = 40, onDone }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text]); // eslint-disable-line
  return (
    <span>
      {displayed}
      <span className="cursor-blink">█</span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
//  HUD OVERLAYS  — coord jitters while scrolling
// ─────────────────────────────────────────────────────────────
const SignalBars: FC = () => {
  const [bars, setBars] = useState([5, 5, 4, 5, 3]);
  useEffect(() => {
    const id = setInterval(() => {
      setBars((b) =>
        b.map((v) =>
          Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 2 : v,
        ),
      );
    }, 800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="signal-bars">
      {bars.map((h, i) => (
        <div
          key={i}
          className="signal-bar"
          style={{ height: `${h * 3}px`, opacity: h > 3 ? 1 : 0.35 }}
        />
      ))}
    </div>
  );
};

const BitrateCounter: FC = () => {
  const [kbps, setKbps] = useState(1847);
  useEffect(() => {
    const id = setInterval(
      () => setKbps(Math.floor(1200 + Math.random() * 1200)),
      400,
    );
    return () => clearInterval(id);
  }, []);
  return <span className="bitrate-val">{kbps.toLocaleString()} KBPS</span>;
};

// Jittering coord display — rapidly cycles numbers for 500ms on scroll
const JitterCoord: FC<{ base: number; suffix: string; jitter: boolean }> = ({
  base,
  suffix,
  jitter,
}) => {
  const [display, setDisplay] = useState(base.toFixed(2));

  useEffect(() => {
    if (!jitter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(base.toFixed(2));
      return;
    }
    // While jittering, update every 60ms with noisy values
    const id = setInterval(() => {
      setDisplay(jitterCoord(base, true));
    }, 60);
    return () => clearInterval(id);
  }, [jitter, base]);

  return (
    <span className={jitter ? "coord-jitter" : ""}>
      {display}°{suffix}
    </span>
  );
};

const HudOverlays: FC<{ enabled: boolean; scrollJitter: boolean }> = ({
  enabled,
  scrollJitter,
}) => {
  if (!enabled) return null;
  return (
    <>
      <div className="hud-corner hud-tl">
        <div className="hud-label">SIGNAL</div>
        <div className="hud-row">
          <SignalBars />
          <span className="hud-val cyan">[STABLE]</span>
        </div>
      </div>
      <div className="hud-corner hud-tr">
        <div className="hud-label">BITRATE</div>
        <BitrateCounter />
      </div>
      <div className="hud-corner hud-bl">
        <div className="hud-label">COORD</div>
        <div className="hud-val">
          <JitterCoord base={10.85} suffix="N" jitter={scrollJitter} />
          {" / "}
          <JitterCoord base={76.27} suffix="E" jitter={scrollJitter} />
        </div>
        <div className="hud-subval">
          {scrollJitter ? (
            <span className="coord-jitter">TRACKING...</span>
          ) : (
            "KERALA, INDIA"
          )}
        </div>
      </div>
      <div className="hud-corner hud-br">
        <div className="hud-label">USER_ID</div>
        <div className="hud-val cyan">IHSAN_BIN_SAJID</div>
        <div className="hud-subval">CLEARANCE: LVL-5</div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
//  EFFECTS TOGGLE
// ─────────────────────────────────────────────────────────────
interface EffectsToggleProps {
  effects: boolean;
  onChange: (v: boolean) => void;
}
const EffectsToggle: FC<EffectsToggleProps> = ({ effects, onChange }) => (
  <div className="fx-toggle" title="Toggle visual effects">
    <span className="fx-label">FX</span>
    <button
      className={`fx-switch${effects ? "" : " fx-off"}`}
      onClick={() => onChange(!effects)}
      aria-label="Toggle effects"
    >
      <span className="fx-knob" />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────
//  RADAR SKILLS
// ─────────────────────────────────────────────────────────────
const RadarSkills: FC = () => {
  const [active, setActive] = useState(false);
  const SIZE = 320;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 110;
  const n = SKILLS.length;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, t: number) => ({
    x: CX + R * t * Math.cos(angle(i)),
    y: CY + R * t * Math.sin(angle(i)),
  });

  const poly = SKILLS.map((s, i) => {
    const p = pt(i, s.level / 10);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <>
      <div
        className={`radar-backdrop ${active ? "active" : ""}`}
        onClick={() => setActive(false)}
      />
      <div
        className={`radar-module-container ${active ? "is-active" : ""}`}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
      >
        <div className="radar-card">
          <div className="radar-card-header">
            <div className="status-tag">
              <span className="blink-dot" /> SYSTEM_SCAN:{" "}
              {active ? "EXPANDED" : "IDLE"}
            </div>
            <div className="serial-no">SKL_MTX_PRTCL_V4</div>
          </div>
          <div className="radar-layout">
            <div className="radar-svg-wrap">
              <svg
                className="radar-svg"
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                width={SIZE}
                height={SIZE}
              >
                <defs>
                  <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                    <stop
                      offset="0%"
                      stopColor="var(--cyan)"
                      stopOpacity="0.15"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--cyan)"
                      stopOpacity="0"
                    />
                  </radialGradient>
                </defs>
                <circle cx={CX} cy={CY} r={R} fill="url(#radar-glow)" />
                {levels.map((l, li) => (
                  <polygon
                    key={li}
                    points={SKILLS.map((_, i) => {
                      const p = pt(i, l);
                      return `${p.x},${p.y}`;
                    }).join(" ")}
                    className="radar-ring"
                    strokeOpacity={0.1 + li * 0.1}
                  />
                ))}
                {SKILLS.map((_, i) => {
                  const end = pt(i, 1);
                  return (
                    <line
                      key={i}
                      x1={CX}
                      y1={CY}
                      x2={end.x}
                      y2={end.y}
                      className="radar-axis"
                    />
                  );
                })}
                {active && (
                  <g className="radar-sweep-group">
                    <line
                      x1={CX}
                      y1={CY}
                      x2={CX}
                      y2={CY - R}
                      className="radar-sweep-line"
                    />
                    <path
                      d={`M ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${CX + R * Math.sin(Math.PI / 4)} ${CY - R * Math.cos(Math.PI / 4)} L ${CX} ${CY} Z`}
                      fill="url(#radar-sweep-grad)"
                      className="radar-sweep-area"
                    />
                    <defs>
                      <linearGradient
                        id="radar-sweep-grad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--cyan)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--cyan)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                  </g>
                )}
                <polygon points={poly} className="radar-poly-main" />
                {SKILLS.map((s, i) => {
                  const p = pt(i, s.level / 10);
                  return (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      className="radar-vertex"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="radar-data-panel">
              {SKILLS.map((s, i) => (
                <div
                  key={i}
                  className="radar-data-row"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <div className="data-header">
                    <span className="data-label">{s.cat}</span>
                    <span className="data-pct">{s.level * 10}%</span>
                  </div>
                  <div className="data-bar-bg">
                    <div
                      className="data-bar-fill"
                      style={{ width: active ? `${s.level * 10}%` : "0%" }}
                    />
                  </div>
                  <div className="data-items">{s.items.join(" • ")}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="radar-card-footer">
            OPERATOR: IHSAN_BIN_SAJID // DATA_STREAM:{" "}
            {active ? "STABLE" : "STANDBY"}
          </div>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
//  TERMINAL
// ─────────────────────────────────────────────────────────────
type CommandFn = () => string[] | null | "__EXIT__";
const COMMANDS: Record<string, CommandFn> = {
  help: () => [
    "Available commands:",
    "  help           — show this message",
    "  about          — operator profile",
    "  skills         — technical skill list",
    "  projects       — list of projects",
    "  contact        — comms channels",
    "  whoami         — identity check",
    "  intel --view   — classified dossier",
    "  sudo hire      — make the right call",
    "  clear          — clear terminal",
    "  exit           — close terminal",
  ],
  whoami: () => [
    "ihsan@no-pat:~$ id",
    "uid=1000(ihsan) gid=1000(ihsan) groups=1000(ihsan),4(adm),27(sudo),999(no-pat-operators)",
  ],
  about: () => [
    "Ihsan Bin Sajid // ECE @ APJ Abdul Kalam Technological University",
    "Focus: Cybersecurity · DevOps · Embedded Systems · AI/ML",
    "Status: Building AttendX, Katana MoCap, breaking CTF infrastructure.",
    "OS: EndeavourOS + Hyprland  |  Shell: fish  |  Kernel: zen",
  ],
  skills: () => [
    "Languages  : Python, Java, C, Bash, SQL",
    "Security   : Nmap, Burp Suite, Wireshark, Hydra, Hashcat",
    "DevOps     : Docker, Git, Linux, Shell scripting",
    "AI/ML      : Whisper, TinyLlama, OpenCV, PyTorch",
    "Embedded   : ESP8266, Arduino, RPi Pico, C/C++",
    "UI/Game    : PySide6, Qt Designer, Figma, UE5",
  ],
  projects: () => [
    "[01] AttendX          — Face recognition attendance system",
    "[02] Katana MoCap     — DIY motion capture system [IN DEV]",
    "[03] DIY Sim Rig      — Custom sim racing cockpit",
    "[04] Vile Bot         — Discord bot framework",
    "[05] WiFi LED Ctrl    — ESP8266 + ULN2003A LED controller",
    "[06] HID Payload Dev  — Pro Micro rubber ducky clone",
  ],
  contact: () => [
    "Email    : ihsanbinsajid@gmail.com",
    "GitHub   : github.com/Typixal",
    "LinkedIn : linkedin.com/in/ihsan-bin-sajid",
    "Phone    : +91 85890-42805",
  ],
  "intel --view": () => [
    "┌─────────────────────────────────────────────────────────┐",
    "│  [CLASSIFIED] OPERATOR DOSSIER // ACCESS: LVL-5 ONLY   │",
    "└─────────────────────────────────────────────────────────┘",
    " ",
    "  ID       : IHSAN_B_SAJID",
    "  CLEARANCE: LEVEL 5 (NO-PAT OPERATOR)",
    "  STATUS   : ACTIVE / FIELD-READY",
    " ",
    "  [CLASSIFIED] ACADEMIC SECTOR:",
    "  > Degree  : B.Tech Electronics & Computer Engineering",
    "  > Institute: APJ Abdul Kalam Technological University, Kerala",
    "  > ETA     : May 2027",
    "  > Spec    : Cyber-Tactical Systems & Hardware Fabrication",
    " ",
    "  [CLASSIFIED] PROJECT: KATANA MOCAP",
    "  > Objective : DIY full-body motion capture hardware array",
    "  > Status   : ████░░ IN DEVELOPMENT — 60% nominal",
    " ",
    "  [CLASSIFIED] THREAT PROFILE:",
    "  > Confirmed breaches in Modbus ICS environments",
    "  > Expertise: CRC forgery, Buffer Overflow, Priv-Esc",
    " ",
    "────────────────────── [END OF FILE] ─────────────────────",
  ],
  "sudo hire": () => [
    "[sudo] password for recruiter: ••••••••",
    "Verifying credentials...",
    "✓ Permission granted.",
    "Initiating hire sequence... ██████████ 100%",
    "✓ Best decision you've made all quarter.",
  ],
  clear: () => null,
  exit: () => "__EXIT__",
};

interface TerminalProps {
  onClose: () => void;
}
const Terminal: FC<TerminalProps> = ({ onClose }) => {
  const [lines, setLines] = useState<TermLine[]>([
    { text: "NO-PAT TACTICAL TERMINAL v4.2 — type 'help'", type: "sys" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(() => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h]);
    setHIdx(-1);
    setInput("");
    const echo: TermLine = { text: `❯ ${cmd}`, type: "input" };
    const handler = COMMANDS[cmd];
    if (!handler) {
      setLines((l) => [
        ...l,
        echo,
        { text: `bash: ${cmd}: command not found`, type: "err" },
      ]);
      return;
    }
    const result = handler();
    if (result === null) {
      setLines([
        { text: "NO-PAT TACTICAL TERMINAL v4.2 — type 'help'", type: "sys" },
      ]);
      return;
    }
    if (result === "__EXIT__") {
      onClose();
      return;
    }
    setLines((l) => [
      ...l,
      echo,
      ...(result as string[]).map<TermLine>((t) => ({ text: t, type: "out" })),
    ]);
  }, [input, history, onClose]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      setHIdx((i) => {
        const n = Math.min(i + 1, history.length - 1);
        setInput(history[n] ?? "");
        return n;
      });
    }
    if (e.key === "ArrowDown") {
      setHIdx((i) => {
        const n = Math.max(i - 1, -1);
        setInput(n === -1 ? "" : history[n]);
        return n;
      });
    }
  };

  return (
    <div
      className="terminal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="terminal-window" onClick={(e) => e.stopPropagation()}>
        <div className="terminal-titlebar">
          <span className="dot red" onClick={onClose} />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="terminal-title">
            NO-PAT OPS // TACTICAL TERMINAL
          </span>
        </div>
        <div
          className="terminal-body"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div key={i} className={`term-line ${l.type}`}>
              {l.text}
            </div>
          ))}
          <div className="term-input-row">
            <span className="term-prompt">❯ </span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  NAV
// ─────────────────────────────────────────────────────────────
interface NavProps {
  onTerminal: () => void;
  effects: boolean;
  onEffects: (v: boolean) => void;
}
const Nav: FC<NavProps> = ({ onTerminal, effects, onEffects }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const scroll = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <nav className={`nav${scrolled ? " nav-scrolled" : ""}`}>
      <span className="nav-logo" onClick={() => scroll("hero")}>
        <span className="cyan">/dev/</span> ihsan
      </span>
      <div className="nav-links">
        {["about", "skills", "projects", "experience", "contact"].map((s) => (
          <button key={s} className="nav-link" onClick={() => scroll(s)}>
            {s}
          </button>
        ))}
        <EffectsToggle effects={effects} onChange={onEffects} />
        <button
          className="nav-terminal"
          onClick={onTerminal}
          title="Open terminal (` key)"
        >
          <span className="cyan">$_</span>
        </button>
      </div>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────
//  HERO
// ─────────────────────────────────────────────────────────────
interface HeroProps {
  onTerminal: () => void;
  effects: boolean;
  scrollJitter: boolean;
}
const Hero: FC<HeroProps> = ({ onTerminal, effects, scrollJitter }) => {
  const [phase, setPhase] = useState(0);
  return (
    <section id="hero" className="hero">
      {effects && (
        <>
          <div className="crt-lines" />
          <div className="scanline" />
        </>
      )}
      <div className="hero-grid-bg" />
      <HudOverlays enabled={effects} scrollJitter={scrollJitter} />
      <div className="hero-content">
        <div className="hero-eyebrow">
          <TypeWriter
            text="PORTFOLIO.EXE — ALL SYSTEMS NOMINAL"
            speed={26}
            onDone={() => setPhase(1)}
          />
        </div>
        {phase >= 1 && (
          <>
            <h1 className="hero-name">
              <GlitchText text="IHSAN" />
            </h1>
            <p className="hero-role">
              <span className="cyan">ECE Student</span>
              <span className="sep"> · </span>Cybersecurity
              <span className="sep"> · </span>DevOps
              <span className="sep"> · </span>Embedded Systems
            </p>
            <p className="hero-location">
              <span className="cyan">▸</span> Kerala, India &nbsp;·&nbsp; APJ
              Abdul Kalam Technological University
            </p>
            <div className="hero-actions">
              <button
                className="btn-primary"
                onClick={() =>
                  document
                    .getElementById("projects")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                View Projects
              </button>
              <button className="btn-ghost" onClick={onTerminal}>
                Open Terminal <span className="cyan">$_</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  ABOUT  — scroll-reveal
// ─────────────────────────────────────────────────────────────
const About: FC = () => {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section id="about" className="section reveal-section" ref={ref}>
      <div className="section-inner">
        <h2 className="section-title reveal-title">
          <span className="cyan">01.</span> About Me
        </h2>
        <div className="about-grid reveal-content">
          <div className="about-text">
            <p>
              Electronics and Computer Engineering student with a strong
              foundation in Python, Java, and C. Passionate about{" "}
              <span className="cyan">cybersecurity</span>, DevOps, and
              automation — with hands-on experience in penetration testing,
              system scripting, and infrastructure tooling.
            </p>
            <p>
              I&apos;ve broken buffer overflows, forged CRCs, and exploited
              Modbus ICS — mostly on purpose. Also building things: from
              face-recognition attendance systems to DIY sim rigs and motion
              capture hardware.
            </p>
            <p>
              Currently developing <span className="cyan">Katana</span> — a DIY
              motion capture system. Running EndeavourOS + Hyprland because
              comfort is overrated.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-inner">
              <div className="about-stat">
                <span className="stat-num cyan">B.Tech</span>
                <span>ECE · Expected May 2027</span>
              </div>
              <div className="about-stat">
                <span className="stat-num cyan">6+</span>
                <span>Projects Shipped</span>
              </div>
              <div className="about-stat">
                <span className="stat-num cyan">CTF</span>
                <span>TryHackMe · HackTheBox</span>
              </div>
              <div className="about-badge">
                <span className="badge-dot" /> Open to opportunities
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  SKILLS  — scroll-reveal
// ─────────────────────────────────────────────────────────────
const Skills: FC = () => {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section
      id="skills"
      className="section section-alt reveal-section"
      ref={ref}
    >
      <div className="section-inner">
        <h2 className="section-title reveal-title">
          <span className="cyan">02.</span> Skills // Threat Matrix
        </h2>
        <div className="reveal-content">
          <p className="skills-hint">
            Hover the radar to expand skill categories
          </p>
          <RadarSkills />
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  PROJECTS  — scroll-reveal
// ─────────────────────────────────────────────────────────────
const Projects: FC = () => {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section id="projects" className="section reveal-section" ref={ref}>
      <div className="section-inner">
        <h2 className="section-title reveal-title">
          <span className="cyan">03.</span> Projects
        </h2>
        <div className="projects-grid reveal-content">
          {PROJECTS.map((p) => (
            <div key={p.id} className="project-card">
              <div className="project-header">
                <span className="project-id cyan">{p.id}</span>
                <span className={`project-status ${STATUS_CLASS[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <h3 className="project-title">{p.title}</h3>
              <div className="project-period">{p.period}</div>
              <p className="project-desc">{p.desc}</p>
              <div className="project-tags">
                {p.tags.map((t) => (
                  <span key={t} className="project-tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  EXPERIENCE  — scroll-reveal + data-line draw
// ─────────────────────────────────────────────────────────────
const Experience: FC = () => {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section
      id="experience"
      className="section section-alt reveal-section"
      ref={ref}
    >
      <div className="section-inner">
        <h2 className="section-title reveal-title">
          <span className="cyan">04.</span> Experience &amp; Certs
        </h2>
        {/*
          The data-line is the vertical cyan line on the left.
          It lives OUTSIDE the grid so it spans full height.
          .is-visible on the section triggers the draw animation via CSS.
        */}
        <div className="exp-timeline reveal-content">
          <div className="exp-data-line" />
          <div className="exp-grid">
            <div className="exp-card">
              <div className="exp-node" />
              <div className="exp-tag">INTERNSHIP</div>
              <h3 className="exp-title">Intern — Nexus Project</h3>
              <div className="exp-place">
                St. Joseph&apos;s College of Engineering and Technology, Palai
              </div>
              <div className="exp-period">June 2025 · 1 month</div>
              <p className="exp-desc">
                Hands-on project development, team collaboration, and applied
                learning. Project lifecycles, communication workflows,
                early-stage team dynamics.
              </p>
            </div>
            <div className="exp-card">
              <div className="exp-node" />
              <div
                className="exp-tag"
                style={{ color: "#ffd700", borderColor: "#ffd700" }}
              >
                CTF
              </div>
              <h3 className="exp-title">CTF Practice</h3>
              <div className="exp-place">TryHackMe &amp; HackTheBox</div>
              <div className="exp-period">June 2025 – Ongoing</div>
              <p className="exp-desc">
                Binary exploitation, Modbus ICS, CRC forgery, web security,
                privilege escalation. Built automation tools and payload scripts
                in Python and Bash.
              </p>
            </div>
            <div className="exp-card">
              <div className="exp-node" />
              <div
                className="exp-tag"
                style={{ color: "#00ff87", borderColor: "#00ff87" }}
              >
                CERT
              </div>
              <h3 className="exp-title">Summer Internship Certificate</h3>
              <div className="exp-place">The Nexus Project</div>
              <div className="exp-period">June 2025</div>
              <p className="exp-desc">
                Certified completion of a 1-month intensive summer internship
                programme.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  CONTACT  — scroll-reveal
// ─────────────────────────────────────────────────────────────
const Contact: FC = () => {
  const ref = useScrollReveal<HTMLElement>();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!name && !body) return;
    const to = "ihsanbinsajid@gmail.com";
    const sub = encodeURIComponent(subject || `Portfolio contact from ${name}`);
    const bodyEnc = encodeURIComponent(`From: ${name}\n\n${body}`);
    window.location.href = `mailto:${to}?subject=${sub}&body=${bodyEnc}`;
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="contact" className="section reveal-section" ref={ref}>
      <div className="section-inner contact-inner">
        <h2 className="section-title reveal-title">
          <span className="cyan">05.</span> Contact
        </h2>
        <div className="reveal-content">
          <p className="contact-sub">
            Have a project, a question, or a CTF challenge you can&apos;t crack?
            Reach out.
          </p>
          <div className="contact-links">
            <a href="mailto:ihsanbinsajid@gmail.com" className="contact-link">
              <span className="cyan">✉</span> ihsanbinsajid@gmail.com
            </a>
            <a
              href="https://github.com/Typixal"
              className="contact-link"
              target="_blank"
              rel="noreferrer"
            >
              <span className="cyan">⌥</span> github.com/Typixal
            </a>
            <a
              href="https://linkedin.com/in/ihsan-bin-sajid"
              className="contact-link"
              target="_blank"
              rel="noreferrer"
            >
              <span className="cyan">⬡</span> linkedin.com/in/ihsan-bin-sajid
            </a>
          </div>
          <div className="contact-form">
            <div className="cf-row">
              <input
                className="cf-input"
                placeholder="YOUR NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="cf-input"
                placeholder="SUBJECT (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <textarea
              className="cf-textarea"
              placeholder="YOUR MESSAGE"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {!sent ? (
              <button className="btn-primary cf-send" onClick={handleSend}>
                SEND MESSAGE <span className="cyan">▶</span>
              </button>
            ) : (
              <div className="contact-sent">
                <span className="cyan">✓</span> Opening your email client...
              </div>
            )}
            <p className="cf-note">
              Opens your default email client pre-filled. For a backend form,
              integrate
              <a
                href="https://resend.com"
                target="_blank"
                rel="noreferrer"
                className="cyan"
              >
                {" "}
                Resend
              </a>{" "}
              or
              <a
                href="https://formspree.io"
                target="_blank"
                rel="noreferrer"
                className="cyan"
              >
                {" "}
                Formspree
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────
interface FooterProps {
  onTerminal: () => void;
}
const Footer: FC<FooterProps> = ({ onTerminal }) => (
  <footer className="footer">
    <span>
      built by <span className="cyan">ihsan bin sajid</span> ·{" "}
      {new Date().getFullYear()}
    </span>
    <button className="footer-egg" onClick={onTerminal} title="psst">
      $_
    </button>
  </footer>
);

// ─────────────────────────────────────────────────────────────
//  ROOT
// ─────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [loaded, setLoaded] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [effects, setEffects] = useState(true);

  // Parallax offset for glass orbs
  const parallaxOffset = useParallaxOrbs(0.18);

  // Scroll jitter for coord HUD
  const scrollJitter = useScrollJitter();

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "`") setTerminal((t) => !t);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (loaded) return;
    const fn = () => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 50);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [loaded]);

  return (
    <div className={`root${flicker && effects ? " global-flicker" : ""}`}>
      <style>{CSS}</style>
      <div className="grid-overlay" />
      <GlassBackground enabled={effects} scrollOffset={parallaxOffset} />
      {!loaded && <Loader onDone={() => setLoaded(true)} />}
      {terminal && <Terminal onClose={() => setTerminal(false)} />}
      <div className={`site-body${loaded ? " site-visible" : " site-hidden"}`}>
        <Nav
          onTerminal={() => setTerminal(true)}
          effects={effects}
          onEffects={setEffects}
        />
        <Hero
          onTerminal={() => setTerminal(true)}
          effects={effects}
          scrollJitter={scrollJitter}
        />
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Contact />
        <Footer onTerminal={() => setTerminal(true)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@700;900&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  :root {
    --bg:        #05080a;
    --bg2:       #080c0f;
    --cyan:      #00e5ff;
    --cyan-dim:  #00b8cc;
    --cyan-glow: rgba(0,229,255,.15);
    --red:       #ff2a2a;
    --text:      #d4e2ed;
    --text-dim:  #6a8090;
    --border:    rgba(0,229,255,.13);
    --mono:      'JetBrains Mono', monospace;
    --display:   'Orbitron', monospace;
    --body:      'Inter', sans-serif;
  }

  .root { background:var(--bg); color:var(--text); font-family:var(--body); font-size:16px; min-height:100vh; overflow-x:hidden; position:relative; }
  .cyan { color:var(--cyan); }

  .grid-overlay {
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(0,229,255,0.025) 1px,transparent 1px),
      linear-gradient(90deg,rgba(0,229,255,0.025) 1px,transparent 1px);
    background-size:10px 10px;
  }

  /* ── GLASS ORBS ── */
  .glass-bg { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
  .glass-orb {
    position:absolute; border-radius:50%;
    background: radial-gradient(circle at 35% 35%,
      rgba(0,229,255,0.07) 0%, rgba(0,180,220,0.04) 40%,
      rgba(0,229,255,0.01) 70%, transparent 100%);
    border:1px solid rgba(0,229,255,0.06);
    backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
    animation:orbDrift linear infinite;
    will-change:transform;
  }
  @keyframes orbDrift {
    0%   { transform:translateY(0px)   rotate(0deg)  scale(1);    }
    33%  { transform:translateY(-18px) rotate(4deg)  scale(1.03); }
    66%  { transform:translateY(10px)  rotate(-3deg) scale(0.97); }
    100% { transform:translateY(0px)   rotate(0deg)  scale(1);    }
  }
  /* Note: inline transform from parallax is additive via CSS var trick — orbs
     use inline style transform, orbDrift keyframes are overridden by inline.
     To combine both, we nest: the inline transform handles parallax offset,
     and the drift is handled via a child pseudo-element on glass-orb.
     Simplest approach that avoids JS animation: use translate3d in inline
     and let the CSS @keyframes be the drift. Both apply via separate props
     since we only set translateY in JS — the CSS animation adds rotation/scale. */

  /* ── FLICKER ── */
  .global-flicker { animation:flicker 50ms linear; will-change:transform; }
  @keyframes flicker {
    0%   { filter:brightness(1.8) contrast(1.3) saturate(2); transform:translate(2px,-1px); }
    33%  { filter:brightness(0.4);                            transform:translate(-2px,1px); }
    66%  { filter:brightness(1.4) hue-rotate(15deg);          transform:translate(1px,2px);  }
    100% { filter:none;                                        transform:none;                }
  }

  .site-hidden  { opacity:0; pointer-events:none; }
  .site-visible { animation:siteIn .6s ease forwards; }
  @keyframes siteIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }

  /* ═══════════════════════════════════════════════════════════
     SCROLL REVEAL
     Sections start invisible. .is-visible (added by the
     IntersectionObserver) triggers the 'system boot' sequence:
     1. The section fades/translates in over 0.6s
     2. .reveal-title arrives 0ms after
     3. .reveal-content arrives 160ms later (staggered)
     Timing uses a sharp cubic-bezier, not a bounce.
  ═══════════════════════════════════════════════════════════ */
  .reveal-section {
    opacity: 0;
    transform: translateY(24px);
    transition:
      opacity  0.55s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .reveal-section.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Title boots first */
  .reveal-title {
    opacity: 0;
    transform: translateX(-12px);
    transition:
      opacity  0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s,
      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s;
  }
  .is-visible .reveal-title {
    opacity: 1;
    transform: translateX(0);
  }

  /* Content arrives slightly after */
  .reveal-content {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity  0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.18s,
      transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.18s;
  }
  .is-visible .reveal-content {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── COORD JITTER ── */
  .coord-jitter {
    color: var(--cyan);
    animation: coordScan 0.06s steps(1) infinite;
  }
  @keyframes coordScan {
    0%  { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* ── LOADER ── */
  .loader-overlay {
    position:fixed; inset:0; z-index:9999;
    background:var(--bg); display:flex; align-items:center; justify-content:center;
    overflow:hidden; will-change:transform;
  }
  .loader-overlay .shutter-top,
  .loader-overlay .shutter-bottom {
    position:absolute; left:0; right:0; height:50%;
    background:#000; z-index:10;
    transition:transform .65s cubic-bezier(0.7,0,1,1);
    will-change:transform;
  }
  .loader-overlay .shutter-top    { top:0;    transform:translateY(-100%); }
  .loader-overlay .shutter-bottom { bottom:0; transform:translateY(100%);  }
  .loader-overlay.shutter-active .shutter-top    { transform:translateY(0); }
  .loader-overlay.shutter-active .shutter-bottom { transform:translateY(0); }

  .loader-skip {
    position:absolute; bottom:28px; right:28px; z-index:12;
    background:none; border:1px solid rgba(0,229,255,.3);
    color:rgba(0,229,255,.6); font-family:var(--mono); font-size:.72rem;
    letter-spacing:.14em; padding:.35rem .9rem; cursor:pointer;
    transition:border-color .2s,color .2s;
  }
  .loader-skip:hover { border-color:var(--cyan); color:var(--cyan); }

  .world-map-svg { position:absolute; inset:0; width:100%; height:100%; opacity:.22; pointer-events:none; }
  .loader-scanlines { position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.3) 2px,rgba(0,0,0,.3) 4px); pointer-events:none; }
  .loader-layout { position:relative; z-index:2; display:flex; gap:1.5rem; align-items:flex-start; width:min(860px,95vw); }
  .loader-inner { position:relative; flex:1; padding:2.5rem; border:1px solid var(--border); background:rgba(5,8,10,.92); }
  .loader-bracket { position:absolute; width:18px; height:18px; }
  .loader-bracket.tl{top:-1px;left:-1px;border-top:2px solid var(--cyan);border-left:2px solid var(--cyan);}
  .loader-bracket.tr{top:-1px;right:-1px;border-top:2px solid var(--cyan);border-right:2px solid var(--cyan);}
  .loader-bracket.bl{bottom:-1px;left:-1px;border-bottom:2px solid var(--cyan);border-left:2px solid var(--cyan);}
  .loader-bracket.br{bottom:-1px;right:-1px;border-bottom:2px solid var(--cyan);border-right:2px solid var(--cyan);}
  .loader-logo { margin-bottom:2rem; }
  .loader-name { display:block; font-family:var(--display); font-size:clamp(1.1rem,3.5vw,1.7rem); font-weight:900; color:#fff; letter-spacing:.12em; }
  .loader-sub  { display:block; font-family:var(--mono); font-size:.72rem; color:var(--cyan); letter-spacing:.15em; margin-top:.4rem; }
  .loader-log  { min-height:150px; margin-bottom:1.8rem; font-family:var(--mono); font-size:.76rem; display:flex; flex-direction:column; gap:.3rem; line-height:1.5; }
  .loader-log-line { display:flex; gap:.6rem; }
  .loader-log-line.done   { color:var(--text-dim); }
  .loader-log-line.active { color:var(--cyan); }
  .loader-log-line.stall  { color:var(--red); font-weight:700; }
  .loader-log-line.stall-vis { opacity:1; }
  .loader-log-line.stall-hid { opacity:0; }
  .loader-log-prefix { width:1ch; flex-shrink:0; }
  .loader-bar-wrap { display:flex; align-items:center; gap:.8rem; margin-bottom:.7rem; }
  .loader-segments { display:flex; gap:3px; flex:1; }
  .loader-seg { flex:1; height:5px; background:rgba(255,255,255,.05); transition:background .1s; will-change:transform; }
  .loader-seg.filled    { background:var(--cyan-dim); }
  .loader-seg.active-seg{ background:var(--cyan); box-shadow:0 0 7px var(--cyan); animation:segPulse .4s ease infinite alternate; }
  .loader-seg.stall-seg { background:var(--red);  box-shadow:0 0 7px var(--red);  animation:segPulse .25s ease infinite alternate; }
  @keyframes segPulse { from{opacity:.6;}to{opacity:1;} }
  .loader-pct    { font-family:var(--display); font-size:.72rem; color:var(--cyan); width:3.5ch; text-align:right; flex-shrink:0; }
  .loader-status { font-family:var(--mono); font-size:.68rem; color:var(--text-dim); letter-spacing:.1em; }
  .loader-status.status-stall { color:var(--red); }
  .hex-panel { width:200px; flex-shrink:0; border:1px solid var(--border); background:rgba(5,8,10,.9); padding:1rem .75rem; overflow:hidden; max-height:340px; display:flex; flex-direction:column; }
  .hex-panel-label { font-family:var(--display); font-size:.58rem; color:var(--cyan); letter-spacing:.18em; margin-bottom:.7rem; border-bottom:1px solid var(--border); padding-bottom:.4rem; }
  .hex-stream { flex:1; overflow:hidden; display:flex; flex-direction:column; gap:1px; }
  .hex-line   { font-family:var(--mono); font-size:.6rem; color:rgba(0,229,255,0.35); white-space:nowrap; will-change:transform; }

  /* ── EFFECTS TOGGLE ── */
  .fx-toggle { display:flex; align-items:center; gap:.5rem; }
  .fx-label  { font-family:var(--mono); font-size:.68rem; color:var(--text-dim); letter-spacing:.12em; }
  .fx-switch { position:relative; width:36px; height:18px; border-radius:9px; background:var(--cyan); border:none; cursor:pointer; transition:background .25s; flex-shrink:0; }
  .fx-switch.fx-off { background:rgba(255,255,255,.12); }
  .fx-knob { position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .25s; display:block; }
  .fx-switch:not(.fx-off) .fx-knob { transform:translateX(18px); }

  /* ── NAV ── */
  .nav { position:fixed; top:0; left:0; right:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:1rem 2.5rem; transition:background .3s; }
  .nav-scrolled { background:rgba(5,8,10,.92); backdrop-filter:blur(14px); border-bottom:1px solid var(--border); }
  .nav-logo { font-family:var(--display); font-size:.92rem; letter-spacing:.1em; cursor:pointer; }
  .nav-links { display:flex; align-items:center; gap:1.6rem; }
  .nav-link { background:none; border:none; color:var(--text-dim); font-family:var(--mono); font-size:.75rem; letter-spacing:.1em; cursor:pointer; transition:color .2s; }
  .nav-link:hover { color:var(--cyan); }
  .nav-terminal { background:none; border:1px solid var(--border); padding:.28rem .6rem; border-radius:3px; font-family:var(--mono); font-size:.85rem; cursor:pointer; transition:border-color .2s,box-shadow .2s; }
  .nav-terminal:hover { border-color:var(--cyan); box-shadow:0 0 12px var(--cyan-glow); }

  /* ── HERO ── */
  .hero { position:relative; height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .crt-lines { position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.16) 2px,rgba(0,0,0,.16) 4px); pointer-events:none; z-index:1; }
  .scanline  { position:absolute; top:-100%; left:0; right:0; height:40px; background:linear-gradient(transparent,rgba(0,229,255,.04),transparent); animation:scan 7s linear infinite; pointer-events:none; z-index:2; will-change:transform; }
  @keyframes scan { to{top:110%;} }
  .hero-grid-bg { position:absolute; inset:0; background-image:linear-gradient(rgba(0,229,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.05) 1px,transparent 1px); background-size:60px 60px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent); z-index:0; }
  .hero-content { position:relative; z-index:3; text-align:center; padding:2rem; }
  .hero-eyebrow { font-family:var(--mono); font-size:.8rem; color:var(--cyan); letter-spacing:.18em; margin-bottom:1.4rem; min-height:1.2em; }
  .cursor-blink { animation:blink .7s step-end infinite; }
  @keyframes blink { 50%{opacity:0;} }
  .hero-name     { font-family:var(--display); font-size:clamp(4rem,12vw,9rem); font-weight:900; letter-spacing:.05em; color:#fff; margin-bottom:.8rem; }
  .hero-role     { font-family:var(--mono); font-size:clamp(.8rem,2vw,1rem); color:var(--text-dim); letter-spacing:.07em; margin-bottom:.5rem; }
  .sep           { color:var(--border); }
  .hero-location { font-family:var(--mono); font-size:.78rem; color:var(--text-dim); letter-spacing:.1em; margin-bottom:2rem; }
  .hero-actions  { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }

  /* HUD Corners */
  .hud-corner { position:absolute; z-index:4; font-family:var(--mono); padding:.5rem .8rem; border:1px solid var(--border); background:rgba(5,8,10,.7); backdrop-filter:blur(4px); }
  .hud-tl { top:80px; left:20px; }
  .hud-tr { top:80px; right:20px; text-align:right; }
  .hud-bl { bottom:40px; left:20px; }
  .hud-br { bottom:40px; right:20px; text-align:right; }
  .hud-label  { font-size:.6rem; color:var(--text-dim); letter-spacing:.16em; margin-bottom:.25rem; }
  .hud-val    { font-size:.76rem; color:var(--text); }
  .hud-subval { font-size:.64rem; color:var(--text-dim); letter-spacing:.08em; margin-top:.1rem; }
  .hud-row    { display:flex; align-items:center; gap:.5rem; }
  .signal-bars { display:flex; align-items:flex-end; gap:2px; height:14px; }
  .signal-bar  { width:4px; background:var(--cyan); border-radius:1px; transition:opacity .3s,height .3s; will-change:transform; }
  .bitrate-val { font-size:.76rem; color:var(--cyan); font-family:var(--mono); }

  /* ── GLITCH ── */
  .glitch-host { display:inline-block; transition:filter .05s; will-change:transform; }
  .glitch-hue  { filter:hue-rotate(90deg) contrast(1.5); }
  .glitch-wrap { position:relative; display:inline-block; }
  .glitch-wrap::before,.glitch-wrap::after { content:attr(data-text); position:absolute; top:0; left:0; right:0; overflow:hidden; }
  .glitch-wrap::before { color:#ff003c; animation:glitch1 3.5s infinite; clip-path:polygon(0 0,100% 0,100% 35%,0 35%); will-change:transform; }
  .glitch-wrap::after  { color:var(--cyan); animation:glitch2 3.5s infinite; clip-path:polygon(0 65%,100% 65%,100% 100%,0 100%); will-change:transform; }
  @keyframes glitch1 { 0%,94%,100%{transform:none;opacity:0;} 95%{transform:translateX(-4px) skewX(-2deg);opacity:.8;} 97%{transform:translateX(4px);opacity:.8;} }
  @keyframes glitch2 { 0%,91%,100%{transform:none;opacity:0;} 92%{transform:translateX(4px);opacity:.7;} 94%{transform:translateX(-3px);opacity:.7;} }

  /* ── BUTTONS ── */
  .btn-primary { background:var(--cyan); color:#000; border:none; padding:.75rem 1.8rem; font-family:var(--mono); font-size:.82rem; letter-spacing:.1em; cursor:pointer; transition:box-shadow .2s,transform .15s; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); will-change:transform; }
  .btn-primary:hover { box-shadow:0 0 24px rgba(0,229,255,.5); transform:translateY(-2px); }
  .btn-ghost { background:transparent; border:1px solid var(--cyan); color:var(--cyan); padding:.75rem 1.8rem; font-family:var(--mono); font-size:.82rem; letter-spacing:.1em; cursor:pointer; transition:background .2s,box-shadow .2s; }
  .btn-ghost:hover { background:var(--cyan-glow); box-shadow:0 0 20px var(--cyan-glow); }

  /* ── SECTIONS ── */
  .section { padding:6rem 2rem; position:relative; z-index:1; }
  .section-alt { background:var(--bg2); }
  .section-inner { max-width:1100px; margin:0 auto; }
  .section-title { font-family:var(--display); font-size:1.3rem; letter-spacing:.1em; margin-bottom:1.5rem; color:#fff; }

  /* ── ABOUT ── */
  .about-grid { display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:start; }
  @media(max-width:700px){.about-grid{grid-template-columns:1fr;}}
  .about-text p { font-size:1.05rem; line-height:1.8; color:var(--text); margin-bottom:1.2rem; font-family:var(--body); }
  .about-card-inner { border:1px solid var(--border); padding:2rem; background:rgba(0,229,255,.02); display:flex; flex-direction:column; gap:1.5rem; }
  .about-stat { display:flex; flex-direction:column; gap:.25rem; }
  .stat-num { font-family:var(--display); font-size:1.5rem; }
  .about-stat span:last-child { font-family:var(--mono); font-size:.72rem; color:var(--text-dim); letter-spacing:.07em; }
  .about-badge { display:flex; align-items:center; gap:.6rem; font-family:var(--mono); font-size:.72rem; color:var(--text-dim); padding-top:.5rem; border-top:1px solid var(--border); }
  .badge-dot { width:8px; height:8px; border-radius:50%; background:#00ff87; box-shadow:0 0 8px #00ff87; animation:pulse 2s ease-in-out infinite; flex-shrink:0; }
  @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:.4;} }
  .skills-hint { font-family:var(--mono); font-size:.72rem; color:var(--text-dim); margin-bottom:2rem; letter-spacing:.1em; }

  /* ── RADAR SKILLS ── */
  .radar-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px);
    opacity:0; pointer-events:none; transition:opacity .5s ease; z-index:90;
  }
  .radar-backdrop.active { opacity:1; pointer-events:auto; }
  .radar-module-container { position:relative; z-index:91; width:fit-content; margin:0 auto; transition:transform .6s cubic-bezier(0.16,1,0.3,1); }
  .radar-module-container.is-active { transform:scale(1.02); }
  .radar-card {
    background:rgba(5,10,15,0.95); border:1px solid var(--border);
    padding:1.5rem; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.5);
    display:flex; flex-direction:column; gap:1.2rem;
    max-width:360px; transition:all .6s cubic-bezier(0.16,1,0.3,1); overflow:hidden;
  }
  .is-active .radar-card { max-width:850px; border-color:var(--cyan); box-shadow:0 0 30px var(--cyan-glow); }
  .radar-layout { display:flex; align-items:center; gap:2.5rem; }
  @media(max-width:800px){ .radar-layout{flex-direction:column;} .is-active .radar-card{max-width:95vw;} }
  .radar-svg-wrap { flex-shrink:0; position:relative; }
  .radar-ring { fill:none; stroke:var(--cyan); stroke-width:0.5; }
  .radar-axis { stroke:var(--border); stroke-width:0.5; stroke-dasharray:2,4; }
  .radar-poly-main { fill:rgba(0,229,255,0.12); stroke:var(--cyan); stroke-width:1.5; }
  .radar-vertex { fill:var(--cyan); filter:drop-shadow(0 0 3px var(--cyan)); }
  .radar-sweep-group { transform-origin:160px 160px; animation:radar-sweep 4s linear infinite; }
  .radar-sweep-line { stroke:var(--cyan); stroke-width:1.5; opacity:0.5; }
  @keyframes radar-sweep { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }
  .radar-data-panel { flex:1; display:flex; flex-direction:column; gap:1.2rem; opacity:0; transform:translateX(20px); transition:all .5s ease; min-width:300px; visibility:hidden; height:0; }
  .is-active .radar-data-panel { opacity:1; transform:translateX(0); visibility:visible; height:auto; }
  .radar-data-row { font-family:var(--mono); }
  .data-header { display:flex; justify-content:space-between; margin-bottom:.4rem; }
  .data-label  { font-size:.75rem; color:#fff; text-transform:uppercase; letter-spacing:.05em; }
  .data-pct    { font-size:.75rem; color:var(--cyan); }
  .data-bar-bg { width:100%; height:3px; background:rgba(255,255,255,0.05); margin-bottom:.5rem; }
  .data-bar-fill { height:100%; background:var(--cyan); box-shadow:0 0 8px var(--cyan); transition:width 1.2s cubic-bezier(0.16,1,0.3,1); }
  .data-items  { font-size:.65rem; color:var(--text-dim); line-height:1.4; }
  .radar-card-header,.radar-card-footer { display:flex; justify-content:space-between; font-family:var(--mono); font-size:.6rem; color:var(--text-dim); letter-spacing:.1em; }
  .blink-dot { display:inline-block; width:6px; height:6px; background:var(--cyan); border-radius:50%; margin-right:6px; animation:blink 1.2s step-end infinite; }

  /* ── PROJECTS ── */
  .projects-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:1.5rem; }
  .project-card { border:1px solid var(--border); padding:1.8rem; background:rgba(0,229,255,.015); transition:border-color .2s,box-shadow .25s,transform .2s; will-change:transform; }
  .project-card:hover { border-color:var(--cyan-dim); box-shadow:0 0 30px var(--cyan-glow); transform:translateY(-4px); }
  .project-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.8rem; }
  .project-id     { font-family:var(--display); font-size:.68rem; letter-spacing:.18em; }
  .project-status { font-family:var(--mono); font-size:.62rem; letter-spacing:.08em; padding:.18rem .5rem; }
  .status-active { border:1px solid var(--cyan); color:var(--cyan); }
  .status-done   { border:1px solid #00ff87; color:#00ff87; }
  .status-wip    { border:1px solid #ffd700; color:#ffd700; }
  .project-title  { font-family:var(--display); font-size:.95rem; color:#fff; margin-bottom:.3rem; letter-spacing:.04em; }
  .project-period { font-family:var(--mono); font-size:.68rem; color:var(--text-dim); margin-bottom:.7rem; }
  .project-desc   { font-family:var(--body); font-size:.96rem; line-height:1.7; color:var(--text-dim); margin-bottom:1.2rem; }
  .project-tags   { display:flex; flex-wrap:wrap; gap:.4rem; }
  .project-tag    { font-family:var(--mono); font-size:.64rem; color:var(--cyan-dim); background:rgba(0,229,255,.07); padding:.18rem .5rem; }

  /* ── EXPERIENCE TIMELINE ── */
  .exp-timeline {
    position: relative;
    padding-left: 28px; /* space for the data line */
  }

  /*
    The vertical data line — starts at height 0, grows to 100% when
    .is-visible is added to the parent .reveal-section.
    We target it via the section ancestor having .is-visible.
  */
  .exp-data-line {
    position: absolute;
    left: 0; top: 0;
    width: 1px;
    height: 0;
    background: linear-gradient(to bottom, var(--cyan), rgba(0,229,255,0.1));
    box-shadow: 0 0 6px var(--cyan);
    transition: height 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
  }
  /* When the section becomes visible, grow the line */
  .is-visible .exp-data-line { height: 100%; }

  .exp-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1.5rem; }
  .exp-card {
    position: relative;
    border:1px solid var(--border); padding:1.8rem;
    background:rgba(0,229,255,.015); transition:border-color .2s,box-shadow .2s;
  }
  .exp-card:hover { border-color:var(--cyan-dim); box-shadow:0 0 20px var(--cyan-glow); }

  /* Dot on the data line per card */
  .exp-node {
    position: absolute;
    left: -33px; top: 1.8rem;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
    opacity: 0;
    transition: opacity 0.4s ease 0.8s;
  }
  .is-visible .exp-node { opacity: 1; }

  .exp-tag    { font-family:var(--display); font-size:.64rem; letter-spacing:.14em; color:var(--cyan); border:1px solid var(--cyan); display:inline-block; padding:.14rem .48rem; margin-bottom:.9rem; }
  .exp-title  { font-family:var(--display); font-size:.9rem; color:#fff; letter-spacing:.04em; margin-bottom:.35rem; }
  .exp-place  { font-family:var(--mono); font-size:.72rem; color:var(--cyan-dim); margin-bottom:.25rem; }
  .exp-period { font-family:var(--mono); font-size:.66rem; color:var(--text-dim); margin-bottom:.8rem; }
  .exp-desc   { font-family:var(--body); font-size:.96rem; line-height:1.7; color:var(--text-dim); }

  /* ── CONTACT ── */
  .contact-inner { text-align:center; max-width:700px; margin:0 auto; }
  .contact-sub   { font-family:var(--body); font-size:1.05rem; color:var(--text-dim); margin-bottom:2rem; line-height:1.6; }
  .contact-links { display:flex; flex-direction:column; gap:1rem; align-items:center; margin-bottom:2.5rem; }
  .contact-link  { font-family:var(--mono); font-size:.88rem; color:var(--text); text-decoration:none; display:flex; align-items:center; gap:.8rem; transition:color .2s; }
  .contact-link:hover { color:var(--cyan); }
  .contact-form  { display:flex; flex-direction:column; gap:.9rem; text-align:left; }
  .cf-row        { display:grid; grid-template-columns:1fr 1fr; gap:.9rem; }
  @media(max-width:600px){.cf-row{grid-template-columns:1fr;}}
  .cf-input, .cf-textarea {
    background:rgba(0,229,255,.03); border:1px solid var(--border);
    color:var(--text); font-family:var(--mono); font-size:.8rem;
    letter-spacing:.06em; padding:.75rem 1rem; outline:none; resize:vertical;
    transition:border-color .2s,box-shadow .2s;
  }
  .cf-input::placeholder, .cf-textarea::placeholder { color:var(--text-dim); }
  .cf-input:focus, .cf-textarea:focus { border-color:var(--cyan-dim); box-shadow:0 0 12px var(--cyan-glow); }
  .cf-send   { align-self:flex-start; margin-top:.3rem; }
  .contact-sent { font-family:var(--mono); font-size:.84rem; color:var(--text-dim); margin-top:.5rem; }
  .cf-note   { font-family:var(--body); font-size:.78rem; color:var(--text-dim); line-height:1.6; margin-top:.4rem; }
  .cf-note a { text-decoration:none; transition:opacity .2s; }
  .cf-note a:hover { opacity:.8; }

  /* ── FOOTER ── */
  .footer { border-top:1px solid var(--border); padding:1.5rem 2.5rem; display:flex; align-items:center; justify-content:space-between; font-family:var(--mono); font-size:.72rem; color:var(--text-dim); position:relative; z-index:1; }
  .footer-egg { background:none; border:none; color:var(--text-dim); font-family:var(--mono); cursor:pointer; opacity:.22; transition:opacity .2s,color .2s; }
  .footer-egg:hover { opacity:1; color:var(--cyan); }

  /* ── TERMINAL ── */
  .terminal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; padding:2rem; animation:fadein .15s ease; }
  @keyframes fadein { from{opacity:0;}to{opacity:1;} }
  .terminal-window { width:100%; max-width:720px; background:#050b0f; border:1px solid var(--cyan-dim); box-shadow:0 0 60px rgba(0,229,255,.18); font-family:var(--mono); animation:slidein .2s ease; }
  @keyframes slidein { from{transform:translateY(20px);opacity:0;}to{transform:none;opacity:1;} }
  .terminal-titlebar { background:#0a1218; padding:.55rem 1rem; display:flex; align-items:center; gap:.5rem; border-bottom:1px solid var(--border); }
  .dot { width:12px; height:12px; border-radius:50%; cursor:pointer; }
  .dot.red{background:#ff5f57;} .dot.yellow{background:#febc2e;} .dot.green{background:#28c840;}
  .terminal-title { flex:1; text-align:center; font-size:.72rem; color:var(--text-dim); letter-spacing:.1em; }
  .terminal-body  { padding:1rem 1.2rem; min-height:320px; max-height:60vh; overflow-y:auto; cursor:text; }
  .term-line { font-size:.82rem; line-height:1.85; white-space:pre-wrap; font-family:var(--mono); }
  .term-line.sys   { color:var(--cyan);  }
  .term-line.input { color:#fff;         }
  .term-line.out   { color:var(--text);  }
  .term-line.err   { color:#ff5f57;      }
  .term-input-row  { display:flex; align-items:center; margin-top:.5rem; }
  .term-prompt { color:var(--cyan); margin-right:.4rem; font-size:.82rem; }
  .term-input  { flex:1; background:none; border:none; outline:none; color:#fff; font-family:var(--mono); font-size:.82rem; caret-color:var(--cyan); }
`;
