import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, FileText, CheckCircle, ArrowDownRight, ArrowUpRight, 
  Loader2, Database, BrainCircuit, PieChart, BarChart2, RotateCcw, 
  Activity, Repeat, Calendar, AlertTriangle
} from 'lucide-react';

// Import your new components (make sure paths match your folder structure)
import TransactionTable from './TransactionTable';
import InvestmentRecommendations from './InvestmentRecommendations';
import TypewriterText from './TypewriterText';
import UpgradeModal from './UpgradeModal';

export default function Dashboard({ onLogout, tokenData, onUpdateTier }) {
  // --- UI & UPLOAD STATES ---
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pollMessage, setPollMessage] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // Results & Viewing States
  const [showResults, setShowResults] = useState(false); 
  const [chartView, setChartView] = useState('pie'); 
  const [activeMonth, setActiveMonth] = useState('Current'); 
  const [activeTab, setActiveTab] = useState('All'); 
  const [selectedCategory, setSelectedCategory] = useState('All Categories'); 
  const [activeView, setActiveView] = useState('Overview'); 
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [statementMonth, setStatementMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const fileInputRef = useRef(null);
  const currentMonthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  // Data Mapping Helpers
  const mapTransactions = (backendTxns = []) => {
    return backendTxns.map(tx => ({
      ref: tx.txnId ? tx.txnId.substring(0, 8) : Math.random().toString(36).substring(7),
      date: tx.date || 'Unknown Date',
      customer: tx.merchantName || tx.rawNarration || 'Unknown',
      amount: Math.abs(tx.amount || 0),
      status: 'Completed',
      type: tx.mlData?.predictedCategory || tx.type || 'Other',
      isAnomaly: tx.mlData?.isAnomaly === true,
      isCredit: (tx.type || '').toUpperCase().trim() === 'CREDIT' || ['Income', 'Savings', 'Refund', 'Credit'].includes((tx.type || '').trim())
    }));
  };

  const COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#f97316', '#8b5cf6'];
  const mapChartData = (breakdown = {}, totalExp = 1) => {
    return Object.entries(breakdown).map(([label, amount], i) => {
      const rawPct = (amount / totalExp) * 100;
      const numPct = Math.round(rawPct);
      return {
        label,
        numPct: numPct,
        pct: (rawPct > 0 && rawPct < 1) ? '<1' : numPct,
        color: COLORS[i % COLORS.length]
      };
    }).sort((a, b) => b.numPct - a.numPct);
  };

  const mapSubscriptions = (recurring = []) => {
    const grouped = {};
    recurring.forEach(tx => {
      const key = tx.rawNarration ? tx.rawNarration.trim().toUpperCase() : 'UNKNOWN';
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: tx.rawNarration || 'Unknown',
          category: tx.type,
          amount: tx.amount,
          count: 0
        };
      }
      grouped[key].count += 1;
      grouped[key].amount = tx.amount; // use latest amount
    });

    return Object.values(grouped).map((sub, i) => ({
      ...sub,
      nextDue: 'Next Month',
      status: 'Active',
      icon: '🔄'
    }));
  };

  const [transactionHistory, setTransactionHistory] = useState([]);
  const [pastStatements, setPastStatements] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  
  // Dynamic States from Backend
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalIncome: 0, totalExpense: 0, financialHealth: 'CALCULATING', categoryBreakdown: {}, predictedBurnRate: 0, predictedDiscretionaryIncome: 0
  });
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [aiSummaryText, setAiSummaryText] = useState('');
  
  // Chatbot States
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeAd, setActiveAd] = useState(null);

  const [allDocs, setAllDocs] = useState([]);

  const aggregateDocs = (docsToAggregate, monthLabel) => {
    let mergedTx = [];
    let mergedRecurring = [];
    let combinedIncome = 0;
    let combinedExpense = 0;
    let combinedCategory = {};
    let latestBurnRate = 0;
    let latestDiscretionary = 0;

    docsToAggregate.forEach(d => {
      if (d.transactions) {
        mergedTx.push(...d.transactions);
        const recurring = d.transactions.filter(t => t.mlData?.isRecurring === true);
        mergedRecurring.push(...recurring);
      }
      if (d.summaryMetrics) {
        combinedIncome += (d.summaryMetrics.totalIncome || 0);
        combinedExpense += (d.summaryMetrics.totalExpense || 0);
        if (d.summaryMetrics.predictedBurnRate) latestBurnRate = d.summaryMetrics.predictedBurnRate;
        if (d.summaryMetrics.predictedDiscretionaryIncome) latestDiscretionary = d.summaryMetrics.predictedDiscretionaryIncome;
        if (d.summaryMetrics.categoryBreakdown) {
          Object.entries(d.summaryMetrics.categoryBreakdown).forEach(([k, v]) => {
            combinedCategory[k] = (combinedCategory[k] || 0) + v;
          });
        }
      }
    });

    setTransactionHistory(mapTransactions(mergedTx));
    setSubscriptionsList(mapSubscriptions(mergedRecurring));
    
    // Set dynamic ad payload from the most recent document
    if (docsToAggregate.length > 0) {
      setActiveAd(docsToAggregate[docsToAggregate.length - 1].adPayload || null);
    } else {
      setActiveAd(null);
    }
    
    // Calculate Health
    let healthStatus = 'GOOD';
    if (combinedIncome === 0 && combinedExpense > 0) healthStatus = 'CRITICAL';
    else if (combinedExpense > combinedIncome) healthStatus = 'CRITICAL';
    else if (combinedExpense > (combinedIncome * 0.8)) healthStatus = 'WARNING';
    else healthStatus = 'HEALTHY';

    setSummaryMetrics({
      totalIncome: combinedIncome,
      totalExpense: combinedExpense,
      categoryBreakdown: combinedCategory,
      financialHealth: healthStatus,
      predictedBurnRate: latestBurnRate,
      predictedDiscretionaryIncome: latestDiscretionary
    });

    setActiveMonth(monthLabel);
    setShowResults(true);
    setIsAnalyzing(false);
  };

  let API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
  if (API_URL.endsWith('/')) {
    API_URL = API_URL.slice(0, -1);
  }

  // Hydrate on startup
  useEffect(() => {
    const fetchMyStatements = async () => {
      try {
        const res = await fetch(`${API_URL}/api/statements/my-statements`, {
          headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` }
        });
        if (res.ok) {
          const docs = await res.json();
          if (docs.length > 0) {
            setAllDocs(docs);
            aggregateDocs(docs, 'All-Time');

            const completedDocs = docs.filter(d => d.status === 'COMPLETED');
            if (completedDocs.length > 0) {
              fetch(`${API_URL}/api/statements/status/${completedDocs[completedDocs.length - 1].id}`, { headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` } })
                .then(r => r.json())
                .then(d => { if (d.aiSummary) setAiSummaryText(d.aiSummary); });
            }

            const getDocumentDateRange = (d, index) => {
              if (!d.transactions || d.transactions.length === 0) return d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${index + 1}`;
              const dates = d.transactions.map(tx => new Date(tx.date).getTime()).filter(t => !isNaN(t));
              if (dates.length === 0) return d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${index + 1}`;
              const minDate = new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const maxDate = new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return `${minDate} - ${maxDate}`;
            };

            // Populate past statements list
            setPastStatements(docs.map((d, i) => ({
               id: d.id, 
               month: d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${i + 1}`, 
               label: getDocumentDateRange(d, i),
               txCount: d.transactions?.length || 0, 
               status: d.status
            })));
          }
          setHasLoadedInitial(true);
        }
      } catch (e) {
        console.error(e);
        setHasLoadedInitial(true);
      }
    };
    if (tokenData?.token) fetchMyStatements();
  }, [tokenData]);

  const loadCompletedDocument = async (docId) => {
    try {
      const res = await fetch(`${API_URL}/api/statements/my-statements`, {
        headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` }
      });
      if (res.ok) {
        const docs = await res.json();
        setAllDocs(docs);
        aggregateDocs(docs, 'All-Time');

        const completedDocs = docs.filter(d => d.status === 'COMPLETED');
        if (completedDocs.length > 0) {
          fetch(`${API_URL}/api/statements/status/${completedDocs[completedDocs.length - 1].id}`, { headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` } })
            .then(r => r.json())
            .then(d => { if (d.aiSummary) setAiSummaryText(d.aiSummary); });
        }

        const getDocumentDateRange = (d, index) => {
          if (!d.transactions || d.transactions.length === 0) return d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${index + 1}`;
          const dates = d.transactions.map(tx => new Date(tx.date).getTime()).filter(t => !isNaN(t));
          if (dates.length === 0) return d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${index + 1}`;
          const minDate = new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const maxDate = new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${minDate} - ${maxDate}`;
        };

        setPastStatements(docs.map((d, i) => ({
           id: d.id, 
           month: d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement ${i + 1}`, 
           label: getDocumentDateRange(d, i),
           txCount: d.transactions?.length || 0, 
           status: d.status
        })));
      }
    } catch(e) { console.error(e); }
  };
  const startingBalance = 0; 
  const totalCredit = summaryMetrics.totalIncome || transactionHistory.filter(tx => tx.isCredit).reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = summaryMetrics.totalExpense || transactionHistory.filter(tx => !tx.isCredit).reduce((sum, tx) => sum + tx.amount, 0);
  const totalRecurring = subscriptionsList.reduce((sum, s) => sum + s.amount, 0);
  const currentBalance = startingBalance + totalCredit - totalExpense;
  const formatCurrency = (num) => '₹' + num.toLocaleString('en-IN');

  const chartData = mapChartData(summaryMetrics.categoryBreakdown, totalExpense);

  // --- REAL POLLING LOGIC ---
  useEffect(() => {
    let pollInterval;
    if (isAnalyzing && activeDocId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/statements/status/${activeDocId}`, {
             headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` }
          });
          const data = await res.json();
          if (data.status === 'EXTRACTING_PDF') {
             setPollMessage('Extracting PDF & Anonymizing PII...');
          } else if (data.status === 'PROCESSING') {
             setPollMessage('AI Categorization & Anomaly Detection running...');
          } else if (data.status === 'COMPLETED') {
             clearInterval(pollInterval);
             await loadCompletedDocument(activeDocId);
          } else if (data.status === 'FAILED') {
             clearInterval(pollInterval);
             setIsAnalyzing(false);
             alert('Processing failed!');
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000); 
    }
    return () => clearInterval(pollInterval);
  }, [isAnalyzing, activeDocId]); 

  // --- HANDLERS ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileInput = (e) => { if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]); };
  
  const handleFile = (file) => {
    if (file.type === 'text/csv' || file.type === 'application/pdf' || file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setShowResults(false);
    } else alert('Please upload a valid CSV or PDF file.');
  };

  const processFile = async () => {
    if (!selectedFile) return;
    setIsUploading(true); 
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (statementMonth) formData.append('statementMonth', statementMonth);

    try {
      const res = await fetch(`${API_URL}/api/statements/upload`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` },
        body: formData
      });
      const data = await res.json();
      
      setIsUploading(false);
      if (data.documentId) {
        setActiveDocId(data.documentId);
        setIsAnalyzing(true);
      }
    } catch (e) {
      console.error(e);
      setIsUploading(false);
      alert('Upload failed');
    }
  };

  const loadPastStatement = (monthLabel) => {
    if (monthLabel === 'All-Time') {
      aggregateDocs(allDocs, 'All-Time');
      setActiveDocId(null);
    } else {
      const filtered = allDocs.filter(d => (d.statementMonth && d.statementMonth !== 'Unknown' ? d.statementMonth : `Statement`) === monthLabel);
      aggregateDocs(filtered, monthLabel);
      
      const doc = filtered[filtered.length - 1];
      if (doc && doc.status === 'COMPLETED') {
        setActiveDocId(doc.id);
        fetch(`${API_URL}/api/statements/status/${doc.id}`, { headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` } })
          .then(r => r.json())
          .then(d => { if (d.aiSummary) setAiSummaryText(d.aiSummary); });
      }
    }
  };

  const getDateRangeHeader = () => {
    if (activeMonth === 'All-Time') return 'Lifetime Overview';
    if (transactionHistory.length === 0) return activeMonth;
    const dates = transactionHistory.map(tx => new Date(tx.date).getTime()).filter(t => !isNaN(t));
    if (dates.length === 0) return activeMonth;
    const minDate = new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const maxDate = new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${minDate} - ${maxDate}`;
  };

  const uniqueDocs = [];
  const monthMap = new Set();
  [...allDocs].filter(d => d.status === 'COMPLETED')
    .sort((a, b) => (a.statementMonth || '').localeCompare(b.statementMonth || ''))
    .reverse()
    .forEach(d => {
      const m = d.statementMonth || 'Unknown';
      if (!monthMap.has(m)) {
        monthMap.add(m);
        uniqueDocs.push(d);
      }
    });

  const trendData = uniqueDocs.slice(0, 6).reverse().map(d => {
    let score = 0;
    if (d.summaryMetrics?.financialHealth === 'HEALTHY') score = 82;
    else if (d.summaryMetrics?.financialHealth === 'WARNING') score = 55;
    else if (d.summaryMetrics?.financialHealth === 'CRITICAL') score = 30;
    return { month: d.statementMonth || 'Unknown', score };
  });

  const resetUploader = () => {
    setShowResults(false); setSelectedFile(null); setTransactionHistory([]);
    setActiveMonth('Current'); setActiveTab('All'); setChatHistory([]);
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !activeDocId) return;
    
    // Check limit BEFORE optimistically updating the UI
    if (chatHistory.length >= 6 && tokenData?.subscriptionTier !== 'PRO') {
      setIsUpgradeModalOpen(true);
      return;
    }

    const newHistory = [...chatHistory, { role: 'user', content: chatMessage }];
    setChatHistory(newHistory);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/statements/${activeDocId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData?.token}`
        },
        body: JSON.stringify({ message: chatMessage, history: newHistory })
      });
      if (res.status === 402) {
        setIsUpgradeModalOpen(true);
        setChatHistory(chatHistory); // Revert history
        setIsChatLoading(false);
        return;
      }
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply || 'Sorry, I could not process that.' }]);
    } catch (e) {
      console.error(e);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Network error. Could not reach AI Advisor.' }]);
    }
    setIsChatLoading(false);
  };

  const handleUpgrade = async () => {
    try {
      if (activeDocId) {
        await fetch(`${API_URL}/api/statements/${activeDocId}/upgrade`, {
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${tokenData?.token}` }
        });
      }
      if (onUpdateTier) onUpdateTier('PRO');
      setIsUpgradeModalOpen(false);
      alert('Upgraded to PRO successfully! You now have unlimited chats and premium accuracy.');
    } catch (e) {
      console.error('Upgrade failed', e);
      alert('Upgrade failed. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', scrollBehavior: 'smooth' }}>
      
      {/* ── NAVBAR ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveView('Overview')}>
            <img src="/rupee-radar-logo.jpeg" alt="Rupee Radar Logo" style={{ height: '32px', width: 'auto', borderRadius: '50%' }} />
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a' }}>
              Rupee Radar
            </div>
          </div>
          {tokenData?.subscriptionTier === 'PRO' && (
            <span style={{
              marginLeft: '12px',
              background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
              color: '#854d0e',
              fontSize: '11px',
              fontWeight: 900,
              padding: '4px 8px',
              borderRadius: '8px',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)'
            }}>
              PRO
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          
          <span onClick={() => setActiveView('Overview')} style={{ fontSize: 14, fontWeight: activeView === 'Overview' ? 800 : 600, color: activeView === 'Overview' ? '#4f46e5' : '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}>Overview</span>
          <span onClick={() => setActiveView('Subscriptions')} style={{ fontSize: 14, fontWeight: activeView === 'Subscriptions' ? 800 : 600, color: activeView === 'Subscriptions' ? '#4f46e5' : '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}>Subscriptions</span>
          <span onClick={() => setActiveView('FinHealth')} style={{ fontSize: 14, fontWeight: activeView === 'FinHealth' ? 800 : 600, color: activeView === 'FinHealth' ? '#4f46e5' : '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}>FinHealth</span>

          <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: '0.2s', marginLeft: '16px' }}>
            Optimize Savings
          </button>
          <button onClick={onLogout} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '40px', display: 'grid', gridTemplateColumns: '400px 1fr', gap: 32 }}>
        
        {/* LEFT COLUMN: UPLOADER & PAST STATEMENTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {!showResults && (
              <>
                <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Process New Data</h1>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>Upload bank statements to generate AI insights.</p>
              </>
            )}

            {/* DYNAMIC UPLOAD BOX */}
            <div 
              onDragOver={!showResults && !isAnalyzing ? handleDragOver : undefined}
              onDragLeave={!showResults && !isAnalyzing ? handleDragLeave : undefined}
              onDrop={!showResults && !isAnalyzing ? handleDrop : undefined}
              onClick={() => !selectedFile && !isUploading && !isAnalyzing && !showResults && fileInputRef.current.click()}
              style={{
                border: showResults || isAnalyzing ? 'none' : `2px dashed ${isDragging ? '#4f46e5' : '#cbd5e1'}`,
                background: isDragging ? '#eef2ff' : (showResults || isAnalyzing ? '#fff' : '#f8fafc'),
                borderRadius: 12, padding: showResults || isAnalyzing ? '0' : '20px 16px', textAlign: 'center',
                cursor: (selectedFile || isUploading || isAnalyzing || showResults) ? 'default' : 'pointer',
                transition: 'all 0.2s ease', minHeight: showResults ? '240px' : '120px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".csv, .pdf, .jpg, .jpeg, .png" style={{ display: 'none' }} />
              
              {showResults ? (
                <div style={{ width: '100%', textAlign: 'left', animation: 'fadeIn 0.5s ease-in' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {chartView === 'pie' ? <PieChart size={18} color="#4f46e5"/> : <BarChart2 size={18} color="#4f46e5"/>} Expense Breakdown
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <select value={chartView} onChange={(e) => setChartView(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
                        <option value="pie">Pie Chart</option>
                        <option value="bar">Bar Chart</option>
                      </select>
                      <button onClick={() => fileInputRef.current.click()} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '6px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Upload New Statement">
                        <UploadCloud size={16} color="#4f46e5" />
                      </button>
                      <button onClick={resetUploader} style={{ background: '#f1f5f9', border: 'none', color: '#4f46e5', padding: '6px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><RotateCcw size={14}/></button>
                    </div>
                  </div>

                  {chartView === 'pie' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 0' }}>
                      <div style={{ width: '140px', height: '140px', borderRadius: '50%', flexShrink: 0, background: chartData.length > 0 ? `conic-gradient(${chartData.map((cat, i, arr) => `${cat.color} ${arr.slice(0, i).reduce((a, b) => a + b.numPct, 0)}% ${arr.slice(0, i + 1).reduce((a, b) => a + b.numPct, 0)}%`).join(', ')})` : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '85px', height: '85px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total</span>
                          <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 800 }}>{formatCurrency(totalExpense)}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {chartData.map(cat => (
                          <div key={cat.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#0f172a' }}><span>{cat.label}</span><span style={{ color: '#64748b' }}>{cat.pct}%</span></div>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}><div style={{ width: `${Math.max(1, cat.numPct)}%`, height: '100%', background: cat.color, borderRadius: '99px' }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: '20px' }}>
                      {chartData.map(cat => (
                        <div key={cat.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 8, height: '100%' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{cat.pct}%</span>
                          <div style={{ width: '100%', maxWidth: '40px', height: `${Math.max(1, cat.numPct)}%`, background: cat.color, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>{cat.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : isAnalyzing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', padding: '24px 0' }}>
                  <div style={{ position: 'relative', width: 56, height: 56 }}><Loader2 size={56} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrainCircuit size={24} color="#4f46e5" /></div></div>
                  <div><div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>AI Analysis in Progress</div><div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{pollMessage}</div></div>
                  <div style={{ width: '80%', height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}><div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #4f46e5, #818cf8)', borderRadius: 99, animation: 'shimmer 1s infinite linear', backgroundSize: '200% 100%' }} /></div>
                </div>
              ) : isUploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Loader2 size={24} color="#4f46e5" style={{ animation: 'spin 0.6s linear infinite' }} />
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Uploading statement...</div><div style={{ fontSize: 11, color: '#64748b' }}>Securing data stream</div></div>
                </div>
              ) : !selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UploadCloud size={20} color="#4f46e5" /></div>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Click to upload or drag & drop</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>CSV or PDF (Max. 10MB)</div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><CheckCircle size={20} color="#059669" /><div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{selectedFile.name}</div><div style={{ fontSize: 11, color: '#64748b' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div></div></div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Calendar size={16} color="#64748b" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Statement Month:</span>
                    <input type="month" value={statementMonth} onChange={(e) => setStatementMonth(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}><button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (transactionHistory.length > 0) setShowResults(true); }} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button><button onClick={(e) => { e.stopPropagation(); processFile(); }} style={{ flex: 2, background: '#4f46e5', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Database size={14}/> Analyze</button></div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} color="#4f46e5" /> Processed Statements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              <div 
                onClick={() => { loadPastStatement('All-Time'); setActiveView('Overview'); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: activeMonth === 'All-Time' ? '#eef2ff' : '#f8fafc', borderRadius: 8, border: activeMonth === 'All-Time' ? '1px solid #4f46e5' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <div><div style={{ fontSize: 13, fontWeight: 700, color: activeMonth === 'All-Time' ? '#4f46e5' : '#0f172a' }}>All-Time</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Combined Ledger</div></div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: 6 }}>AGGREGATED</span>
              </div>

              {pastStatements.map((stmt, i) => (
                <div 
                  key={i} onClick={() => { loadPastStatement(stmt.month); setActiveView('Overview'); }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: activeMonth === stmt.month ? '#eef2ff' : '#f8fafc', borderRadius: 8, border: activeMonth === stmt.month ? '1px solid #4f46e5' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: activeMonth === stmt.month ? '#4f46e5' : '#0f172a' }}>{stmt.label}</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stmt.txCount} txns</div></div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: 6 }}>{stmt.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC VIEWS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative' }}>
          
          {(isUploading || isAnalyzing) && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
              <div style={{ background: '#fff', padding: '32px 48px', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 56, height: 56 }}><Loader2 size={56} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrainCircuit size={24} color="#4f46e5" /></div></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{isUploading ? 'Uploading Document...' : 'AI Analysis in Progress'}</div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{isUploading ? 'Securing data stream' : pollMessage}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {activeView}: {getDateRangeHeader()}
            </h2>
          </div>

          {transactionHistory.length === 0 ? (
            hasLoadedInitial ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#64748b', background: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                <Database size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600 }}>No Data Available</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Upload your bank statement to generate AI insights.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#64748b', background: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                <Database size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Initial Data</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Please wait while your transactions are loaded...</div>
              </div>
            )
          ) : (
            <>
              {/* VIEW 1: OVERVIEW (Using the new external Component!) */}
              {activeView === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease-in' }}>
              {/* FLAG BANNER */}
              {transactionHistory.some(tx => tx.isAnomaly) && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef4444', fontSize: 20 }}>⚠️</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#991b1b' }}>Transactions Flagged for Review</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>
                      Our AI Autoencoder has flagged {transactionHistory.filter(tx => tx.isAnomaly).length} transaction(s) as highly unusual based on your spending patterns. Please review them below.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Balances</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{formatCurrency(currentBalance)}</div></div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUpRight size={14} color="#059669"/> Credit</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totalCredit)}</div></div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><ArrowDownRight size={14} color="#ef4444"/> Expenses</div><div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totalExpense)}</div></div>
              </div>
              
              {/* WE NOW CALL THE NEW TRANSACTION TABLE COMPONENT HERE */}
              <TransactionTable 
                transactionHistory={transactionHistory}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                activeMonth={activeMonth}
                formatCurrency={formatCurrency}
              />
            </div>
          )}

          {/* VIEW 2: SUBSCRIPTIONS & EMIs */}
          {activeView === 'Subscriptions' && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '32px', animation: 'fadeIn 0.4s ease-in' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '12px' }}><Repeat size={24} color="#4f46e5" /></div>
                <div><h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Active Recurring Payments</h3><p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Auto-detected from your transaction history</p></div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Monthly</div><div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{formatCurrency(totalRecurring)}</div></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {subscriptionsList.length > 0 ? subscriptionsList.map((sub) => (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 24, background: '#fff', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flexShrink: 0 }}>{sub.icon}</div>
                    <div style={{ marginLeft: 16, flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{sub.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{sub.category}</span><span style={{ background: '#eef2ff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: '#4f46e5', whiteSpace: 'nowrap' }}>{sub.count} payment{sub.count !== 1 ? 's' : ''} on record</span></div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 32, flexShrink: 0 }}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><Calendar size={12} /> Next Due: {sub.nextDue}</div></div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{formatCurrency(sub.amount)}/mo</div>
                  </div>
                )) : <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No recurring payments detected yet.</div>}
              </div>
            </div>
          )}

          {/* VIEW 3: FINHEALTH */}
          {activeView === 'FinHealth' && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '32px', animation: 'fadeIn 0.4s ease-in' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ background: summaryMetrics.financialHealth === 'HEALTHY' ? '#d1fae5' : (summaryMetrics.financialHealth === 'WARNING' ? '#fef3c7' : '#fee2e2'), padding: '12px', borderRadius: '12px' }}><Activity size={24} color={summaryMetrics.financialHealth === 'HEALTHY' ? '#059669' : (summaryMetrics.financialHealth === 'WARNING' ? '#d97706' : '#dc2626')} /></div>
                <div><h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>AI Financial Health Score</h3><p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Calculated based on liquidity, debt-ratio, and savings rate</p></div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 42, fontWeight: 900, color: summaryMetrics.financialHealth === 'HEALTHY' ? '#059669' : (summaryMetrics.financialHealth === 'WARNING' ? '#d97706' : '#dc2626'), lineHeight: 1 }}>{summaryMetrics.financialHealth === 'HEALTHY' ? '82' : (summaryMetrics.financialHealth === 'WARNING' ? '55' : (summaryMetrics.financialHealth === 'CRITICAL' ? '30' : '--'))}</span><span style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>/ 100</span></div>
              </div>

              {/* COMBINED FORECAST, ADVISOR & CHATBOT UI */}
              {(aiSummaryText || activeDocId) && (
                <div className="animate-gradient" style={{ background: 'linear-gradient(135deg, #f3f0ff, #e0e7ff, #f3f0ff)', padding: '20px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #c7d2fe', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
                  
                  {/* AI ADVISOR */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><BrainCircuit size={16} /> Gemini AI Advisor</div>
                  
                  {/* Initial Summary Text */}
                  {aiSummaryText && (
                    <p style={{ fontSize: 14, color: '#1e1b4b', lineHeight: 1.6, margin: 0, marginBottom: chatHistory.length > 0 ? 16 : 0, paddingBottom: chatHistory.length > 0 ? 16 : 0, borderBottom: chatHistory.length > 0 ? '1px solid rgba(79, 70, 229, 0.2)' : 'none' }}>
                      Based on your fixed habits and subscriptions, your baseline expenses for next month are {formatCurrency(summaryMetrics.predictedBurnRate || 0)}. You will have exactly {formatCurrency(summaryMetrics.predictedDiscretionaryIncome || 0)} left for discretionary spending.<br /><br />
                      {aiSummaryText}
                    </p>
                  )}

                  {/* Chat History (Expands if there is history) */}
                  {activeDocId && chatHistory.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#4f46e5' : '#fff', color: msg.role === 'user' ? '#fff' : '#1e1b4b', padding: '12px 16px', borderRadius: '12px', maxWidth: '85%', fontSize: 13, lineHeight: 1.5, borderBottomRightRadius: msg.role === 'user' ? 2 : 12, borderBottomLeftRadius: msg.role !== 'user' ? 2 : 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          {msg.role === 'assistant' ? (
                            <TypewriterText text={msg.content} isTyping={idx === chatHistory.length - 1} />
                          ) : (
                            msg.content
                          )}
                        </div>
                      ))}
                      {isChatLoading && (
                        <div style={{ alignSelf: 'flex-start', background: '#fff', color: '#64748b', padding: '12px 16px', borderRadius: '12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Thinking...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Input box ALWAYS visible if activeDocId exists */}
                  {activeDocId && (
                    <div style={{ display: 'flex', gap: 8, marginTop: aiSummaryText && chatHistory.length === 0 ? 16 : 0 }}>
                      <input 
                        type="text" 
                        value={chatMessage} 
                        onChange={e => setChatMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        placeholder="Ask Gemini to analyze your spending..." 
                        style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(79, 70, 229, 0.3)', outline: 'none', fontSize: 13, background: 'rgba(255, 255, 255, 0.7)' }}
                      />
                      <button onClick={handleSendChat} disabled={isChatLoading} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 700, cursor: isChatLoading ? 'default' : 'pointer', opacity: isChatLoading ? 0.7 : 1, transition: 'all 0.2s' }}>
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '24px', border: '1px solid #f1f5f9', marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 16 }}>Health Trend (Last 6 Months)</div>
                <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                  {trendData.length > 0 ? (
                    <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <line x1="0" y1="50" x2="600" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="100" x2="600" y2="100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="150" x2="600" y2="150" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                      <path 
                        d={`M ${trendData.map((d, i) => `${(i * (600 / Math.max(1, trendData.length - 1))) + 20},${200 - (d.score * 1.5)}`).join(' L ')}`} 
                        fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
                      />
                      {trendData.map((d, i) => {
                        const x = (i * (600 / Math.max(1, trendData.length - 1))) + 20;
                        const y = 200 - (d.score * 1.5);
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r={i === trendData.length - 1 ? "8" : "6"} fill={i === trendData.length - 1 ? "#4f46e5" : "#fff"} stroke="#4f46e5" strokeWidth="3" />
                            <text x={x} y="190" fill={i === trendData.length - 1 ? "#4f46e5" : "#64748b"} fontSize="12" fontWeight={i === trendData.length - 1 ? "800" : "600"} textAnchor="middle">{d.month}</text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Not enough data for trend</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              </div>
            </div>
          )}

            </>
          )}
        </div>

        {/* WE NOW CALL THE NEW RECOMMENDATIONS COMPONENT HERE */}
        <InvestmentRecommendations adPayload={activeAd} onUpgrade={() => setIsUpgradeModalOpen(true)} />

      </main>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        onUpgrade={handleUpgrade} 
      />

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}