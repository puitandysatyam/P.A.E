import React, { useEffect, useState } from 'react';


export default function Navbar({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');

        .pice-nav-link {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
          padding: 4px 0;
          position: relative;
        }
        .pice-nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: #7850f0;
          transition: width 0.2s;
          border-radius: 99px;
        }
        .pice-nav-link:hover { color: #111; }
        .pice-nav-link:hover::after { width: 100%; }

        .pice-btn-login {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .pice-btn-login:hover { color: #111; background: #f5f5f5; }

        .pice-btn-signup {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          background: #4f46e5;
          border: none;
          cursor: pointer;
          padding: 10px 22px;
          border-radius: 8px;
          transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(79,70,229,0.35);
          font-family: 'DM Sans', sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .pice-btn-signup:hover { background: #4338ca; box-shadow: 0 4px 20px rgba(79,70,229,0.45); }
        .pice-btn-signup:active { transform: scale(0.97); }

        .pice-divider {
          width: 1px;
          height: 18px;
          background: #e0e0e0;
          margin: 0 4px;
        }

        .pr2-logo-circle {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #e8e6ff;
          box-shadow: 0 2px 10px rgba(79,70,229,0.18);
          transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s ease;
          flex-shrink: 0;
        }
        .pr2-logo-circle:hover {
          transform: translateY(-4px) scale(1.08);
          box-shadow: 0 10px 28px rgba(79,70,229,0.28);
        }
        .pr2-logo-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
      `}</style>

      <nav style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 100,
        background: '#fff',
        borderBottom: scrolled ? '1px solid #ebebeb' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 28px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}>

          {/* Logo — Image version */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0, gap: '12px' }}>
            <div className="pr2-logo-circle" style={{ overflow: 'hidden', padding: 0, background: 'transparent' }}>
              <img src="/rupee-radar-logo.jpeg" alt="Rupee Radar Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', letterSpacing: '-1px' }}>
              Rupee Radar
            </div>
          </div>

          {/* Center nav links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            flex: 1,
            justifyContent: 'flex-end',
          }}>
            <a href="#architecture" className="pice-nav-link">Architecture</a>
            <div className="pice-divider" />
            <a href="#about-us" className="pice-nav-link">About Us</a>
          </div>

          {/* Right: auth */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}>
            <button className="pice-btn-login" onClick={onLogin}>Log in</button>
            <button className="pice-btn-signup" onClick={onLogin}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Download App
            </button>
          </div>

        </div>
      </nav>
    </>
  );
}