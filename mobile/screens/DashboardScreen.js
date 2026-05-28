import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Database,
  BrainCircuit,
  PieChart,
  BarChart2,
  RotateCcw,
  Activity,
  Repeat,
  Calendar,
  AlertCircle,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react-native';
import SubscriptionsTab from './components/SubscriptionsTab';
import FinHealthTab from './components/FinHealthTab';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'http://192.168.1.10:8081';

const MOCK_FILES = [];

export default function DashboardScreen({ tokenData }) {
  const [activeView, setActiveView] = useState('Overview'); // Overview, Subscriptions, FinHealth
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pollMessage, setPollMessage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [chartView, setChartView] = useState('pie'); // pie, bar
  const [activeMonth, setActiveMonth] = useState('Current');
  const [activeTab, setActiveTab] = useState('All'); // All, Credit, Debit, Savings
  const [debitCategory, setDebitCategory] = useState('All');

  // Mappers
  const mapTransactions = (backendTxns = []) => {
    return backendTxns.map(tx => ({
      ref: tx.txnId ? tx.txnId.substring(0, 8) : Math.random().toString(36).substring(7),
      date: tx.date || 'Unknown Date',
      customer: tx.rawNarration || 'Unknown',
      amount: Math.abs(tx.amount || 0),
      status: 'Completed',
      type: tx.type || 'Other',
      isAnomaly: tx.mlData?.isAnomaly === true,
      isCredit: (tx.type || '').toUpperCase().trim() === 'CREDIT' || ['Income', 'Savings', 'Refund', 'Credit'].includes((tx.type || '').trim())
    }));
  };

  const COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#f97316', '#8b5cf6'];
  const mapChartData = (breakdown = {}, totalExp = 1) => {
    let index = 0;
    return Object.entries(breakdown).map(([label, amount]) => {
      const rawPct = (amount / totalExp) * 100;
      const numPct = Math.round(rawPct);
      return {
        label,
        numPct: numPct,
        pct: (rawPct > 0 && rawPct < 1) ? '<1' : numPct,
        color: COLORS[index++ % COLORS.length]
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
      grouped[key].amount = tx.amount;
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

  const [summaryMetrics, setSummaryMetrics] = useState({
    totalIncome: 0, totalExpense: 0, financialHealth: 'CALCULATING', categoryBreakdown: {}
  });
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [aiSummaryText, setAiSummaryText] = useState('');

  // --- AI Chat States ---
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !activeDocId) return;

    const newChat = [...chatHistory, { role: 'user', content: chatMessage }];
    setChatHistory(newChat);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/statements/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData?.token}`
        },
        body: JSON.stringify({
          docId: activeDocId,
          question: chatMessage,
          history: chatHistory.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            content: msg.content
          }))
        })
      });

      if (response.ok) {
        const text = await response.text();
        setChatHistory([...newChat, { role: 'assistant', content: text }]);
      } else {
        setChatHistory([...newChat, { role: 'assistant', content: 'Sorry, I encountered an error answering that.' }]);
      }
    } catch (e) {
      setChatHistory([...newChat, { role: 'assistant', content: 'Connection failed.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const [allDocs, setAllDocs] = useState([]);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const aggregateDocs = (docsToAggregate, monthLabel) => {
    let mergedTx = [];
    let mergedRecurring = [];
    let combinedIncome = 0;
    let combinedExpense = 0;
    let combinedCategory = {};

    docsToAggregate.forEach(d => {
      if (d.transactions) {
        mergedTx.push(...d.transactions);
        const recurring = d.transactions.filter(t => t.mlData?.isRecurring === true);
        mergedRecurring.push(...recurring);
      }
      if (d.summaryMetrics) {
        combinedIncome += (d.summaryMetrics.totalIncome || 0);
        combinedExpense += (d.summaryMetrics.totalExpense || 0);
        if (d.summaryMetrics.categoryBreakdown) {
          Object.entries(d.summaryMetrics.categoryBreakdown).forEach(([k, v]) => {
            combinedCategory[k] = (combinedCategory[k] || 0) + v;
          });
        }
      }
    });

    setTransactionHistory(mapTransactions(mergedTx));
    setSubscriptionsList(mapSubscriptions(mergedRecurring));

    let healthStatus = 'GOOD';
    if (combinedIncome === 0 && combinedExpense > 0) healthStatus = 'CRITICAL';
    else if (combinedExpense > combinedIncome) healthStatus = 'CRITICAL';
    else if (combinedExpense > (combinedIncome * 0.8)) healthStatus = 'WARNING';
    else healthStatus = 'HEALTHY';

    setSummaryMetrics({
      totalIncome: combinedIncome,
      totalExpense: combinedExpense,
      categoryBreakdown: combinedCategory,
      financialHealth: healthStatus
    });

    setActiveMonth(monthLabel);
    setShowResults(true);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const fetchMyStatements = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/statements/my-statements`, {
          headers: { 'Authorization': `Bearer ${tokenData?.token}` }
        });
        if (res.ok) {
          const docs = await res.json();
          if (docs.length > 0) {
            setAllDocs(docs);
            aggregateDocs(docs, 'All-Time');

            const completedDocs = docs.filter(d => d.status === 'COMPLETED');
            if (completedDocs.length > 0) {
              fetch(`${API_BASE_URL}/api/statements/status/${completedDocs[completedDocs.length - 1].id}`, { headers: { 'Authorization': `Bearer ${tokenData?.token}` } })
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
      const res = await fetch(`${API_BASE_URL}/api/statements/my-statements`, {
        headers: { 'Authorization': `Bearer ${tokenData?.token}` }
      });
      if (res.ok) {
        const docs = await res.json();
        setAllDocs(docs);
        const filtered = docs.filter(d => d.id === docId);
        aggregateDocs(filtered, filtered[0]?.statementMonth || 'Current');

        const statRes = await fetch(`${API_BASE_URL}/api/statements/status/${docId}`, {
          headers: { 'Authorization': `Bearer ${tokenData?.token}` }
        });
        const statData = await statRes.json();
        if (statData.aiSummary) setAiSummaryText(statData.aiSummary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Real Polling Logic
  useEffect(() => {
    let pollInterval;
    if (isAnalyzing && activeDocId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/statements/status/${activeDocId}`, {
            headers: { 'Authorization': `Bearer ${tokenData?.token}` }
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
            Alert.alert('Error', 'Processing failed!');
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [isAnalyzing, activeDocId]);

  // Dynamic calculations
  const startingBalance = 0;
  const totalCredit = summaryMetrics.totalIncome || transactionHistory
    .filter((tx) => tx.isCredit)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = summaryMetrics.totalExpense || transactionHistory
    .filter((tx) => !tx.isCredit)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const currentBalance = startingBalance + totalCredit - totalExpense;

  const formatCurrency = (num) => '₹' + num.toLocaleString('en-IN');

  const chartData = mapChartData(summaryMetrics.categoryBreakdown, totalExpense);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: file.mimeType || 'application/octet-stream'
        });
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      // Use the standard RN FormData syntax. Axios (via XMLHttpRequest) handles this perfectly.
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type
      });

      const response = await axios.post(`${API_BASE_URL}/api/statements/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${tokenData?.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      setIsUploading(false);

      if (data.documentId) {
        setActiveDocId(data.documentId);
        setIsAnalyzing(true);
      } else {
        Alert.alert("Error", data.error || "Upload failed");
        setSelectedFile(null);
      }
    } catch (e) {
      console.error("Upload error details:", e?.response?.data || e.message);
      setIsUploading(false);

      if (e.response) {
        Alert.alert("Upload Error", `Status: ${e.response.status}\n\nResponse: ${JSON.stringify(e.response.data).substring(0, 100)}`);
      } else {
        Alert.alert("Error", "Network error during upload");
      }
      setSelectedFile(null);
    }
  };

  const loadPastStatement = (id, monthLabel) => {
    if (id === 'All-Time') {
      aggregateDocs(allDocs, 'All-Time');
    } else {
      const filtered = allDocs.filter(d => d.id === id);
      aggregateDocs(filtered, monthLabel);

      const doc = filtered[0];
      if (doc && doc.status === 'COMPLETED') {
        fetch(`${API_BASE_URL}/api/statements/status/${doc.id}`, { headers: { 'Authorization': `Bearer ${tokenData?.token}` } })
          .then(r => r.json())
          .then(d => { if (d.aiSummary) setAiSummaryText(d.aiSummary); });
      }
    }
  };

  const resetUploader = () => {
    setShowResults(false);
    setSelectedFile(null);
    setTransactionHistory([]);
    setActiveMonth('Current');
    setActiveTab('All');
  };

  // Filter transactions
  const filteredTransactions = transactionHistory.filter((tx) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Credit') return tx.isCredit === true;
    if (activeTab === 'Debit') {
      if (tx.isCredit) return false;
      if (debitCategory !== 'All' && tx.type !== debitCategory) return false;
      return true;
    }
    return true;
  });

  // Extract unique categories for debits
  const uniqueDebitCategories = [
    'All',
    ...new Set(transactionHistory.filter((tx) => !tx.isCredit).map((tx) => tx.type)),
  ];

  const simulateExport = () => {
    Alert.alert(
      'Export Successful',
      `Simulated CSV export for ${activeMonth} (${activeTab} view) generated and saved.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>

      {/* ── TOP SEGMENT TABS ── */}
      <View style={styles.segmentBar}>
        {['Overview', 'Subscriptions', 'FinHealth'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentButton, activeView === tab && styles.segmentButtonActive]}
            onPress={() => setActiveView(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeView === tab && styles.segmentTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Render sub views */}
      {activeView === 'Overview' && (
        <View style={styles.overviewContainer}>
          {/* TOP ACTIONS ROW */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Financial Overview</Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => setSelectedFile(null)}
            >
              <UploadCloud size={14} color='#fff' />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Import Data</Text>
            </TouchableOpacity>
          </View>

          {/* UPLOADING & ANALYZING STATES */}
          {isUploading && (
            <View style={styles.simulationCard}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.simulationTitle}>Uploading statement...</Text>
              <Text style={styles.simulationSub}>Securing data stream</Text>
            </View>
          )}

          {isAnalyzing && (
            <View style={styles.simulationCard}>
              <View style={styles.brainIconRow}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <View style={styles.brainWrapper}>
                  <BrainCircuit size={18} color="#4f46e5" />
                </View>
              </View>
              <Text style={styles.simulationTitle}>AI Analysis in Progress</Text>
              <Text style={styles.simulationSub}>{pollMessage}</Text>
            </View>
          )}

          {(!showResults && !isAnalyzing && !isUploading) && (
            <View style={styles.uploaderCard}>
              <Text style={styles.cardHeaderTitle}>Process New Data</Text>
              <Text style={styles.cardHeaderSubtitle}>Select a bank statement to process.</Text>

              {!selectedFile ? (
                <TouchableOpacity style={styles.fileSelectorItem} onPress={handleSelectFile} activeOpacity={0.7}>
                  <UploadCloud size={20} color="#4f46e5" />
                  <View style={styles.fileItemText}>
                    <Text style={styles.fileItemName}>Upload Statement</Text>
                    <Text style={styles.fileItemSize}>Tap to select PDF or CSV</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.selectedFileView}>
                  <View style={styles.fileRow}>
                    <CheckCircle size={20} color="#059669" />
                    <View style={styles.fileTextWrapper}>
                      <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                      <Text style={styles.selectedFileSize}>{selectedFile.size}</Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFile(null)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.analyzeBtn} onPress={handleProcessFile}>
                      <Database size={14} color="#fff" />
                      <Text style={styles.analyzeBtnText}>Analyze</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* BALANCES SUMMARY CARD */}
          <View style={styles.balancesContainer}>
            <View style={styles.balanceItemCard}>
              <Text style={styles.balanceCardLabel}>Balances</Text>
              <Text style={styles.balanceCardVal}>{formatCurrency(currentBalance)}</Text>
            </View>
            <View style={styles.balanceRowTwo}>
              <View style={[styles.balanceItemCard, styles.flexCard]}>
                <View style={styles.balanceHeaderIconRow}>
                  <ArrowUpRight size={14} color="#059669" />
                  <Text style={styles.balanceCardLabel}>Credit</Text>
                </View>
                <Text style={[styles.balanceCardVal, styles.smallerVal]}>{formatCurrency(totalCredit)}</Text>
              </View>
              <View style={[styles.balanceItemCard, styles.flexCard]}>
                <View style={styles.balanceHeaderIconRow}>
                  <ArrowDownRight size={14} color="#ef4444" />
                  <Text style={styles.balanceCardLabel}>Expenses</Text>
                </View>
                <Text style={[styles.balanceCardVal, styles.smallerVal]}>{formatCurrency(totalExpense)}</Text>
              </View>
            </View>
          </View>

          {/* BREAKDOWN CHART PREVIEW */}
          {showResults && (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <View style={styles.titleRow}>
                  {chartView === 'pie' ? (
                    <PieChart size={18} color="#4f46e5" />
                  ) : (
                    <BarChart2 size={18} color="#4f46e5" />
                  )}
                  <Text style={styles.chartTitleText}>Expense Breakdown</Text>
                </View>

                <View style={styles.chartControls}>
                  <TouchableOpacity style={styles.toggleBtn} onPress={() => setChartView(chartView === 'pie' ? 'bar' : 'pie')}>
                    <Text style={styles.toggleBtnText}>{chartView === 'pie' ? 'Bar View' : 'Pie View'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {chartView === 'pie' ? (
                <View style={styles.donutRow}>
                  <View style={styles.donutOuter}>
                    <View style={styles.donutInner}>
                      <Text style={styles.donutLabel}>Total</Text>
                      <Text style={styles.donutVal}>₹{(totalExpense / 100000).toFixed(1)}L</Text>
                    </View>
                  </View>
                  <View style={styles.donutLegend}>
                    {chartData.map((cat, i) => (
                      <View key={i} style={styles.legendItem}>
                        <View style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                          <Text style={styles.legendText}>{cat.label}</Text>
                        </View>
                        <View style={styles.barWrap}>
                          <View style={[styles.barFill, { backgroundColor: cat.color, width: `${Math.max(5, cat.numPct)}%` }]} />
                          <Text style={styles.barPct}>{cat.pct}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.barGraphRow}>
                  {chartData.map((cat, i) => (
                    <View key={i} style={styles.graphCol}>
                      <Text style={styles.graphPctLabel}>{cat.pct}%</Text>
                      <View style={styles.graphBarContainer}>
                        <View style={[styles.graphBarFill, { height: `${Math.max(5, cat.numPct)}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={styles.graphNameLabel} numberOfLines={1}>{cat.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* PROCESSED STATEMENTS LIST - Horizontal Scroll */}
          {pastStatements.length > 0 && (
          <View style={styles.statementsHistoryCard}>
            <Text style={styles.statementsHeaderTitle}>Processed Statements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <TouchableOpacity
                style={[styles.statementItemBtn, activeMonth === 'All-Time' && styles.statementItemBtnActive]}
                onPress={() => loadPastStatement('All-Time')}
                activeOpacity={0.7}
              >
                <View style={styles.statementTextCol}>
                  <Text style={[styles.statementMonthText, activeMonth === 'All-Time' && styles.statementMonthTextActive]}>All-Time</Text>
                  <Text style={styles.statementTxnText}>Combined Ledger</Text>
                </View>
              </TouchableOpacity>

              {pastStatements.map((stmt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.statementItemBtn,
                    activeMonth === stmt.month && styles.statementItemBtnActive,
                  ]}
                  onPress={() => loadPastStatement(stmt.id, stmt.month)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statementTextCol}>
                    <Text style={[styles.statementMonthText, activeMonth === stmt.month && styles.statementMonthTextActive]}>
                      {stmt.month}
                    </Text>
                    <Text style={styles.statementTxnText}>{stmt.txCount} txns</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          )}

           {/* FLAG BANNER */}
          {transactionHistory.some(tx => tx.isAnomaly) && (
            <View style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#ef4444', fontSize: 20 }}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#991b1b' }}>Transactions Flagged for Review</Text>
                <Text style={{ marginTop: 4, fontSize: 13, color: '#b91c1c', lineHeight: 20 }}>
                  Our AI Autoencoder has flagged {transactionHistory.filter(tx => tx.isAnomaly).length} transaction(s) as highly unusual based on your spending patterns. Please review them below.
                </Text>
              </View>
            </View>
          )}

          {/* TRANSACTIONS TABLE CARD */}
          <View style={styles.transactionsCard}>
            <View style={styles.transactionsHeaderRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                {['All', 'Credit', 'Debit'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.pillBtn,
                      activeTab === tab && styles.pillBtnActive,
                    ]}
                    onPress={() => {
                      setActiveTab(tab);
                      if (tab !== 'Debit') setDebitCategory('All');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        activeTab === tab && styles.pillTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* DEBIT CATEGORIES FILTER ROW */}
            {activeTab === 'Debit' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesFilterScroll}>
                {uniqueDebitCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catFilterBtn,
                      debitCategory === cat && styles.catFilterBtnActive,
                    ]}
                    onPress={() => setDebitCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.catFilterText,
                        debitCategory === cat && styles.catFilterTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Log Transactions */}
            <View style={styles.transactionsList}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <View key={tx.ref} style={[styles.txRow, tx.isAnomaly && { backgroundColor: '#fef2f2', paddingHorizontal: 12, borderRadius: 8 }]}>
                    <View
                      style={[
                        styles.txAvatar,
                        { backgroundColor: tx.isAnomaly ? '#ef4444' : (tx.isCredit ? '#eef2ff' : '#fff7ed') },
                      ]}
                    >
                      <Text style={[styles.txAvatarText, { color: tx.isAnomaly ? '#fff' : (tx.isCredit ? '#4f46e5' : '#d97706') }]}>
                        {tx.customer.charAt(0)}
                      </Text>
                    </View>
                    <View style={[styles.txMetaCol, { paddingRight: 8 }]}>
                      <Text style={styles.txNameText}>{tx.customer}</Text>
                      {tx.isAnomaly && (
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 }}>
                          <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>⚠️ NEEDS REVIEW</Text>
                        </View>
                      )}
                      <Text style={[styles.txDateText, { marginTop: tx.isAnomaly ? 4 : 0 }]}>{tx.date}</Text>
                    </View>
                    <View style={styles.txAmountCol}>
                      <Text
                        style={[
                          styles.txAmountText,
                          tx.isCredit ? styles.txCreditText : styles.txDebitText,
                        ]}
                      >
                        {tx.isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Text>
                      <Text style={styles.txTypeText}>{tx.type}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noTxnWrapper}>
                  <Text style={styles.noTxnText}>No transactions found.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
{activeView === 'Subscriptions' && (
        <View style={styles.subTabWrapper}>
          <SubscriptionsTab
            formatCurrency={formatCurrency}
            subscriptionsList={subscriptionsList}
            totalRecurringExpense={subscriptionsList.reduce((sum, sub) => sum + (sub.amount || 0), 0)}
          />
        </View>
      )}

      {activeView === 'FinHealth' && (
        <View style={styles.subTabWrapper}>
          <FinHealthTab
            summaryMetrics={summaryMetrics}
            aiSummaryText={aiSummaryText}
            activeDocId={activeDocId}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            chatHistory={chatHistory}
            isChatLoading={isChatLoading}
            handleSendChat={handleSendChat}
          />
        </View>
      )}

      {/* ── INVESTMENT RECOMMENDATIONS SECTION ── */}
      <View style={styles.investmentsSection}>
        <Text style={styles.investmentsMainTitle}>Your savings are sleeping. Let's wake them up.</Text>
        <Text style={styles.investmentsMainDesc}>
          Don't let inflation eat your hard-earned money. Based on your recent spending profile, our AI has curated the smartest places to park cash.
        </Text>

        <View style={styles.recommendationList}>
          {/* Card 1 */}
          <View style={styles.investmentCard}>
            <View style={styles.investmentCardHeader}>
              <View style={[styles.riskBadge, styles.lowRiskBg]}>
                <Text style={[styles.riskText, styles.lowRiskColor]}>Low Risk</Text>
              </View>
              <Image source={require('../assets/icici.jpeg')} style={{ width: 80, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={styles.investNameTitle}>ICICI Prudential Liquid Fund</Text>
            <Text style={styles.investDescText}>
              Earn ~7.1% p.a. with instant withdrawal capabilities. A much better alternative to leaving cash idle.
            </Text>
            <TouchableOpacity style={styles.investActionBtn} activeOpacity={0.7}>
              <Text style={styles.investActionBtnText}>Explore Fund</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2 */}
          <View style={[styles.investmentCard, styles.topPickCard]}>
            <View style={styles.topPickBadge}>
              <Text style={styles.topPickBadgeText}>TOP PICK</Text>
            </View>
            <View style={styles.investmentCardHeader}>
              <View style={[styles.riskBadge, styles.medRiskBg]}>
                <Text style={[styles.riskText, styles.medRiskColor]}>Medium Risk</Text>
              </View>
              <Image source={require('../assets/hdfc.jpeg')} style={{ width: 80, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={styles.investNameTitle}>HDFC Index Fund (Nifty 50)</Text>
            <Text style={styles.investDescText}>
              Tracks top 50 Indian companies. Historical 12-14% returns. Perfect for starting a disciplined SIP.
            </Text>
            <TouchableOpacity style={[styles.investActionBtn, styles.topPickActionBtn]} activeOpacity={0.7}>
              <Text style={[styles.investActionBtnText, styles.topPickActionBtnText]}>Start SIP</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3 */}
          <View style={styles.investmentCard}>
            <View style={styles.investmentCardHeader}>
              <View style={[styles.riskBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.riskText, { color: '#b91c1c' }]}>High Risk</Text>
              </View>
              <Image source={require('../assets/tatamf.jpeg')} style={{ width: 80, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={styles.investNameTitle}>Tata Digital India Fund</Text>
            <Text style={styles.investDescText}>
              Capitalize on the IT sector's growth with historical 18-20% p.a. returns over 5 years. Ideal for long-term wealth creation.
            </Text>
            <TouchableOpacity style={styles.investActionBtn} activeOpacity={0.7}>
              <Text style={styles.investActionBtnText}>Explore Fund</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 90,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  overviewContainer: {
    gap: 16,
  },
  subTabWrapper: {
    width: '100%',
  },
  uploaderCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  uploaderList: {
    gap: 10,
  },
  fileSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  fileItemText: {
    marginLeft: 10,
  },
  fileItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fileItemSize: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  selectedFileView: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileTextWrapper: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  selectedFileSize: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  analyzeBtn: {
    flex: 2,
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  analyzeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  simulationCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  brainIconRow: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brainWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
  },
  simulationSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  chartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    backgroundColor: '#eef2ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
  },
  refreshBtn: {
    backgroundColor: '#f1f5f9',
    padding: 5,
    borderRadius: 6,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#4f46e5',
    // Conic gradient representation on mobile
    borderWidth: 12,
    borderColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  donutVal: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 2,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#eef2ff',
    flex: 1,
  },
  barPct: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  barGraphRow: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    gap: 12,
    paddingTop: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  graphCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  graphPctLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  graphBarContainer: {
    flex: 1,
    width: '50%',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  graphBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  graphNameLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0f172a',
  },
  statementsHistoryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  statementsHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  statementsList: {
    gap: 8,
  },
  statementItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    borderWidth: 1,
    borderRadius: 10,
  },
  statementItemBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  statementTextCol: {
    flex: 1,
  },
  statementMonthText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  statementMonthTextActive: {
    color: '#4f46e5',
  },
  statementTxnText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  statementBadge: {
    backgroundColor: '#d1fae5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statementBadgeText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '700',
  },
  balancesContainer: {
    gap: 12,
  },
  balanceItemCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  balanceRowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  flexCard: {
    flex: 1,
  },
  balanceHeaderIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  balanceCardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  balanceCardVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  smallerVal: {
    fontSize: 18,
  },
  transactionsCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  transactionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  pillsScroll: {
    flex: 1,
  },
  pillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 6,
  },
  pillBtnActive: {
    backgroundColor: '#4f46e5',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  exportBtn: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  exportBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoriesFilterScroll: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  catFilterBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 6,
  },
  catFilterBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  catFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  catFilterTextActive: {
    color: '#4f46e5',
  },
  transactionsList: {
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  txAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  txMetaCol: {
    flex: 1,
    marginLeft: 12,
  },
  txNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  txDateText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  txAmountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  txCreditText: {
    color: '#059669',
  },
  txDebitText: {
    color: '#0f172a',
  },
  txTypeText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  actionsIcon: {
    alignSelf: 'center',
  },
  noTxnWrapper: {
    padding: 24,
    alignItems: 'center',
  },
  noTxnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  investmentsSection: {
    marginTop: 32,
    paddingHorizontal: 4,
  },
  investmentsMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  investmentsMainDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 24,
  },
  recommendationList: {
    gap: 16,
  },
  investmentCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  topPickCard: {
    borderColor: '#4f46e5',
    borderWidth: 2,
    position: 'relative',
    marginTop: 8,
  },
  topPickBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: '#4f46e5',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 1,
  },
  topPickBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  investmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  riskBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  lowRiskBg: {
    backgroundColor: '#d1fae5',
  },
  lowRiskColor: {
    color: '#059669',
  },
  medRiskBg: {
    backgroundColor: '#fef3c7',
  },
  medRiskColor: {
    color: '#d97706',
  },
  zeroRiskBg: {
    backgroundColor: '#eef2ff',
  },
  zeroRiskColor: {
    color: '#4f46e5',
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bankNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  investNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  investDescText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 16,
  },
  investActionBtn: {
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPickActionBtn: {
    backgroundColor: '#4f46e5',
    borderWidth: 0,
  },
  investActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4f46e5',
  },
  topPickActionBtnText: {
    color: '#ffffff',
  },
});
