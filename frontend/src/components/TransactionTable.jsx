import React from 'react';
import { MoreVertical } from 'lucide-react';

export default function TransactionTable({ 
  transactionHistory, 
  activeTab, 
  setActiveTab, 
  selectedCategory, 
  setSelectedCategory, 
  activeMonth, 
  formatCurrency 
}) {

  // The FIXED filtering logic
  const filteredTransactions = transactionHistory.filter(tx => {
    // 1. Filter by Tab
    if (activeTab === 'Credit' && tx.isCredit === false) return false;
    if (activeTab === 'Debit' && tx.isCredit === true) return false;
    
    // 2. Filter by Category
    if (selectedCategory !== 'All Categories' && tx.type !== selectedCategory) return false;

    return true;
  });

  // Extract unique categories dynamically from transaction history
  const uniqueCategories = ['All Categories', ...new Set(transactionHistory.map(tx => tx.type).filter(Boolean))];

  const handleExportCSV = () => {
    const headers = ['Ref ID', 'Transaction Date', 'Customer', 'Amount (INR)', 'Status', 'Type', 'Flow'];
    const rows = filteredTransactions.map(tx => [
      tx.ref, `"${tx.date}"`, `"${tx.customer}"`, tx.amount, tx.status, tx.type, tx.isCredit ? 'Credit' : 'Debit'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeMonth = activeMonth.replace(/\s+/g, '_').toLowerCase();
    link.setAttribute("download", `pr2_${safeMonth}_${activeTab.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {['All', 'Credit', 'Debit'].map(tab => (
            <span 
              key={tab} 
              onClick={() => {
                setActiveTab(tab);
              }}
              style={{ fontSize: 14, fontWeight: activeTab === tab ? 700 : 600, color: activeTab === tab ? '#4f46e5' : '#64748b', borderBottom: activeTab === tab ? '2px solid #4f46e5' : 'none', paddingBottom: '20px', marginBottom: '-20px', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              {tab}
            </span>
          ))}

          {/* DYNAMIC CATEGORY DROPDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', color: '#0f172a', backgroundColor: '#f8fafc', outline: 'none', cursor: 'pointer' }}
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleExportCSV} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Export CSV</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.5fr)', padding: '16px 24px', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
        <div>Ref ID</div><div>Date</div><div>Customer</div><div>Amount</div><div>Status</div><div>Type</div><div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredTransactions.length > 0 ? filteredTransactions.map((tx, i) => (
          <div key={tx.ref} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.5fr)', padding: '20px 24px', alignItems: 'center', borderBottom: i !== filteredTransactions.length - 1 ? '1px solid #e2e8f0' : 'none', fontSize: 13, fontWeight: 600, color: '#0f172a', backgroundColor: tx.isAnomaly ? '#fef2f2' : 'transparent' }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.ref}>{tx.ref}</div>
            <div style={{ color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.date}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', background: tx.isAnomaly ? '#ef4444' : (tx.isCredit ? '#4f46e5' : '#f59e0b'), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{tx.customer.charAt(0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0 }} title={tx.customer}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.customer}</span>
                {tx.isAnomaly && <span style={{ color: '#ef4444', padding: '2px 6px', background: '#fee2e2', borderRadius: 4, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>⚠️ ANOMALY</span>}
              </div>
            </div>
            <div style={{ color: tx.isCredit ? '#059669' : '#0f172a' }}>{tx.isCredit ? '+' : '-'}{formatCurrency(tx.amount)}</div>
            <div><span style={{ color: tx.status === 'Completed' ? '#059669' : '#d97706' }}>{tx.status}</span></div>
            <div style={{ color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.type}</div>
            <div style={{ textAlign: 'right', color: '#94a3b8', cursor: 'pointer' }}><MoreVertical size={16} style={{ display: 'inline' }} /></div>
          </div>
        )) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 14, fontWeight: 500 }}>
            No transactions found for "{activeTab}" {selectedCategory !== 'All Categories' ? `under category "${selectedCategory}"` : ''}.
          </div>
        )}
      </div>
    </div>
  );
}