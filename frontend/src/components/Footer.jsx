import React from 'react';
import satyam from '../assets/satyam.jpeg';
import rabishankar from '../assets/rabishankar.jpeg';
import kathakali from '../assets/kathakali.png';

const GitHubIcon = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

const LinkedInIcon = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
export default function Footer() {
  const teamMembers = [
  { name: 'Satyam Puitandy', email: 'puitandys05@gmail.com', github: 'https://github.com/puitandysatyam', linkedin: 'https://www.linkedin.com/in/satyampuitandy/', avatar: satyam },
  { name: 'Rabishankar Roy', email: 'rabishankarroy04@gmail.com', github: 'https://github.com/rabishankarroy04-svg', linkedin: 'https://www.linkedin.com/in/rabishankar-roy-055a52343/', avatar: rabishankar },
  { name: 'Kathakali Das', email: '2004kathakali@gmail.com', github: 'https://github.com/Kathakali07', linkedin: 'https://www.linkedin.com/in/kathakali-kd-46a93623b/', avatar: kathakali }
];

  return (
    <footer id="about-us" style={{ borderTop: '1px solid #e2e8f0', padding: '64px 24px', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 48 }}>

        {/* Brand */}
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', marginBottom: 12 }}>
            RR<sup style={{ color: '#4f46e5', fontSize: 16, verticalAlign: 'super' }}>2</sup>
          </div>
          <div style={{ fontSize: 14, color: '#64748b', maxWidth: 300, lineHeight: 1.6 }}>
            <b>Rupee Radar</b> — AI-driven financial analysis for bank statements. Built to make every rupee accountable.
          </div>
          <div style={{ marginTop: 24, fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
            Engineered by a specialized team of 3.
          </div>
        </div>

        {/* The Team */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>The Team</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {teamMembers.map((member, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, 
                  padding: '8px 12px', borderRadius: '12px', transition: 'all 0.2s ease', cursor: 'default',
                  margin: '0 -12px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#eef2ff', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0, position: 'relative' }}>
                    <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',display: 'block', position: 'absolute', inset: 0  }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>{member.name}</span>
                    <a
                      href={'mailto:' + member.email}
                      style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, transition: 'color 0.15s', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >{member.email}</a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                  <a href={member.github} target="_blank" rel="noreferrer" title="GitHub"
                    style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  ><GitHubIcon size={18} /></a> {/* <-- FIXED HERE */}
                  <a href={member.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"
                    style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0077b5'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  ><LinkedInIcon size={18} /></a> {/* <-- FIXED HERE */}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div style={{ flex: '1 1 140px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>Legal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Terms & Conditions', 'Privacy Policy', 'Data Security', 'Financial Disclaimer', 'Cookie Policy'].map(link => (
              <div key={link}>
                <a href="#"
                  style={{ fontSize: 14, color: '#64748b', fontWeight: 500, transition: 'all 0.15s ease', textDecoration: 'none', display: 'inline-block' }}
                  onMouseEnter={e => { e.target.style.color = '#4f46e5'; e.target.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.transform = 'translateX(0)'; }}
                >{link}</a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
