import React from 'react';
import { X, BrainCircuit, Database, Target, CheckCircle, Zap } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, onUpgrade }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)',
          padding: '40px 32px 32px',
          color: '#fff',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <X size={18} />
          </button>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)'
          }}>
            <Zap size={32} color="#fef08a" style={{ filter: 'drop-shadow(0 0 8px rgba(254, 240, 138, 0.6))' }} />
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Upgrade to <span style={{ color: '#fef08a' }}>PRO</span>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontWeight: 500 }}>
            Unlock the full potential of your AI Financial Advisor.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Benefit 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '12px', flexShrink: 0 }}>
                <BrainCircuit size={24} color="#4f46e5" />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Unlimited AI Chat</h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  Go beyond the 3-message limit. Ask endless questions about your finances and statements.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', flexShrink: 0 }}>
                <Database size={24} color="#8b5cf6" />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Longer Chat Memory</h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  AI remembers your past queries and provides deep contextual insights across your history.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px', flexShrink: 0 }}>
                <Target size={24} color="#d97706" />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Premium Accuracy</h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  Unlocks high-tier AWS Bedrock LLMs (Llama 3) for 99.9% categorization precision.
                </p>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={onUpgrade}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                border: 'none',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)',
                transition: 'transform 0.2s, boxShadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(79, 70, 229, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(79, 70, 229, 0.4)';
              }}
            >
              Upgrade Now for $4.99
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '16px', fontWeight: 500 }}>
              Secure payment. Cancel anytime.
            </p>
          </div>

        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
