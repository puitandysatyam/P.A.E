import React from 'react';

export default function InvestmentRecommendations({ adPayload, onUpgrade }) {
  // Determine which category of extra ads to show
  let category = 'invest';
  if (adPayload) {
    const cta = adPayload.cta || '';
    if (cta.includes('Swiggy')) category = 'shopping';
    else if (cta.includes('CRED')) category = 'bills';
  }

  // Pre-defined static ad payloads based on category
  const extraAds = {
    invest: [
      {
        title: 'ICICI Prudential Liquid Fund',
        description: 'Earn ~7.1% p.a. with instant withdrawal capabilities. A much better alternative to leaving cash idle.',
        cta: 'Explore Fund',
        link: 'https://icicipruamc.com',
        logo: '/icici.jpg',
        badge: 'Low Risk',
        badgeBg: '#d1fae5',
        badgeColor: '#059669'
      },
      {
        title: 'Tata Digital India Fund',
        description: 'Capitalize on the IT sector\'s growth with historical 18-20% p.a. returns over 5 years. Ideal for long-term wealth creation.',
        cta: 'Explore Fund',
        link: 'https://tatamutualfund.com',
        logo: '/tatamf.jpg',
        badge: 'High Risk',
        badgeBg: '#fee2e2',
        badgeColor: '#b91c1c'
      }
    ],
    shopping: [
      {
        title: 'Amazon Pay ICICI Card',
        description: 'Get flat 5% unlimited cashback on all your Amazon purchases, plus 1% on all other online spends.',
        cta: 'Apply Now',
        link: 'https://amazon.in/cbcc',
        logo: '/amazon.jpg',
        badge: 'Top Pick',
        badgeBg: '#fef3c7',
        badgeColor: '#d97706'
      },
      {
        title: 'Flipkart Axis Bank Card',
        description: 'Earn 5% flat cashback on Flipkart and Myntra. No upper limit on earnings!',
        cta: 'Apply Now',
        link: 'https://flipkart.com',
        logo: '/flipkart.jpg',
        badge: 'Shopping',
        badgeBg: '#e0e7ff',
        badgeColor: '#4338ca'
      }
    ],
    bills: [
      {
        title: 'Cheq App',
        description: 'Pay your credit card bills on time and earn 1% cashback in the form of Cheq chips for rewards.',
        cta: 'Download Cheq',
        link: 'https://cheq.one',
        logo: '/cheq.jpg',
        badge: 'Rewards',
        badgeBg: '#fce7f3',
        badgeColor: '#be185d'
      },
      {
        title: 'RedGirraffe RentPay',
        description: 'Pay rent using your credit card at the lowest convenience fee in the market (only 0.39%!).',
        cta: 'Start Paying',
        link: 'https://redgirraffe.com',
        logo: '/redgirraffe.jpg',
        badge: 'Savings',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d'
      }
    ]
  };

  const getDynamicLogo = (cta) => {
    if (!cta) return '/icici.jpg';
    if (cta.includes('Groww')) return '/groww.jpg';
    if (cta.includes('Swiggy')) return '/swiggy.jpg';
    if (cta.includes('CRED')) return '/cred.jpg';
    return '/icici.jpg';
  };

  // If there's a dynamic ad, we'll render it as the center piece, plus 2 contextual static ads.
  if (adPayload) {
    const contextAds = extraAds[category] || extraAds.invest;
    const dynamicLogo = getDynamicLogo(adPayload.cta);

    return (
      <div style={{ gridColumn: '1 / -1', marginTop: 16, background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)', borderRadius: 16, padding: '48px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Your savings are sleeping. Let's wake them up.</h2>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 40, maxWidth: 650, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Don't let inflation eat your hard-earned money. Based on your recent spending profile, our AI has curated the smartest places to park your cash this month.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
          
          {/* Ad 1: Static Context Ad */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: contextAds[0].badgeColor, background: contextAds[0].badgeBg, padding: '4px 12px', borderRadius: 20 }}>{contextAds[0].badge}</div>
              <img src={contextAds[0].logo} alt="Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{contextAds[0].title}</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5, flex: 1 }}>{contextAds[0].description}</p>
            <a href={contextAds[0].link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, color: '#4f46e5', cursor: 'pointer', transition: '0.2s' }}>{contextAds[0].cta}</button>
            </a>
          </div>

          {/* Ad 2: Main Dynamic AI Payload */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 12px 24px rgba(79,70,229,0.1)', border: '2px solid #4f46e5', position: 'relative', display: 'flex', flexDirection: 'column', transform: 'scale(1.05)', zIndex: 10 }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>AI Top Pick</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', background: '#e0e7ff', padding: '4px 12px', borderRadius: 20 }}>Highly Recommended</div>
              {adPayload.link !== '#upgrade' && <img src={dynamicLogo} alt="Logo" style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'contain' }} />}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{adPayload.title}</h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.6, flex: 1 }}>{adPayload.description}</p>
            {adPayload.link === '#upgrade' ? (
              <button onClick={onUpgrade} style={{ width: '100%', padding: '14px', background: '#4f46e5', border: 'none', borderRadius: 8, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', fontSize: '15px' }}>{adPayload.cta}</button>
            ) : (
              <a href={adPayload.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '14px', background: '#4f46e5', border: 'none', borderRadius: 8, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', fontSize: '15px' }}>{adPayload.cta}</button>
              </a>
            )}
          </div>

          {/* Ad 3: Static Context Ad */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: contextAds[1].badgeColor, background: contextAds[1].badgeBg, padding: '4px 12px', borderRadius: 20 }}>{contextAds[1].badge}</div>
              <img src={contextAds[1].logo} alt="Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{contextAds[1].title}</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5, flex: 1 }}>{contextAds[1].description}</p>
            <a href={contextAds[1].link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, color: '#4f46e5', cursor: 'pointer', transition: '0.2s' }}>{contextAds[1].cta}</button>
            </a>
          </div>

        </div>
      </div>
    );
  }

  // Fallback to purely static ads if no adPayload is present yet
  return (
    <div style={{ gridColumn: '1 / -1', marginTop: 16, background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)', borderRadius: 16, padding: '48px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Your savings are sleeping. Let's wake them up.</h2>
      <p style={{ color: '#64748b', fontSize: 15, marginBottom: 40, maxWidth: 650, margin: '0 auto 40px', lineHeight: 1.6 }}>
        Don't let inflation eat your hard-earned money. Based on your recent spending profile, our AI has curated the smartest places to park your cash this month.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
        
        <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '4px 12px', borderRadius: 20 }}>Low Risk</div>
            <img src="/icici.jpg" alt="ICICI Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>ICICI Prudential Liquid Fund</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5, flex: 1 }}>Earn ~7.1% p.a. with instant withdrawal capabilities. A much better alternative to leaving cash idle.</p>
          <button style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, color: '#4f46e5', cursor: 'pointer', transition: '0.2s' }}>Explore Fund</button>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 12px 24px rgba(79,70,229,0.1)', border: '2px solid #4f46e5', position: 'relative', display: 'flex', flexDirection: 'column', transform: 'scale(1.05)', zIndex: 10 }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Top Pick</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '4px 12px', borderRadius: 20 }}>Medium Risk</div>
            <img src="/hdfc.jpg" alt="HDFC Logo" style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>HDFC Index Fund (Nifty 50)</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5, flex: 1 }}>Tracks the top 50 Indian companies. Historical 12-14% returns. Perfect for starting a disciplined SIP.</p>
          <button style={{ width: '100%', padding: '12px', background: '#4f46e5', border: 'none', borderRadius: 8, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>Start SIP</button>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '4px 12px', borderRadius: 20 }}>High Risk</div>
            <img src="/tatamf.jpg" alt="Tata Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Tata Digital India Fund</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5, flex: 1 }}>Capitalize on the IT sector's growth with historical 18-20% p.a. returns over 5 years. Ideal for long-term wealth creation.</p>
          <button style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, color: '#4f46e5', cursor: 'pointer', transition: '0.2s' }}>Explore Fund</button>
        </div>
      </div>
    </div>
  );
}