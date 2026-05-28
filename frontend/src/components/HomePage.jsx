import React, { useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Network,
  ArrowRight,
  ChevronRight,
  Database,
  Server,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import Navbar from './Navbar';

/* ─── Inline SVG brand icons (no lucide dependency) ─── */
function GitHubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function LinkedInIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

/* ─── Animated mesh gradient canvas ─── */
function MeshGradient() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let t = 0;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const blobs = [
        { x: w * (0.15 + 0.1 * Math.sin(t * 0.4)), y: h * (0.2 + 0.08 * Math.cos(t * 0.3)), r: w * 0.42, c: [120, 80, 240] },
        { x: w * (0.65 + 0.12 * Math.cos(t * 0.35)), y: h * (0.1 + 0.1 * Math.sin(t * 0.28)), r: w * 0.38, c: [240, 100, 80] },
        { x: w * (0.8 + 0.08 * Math.sin(t * 0.45)), y: h * (0.6 + 0.1 * Math.cos(t * 0.38)), r: w * 0.3, c: [250, 170, 50] },
        { x: w * (0.3 + 0.1 * Math.cos(t * 0.32)), y: h * (0.75 + 0.08 * Math.sin(t * 0.42)), r: w * 0.34, c: [60, 180, 230] },
      ];

      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0.72)`);
        g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      t += 0.006;
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

/* ─── Stripe-style floating product UI card ─── */
function ProductMockup() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      width: '100%',
      maxWidth: 820,
      margin: '0 auto',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Left: Transaction card */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: '24px 24px 20px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7850f0,#4f3dc8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>HDFC Bank Statement</div>
            <div style={{ fontSize: 11, color: '#888' }}>Apr 2025 · 312 transactions</div>
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700,
            background: '#ecfdf5', color: '#059669',
            padding: '3px 9px', borderRadius: 20,
          }}>Analysed</div>
        </div>

        {[
          { name: 'Swiggy Order', cat: 'Food & Dining', amt: '−₹ 486', color: '#f97316' },
          { name: 'Amazon Pay', cat: 'Shopping', amt: '−₹ 2,340', color: '#7850f0' },
          { name: 'Salary Credit', cat: 'Income', amt: '+₹ 85,000', color: '#059669', positive: true },
          { name: 'Zepto Instant', cat: 'Groceries', amt: '−₹ 1,120', color: '#0ea5e9' },
        ].map((tx, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0',
            borderBottom: i < 3 ? '0.5px solid #f0f0f0' : 'none',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: tx.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: tx.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{tx.name}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{tx.cat}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tx.positive ? '#059669' : '#111' }}>{tx.amt}</div>
          </div>
        ))}
      </div>

      {/* Right: metrics stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Health score */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: '20px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>Financial Health Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#111', lineHeight: 1 }}>74</div>
            <div style={{ fontSize: 13, color: '#888' }}>/ 100</div>
          </div>
          <div style={{ marginTop: 12, height: 6, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden' }}>
            <div style={{ width: '74%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#7850f0,#4f3dc8)' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#059669', fontWeight: 600 }}>▲ 6 pts vs last month</div>
        </div>

        {/* Anomaly alert */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: '18px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
          borderLeft: '3.5px solid #f97316',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={14} color="#f97316" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged for Review</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>3× spike in UPI transfers</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Autoencoder flagged Apr 18–22</div>
        </div>

        {/* Spend Breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: '18px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Spend Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Food & Dining', pct: 38, color: '#f97316' },
              { label: 'Shopping', pct: 27, color: '#7850f0' },
              { label: 'Utilities', pct: 20, color: '#0ea5e9' },
              { label: 'Others', pct: 15, color: '#d1d5db' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: '#111', fontWeight: 700 }}>{s.pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden' }}>
                  <div style={{ width: s.pct + '%', height: '100%', borderRadius: 99, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
import AuthModal from './AuthModal';

export default function HomePage({ onLogin }) {
  const [showAuth, setShowAuth] = React.useState(false);

  const architectureDetails = [
    {
      icon: <Server size={22} color="#7850f0" />,
      bg: '#f3f0ff',
      title: "Spring Boot Ingestion",
      description: "Rapid API layer handling secure CSV/PDF uploads and regex-based PII sanitization before queuing.",
    },
    {
      icon: <Network size={22} color="#0ea5e9" />,
      bg: '#e0f2fe',
      title: "AWS SQS Event Broker",
      description: "Fully managed message queuing ensures zero data loss and prevents bottlenecks during heavy ML workloads.",
    },
    {
      icon: <BrainCircuit size={22} color="#f97316" />,
      bg: '#fff7ed',
      title: "FastAPI ML Execution",
      description: "Dedicated Python layer running DistilBERT categorization and Autoencoder anomaly detection.",
    },
    {
      icon: <Database size={22} color="#059669" />,
      bg: '#ecfdf5',
      title: "Amazon DynamoDB",
      description: "The single source of truth. All microservices read and write to a fully managed NoSQL database for single-digit millisecond performance.",
    },
  ];

  const teamMembers = [
    { name: 'Team Member 1', email: 'member1@example.com', github: '#', linkedin: '#' },
    { name: 'Team Member 2', email: 'member2@example.com', github: '#', linkedin: '#' },
    { name: 'Team Member 3', email: 'member3@example.com', github: '#', linkedin: '#' },
    { name: 'Team Member 4', email: 'member4@example.com', github: '#', linkedin: '#' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', sans-serif", color: '#111', overflowX: 'hidden' }}>
      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          onSuccess={(data) => {
            setShowAuth(false);
            onLogin(data); // Pass token data up to App.jsx
          }} 
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: #c4b5fd; }
        a { text-decoration: none; color: inherit; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up   { animation: fadeUp 0.8s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-2 { animation: fadeUp 0.8s 0.15s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-3 { animation: fadeUp 0.8s 0.30s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-4 { animation: fadeUp 0.8s 0.45s cubic-bezier(.22,1,.36,1) both; }
        .arch-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.10); transform: translateY(-3px); }
        .arch-card { transition: box-shadow 0.25s, transform 0.25s; }
        .btn-primary  { transition: background 0.18s, transform 0.12s; }
        .btn-primary:hover  { background: #5f3de8 !important; }
        .btn-primary:active { transform: scale(0.97); }
        .btn-secondary  { transition: background 0.18s, transform 0.12s; }
        .btn-secondary:hover  { background: #f9f9f9 !important; }
        .btn-secondary:active { transform: scale(0.97); }
      `}</style>

      <Navbar onLogin={() => setShowAuth(true)} />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <MeshGradient />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 800, textAlign: 'center', marginBottom: 64 }}>
          <h1 className="fade-up-2" style={{ fontSize: 'clamp(48px,8vw,88px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.03em', color: '#fff', textShadow: '0 2px 32px rgba(0,0,0,0.18)', marginBottom: 24 }}>
            Drag.Drop.
            <span style={{ fontStyle: 'italic', color: '#fde68a' }}>Decode.</span>
          </h1>

          <p className="fade-up-3" style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,1)', maxWidth: 560, margin: '0 auto 40px', fontWeight: 400 }}>
            Securely process CSV and PDF statements, anonymize sensitive information, uncover spending patterns and flag suspicious activity within milliseconds. Transform static bank statements into live financial insights with AI-driven analysis.
          </p>

          <div className="fade-up-4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={() => setShowAuth(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#7850f0', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(120,80,240,0.4)' }}
            >
              Open Dashboard <ArrowRight size={16} />
            </button>
            <button
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'rgba(255,255,255,0.85)', color: '#111', border: '0.5px solid rgba(255,255,255,0.6)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              API Docs <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 860 }}>
          <ProductMockup />
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" style={{ background: '#fff', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 600, marginBottom: 64 }}>
            <div style={{ display: 'inline-block', fontSize: 30, fontWeight: 800, color: '#7850f0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Under the Hood
            </div>
            <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#111', marginBottom: 20 }}>
              Decoupled microservice<br />architecture
            </h2>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.7, fontWeight: 400 }}>
              PR² stands for Pice Rupee Radar. It is an AI-powered financial intelligence platform designed to help users analyze, understand and optimize their banking expenses effortlessly.
              A distributed microservice architecture that decouples data ingestion from AI computation, enabling low-latency financial analysis without bottlenecks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 20 }}>
            {architectureDetails.map((layer, i) => (
              <div key={i} className="arch-card" style={{ background: '#fafafa', border: '0.5px solid #e8e8e8', borderRadius: 20, padding: '32px 28px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: layer.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                  {layer.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 10 }}>{layer.title}</div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65 }}>{layer.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
