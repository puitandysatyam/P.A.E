import React, { useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Activity, CheckCircle, AlertCircle, BrainCircuit, Send } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';

export default function FinHealthTab({ summaryMetrics = {}, aiSummaryText = '', activeDocId, chatMessage, setChatMessage, chatHistory = [], isChatLoading, handleSendChat }) {
  const scrollViewRef = useRef();
  const isHealthy = summaryMetrics.financialHealth === 'HEALTHY';
  const isWarning = summaryMetrics.financialHealth === 'WARNING';
  
  const iconColor = isHealthy ? '#059669' : (isWarning ? '#d97706' : '#dc2626');
  const bgColor = isHealthy ? '#d1fae5' : (isWarning ? '#fef3c7' : '#fee2e2');
  const score = isHealthy ? '82' : (isWarning ? '55' : '30');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
            <Activity size={22} color={iconColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Financial Health Score</Text>
            <Text style={styles.subtitle}>Based on liquidity, debt-ratio, and savings</Text>
          </View>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNumber, { color: iconColor }]}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        {/* ── UNIFIED GEMINI AI CARD ── */}
        <View style={styles.aiSummaryCard}>
          <View style={styles.aiSummaryHeader}>
            <BrainCircuit size={16} color="#4f46e5" />
            <Text style={styles.aiSummaryTitle}>Gemini AI Advisor Insight</Text>
          </View>
          
          {aiSummaryText ? (
            <Text style={styles.aiSummaryText}>
              <Text style={{ fontWeight: '600' }}>
                Based on your fixed habits and subscriptions, your baseline expenses for next month are ₹{summaryMetrics.predictedBurnRate?.toLocaleString('en-IN') || 0}. You will have exactly ₹{summaryMetrics.predictedDiscretionaryIncome?.toLocaleString('en-IN') || 0} left for discretionary spending.
              </Text>
              {"\n\n"}
              {aiSummaryText}
            </Text>
          ) : null}

          <View style={styles.chatContainer}>
            <ScrollView 
              style={styles.chatHistoryScroll}
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {chatHistory.map((msg, idx) => (
                <View key={idx} style={[styles.chatBubble, msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                  {msg.role === 'assistant' || msg.role === 'model' ? (
                    <Markdown style={markdownStyles}>{msg.content}</Markdown>
                  ) : (
                    <Text style={styles.chatBubbleTextUser}>{msg.content}</Text>
                  )}
                </View>
              ))}
              {isChatLoading && (
                <View style={[styles.chatBubble, styles.chatBubbleAI, { width: 50, alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask about your finances..."
                placeholderTextColor="#94a3b8"
                value={chatMessage}
                onChangeText={setChatMessage}
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity 
                style={[styles.chatSendBtn, !chatMessage.trim() && { opacity: 0.5 }]} 
                onPress={handleSendChat}
                disabled={!chatMessage.trim() || isChatLoading}
              >
                <Send size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SVG Trend Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Health Trend (Last 6 Months)</Text>
          <View style={styles.svgWrapper}>
            <Svg viewBox="0 0 600 200" width="100%" height="150">
              {/* Grid Lines */}
              <Line x1="0" y1="50" x2="600" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <Line x1="0" y1="100" x2="600" y2="100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <Line x1="0" y1="150" x2="600" y2="150" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Trend Path */}
              <Path d="M 20,120 L 130,110 L 240,135 L 350,90 L 460,70 L 570,50" fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Data Points */}
              <Circle cx="20" cy="120" r="6" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <Circle cx="130" cy="110" r="6" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <Circle cx="240" cy="135" r="6" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <Circle cx="350" cy="90" r="6" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <Circle cx="460" cy="70" r="6" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
              <Circle cx="570" cy="50" r="8" fill="#4f46e5" />
              
              {/* Month Labels */}
              <SvgText x="20" y="180" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">Mar</SvgText>
              <SvgText x="130" y="180" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">Apr</SvgText>
              <SvgText x="240" y="180" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">May</SvgText>
              <SvgText x="350" y="180" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">Jun</SvgText>
              <SvgText x="460" y="180" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">Jul</SvgText>
              <SvgText x="570" y="180" fill="#4f46e5" fontSize="13" fontWeight="800" textAnchor="middle">Aug</SvgText>
            </Svg>
          </View>
        </View>

        {/* Insights Cards */}
        <View style={styles.insights}>
          <View style={[styles.insightCard, styles.successCard]}>
            <View style={styles.insightHeader}>
              <CheckCircle size={16} color="#059669" />
              <Text style={styles.insightTitle}>Strong Liquidity</Text>
            </View>
            <Text style={styles.insightDesc}>Your end-of-month balance has grown by 14% over the last quarter. Excellent cash retention.</Text>
          </View>

          <View style={[styles.insightCard, styles.warningCard]}>
            <View style={styles.insightHeader}>
              <AlertCircle size={16} color="#f59e0b" />
              <Text style={[styles.insightTitle, { color: '#b45309' }]}>High Fixed Costs</Text>
            </View>
            <Text style={styles.insightDesc}>Recurring software and rent subscriptions consume 42% of your monthly inflows.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  iconWrapper: {
    backgroundColor: '#d1fae5',
    padding: 10,
    borderRadius: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
  },
  scoreMax: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
    marginLeft: 1,
  },
  aiSummaryCard: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4f46e5',
  },
  aiSummaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1e1b4b',
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10,
  },
  svgWrapper: {
    width: '100%',
    height: 150,
  },
  insights: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  successCard: {
    borderLeftColor: '#059669',
  },
  warningCard: {
    borderLeftColor: '#f59e0b',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  insightDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  chatContainer: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#c7d2fe',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  chatHistoryScroll: {
    maxHeight: 300,
    marginBottom: 12,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '85%',
  },
  chatBubbleUser: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleAI: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatBubbleTextUser: {
    color: '#ffffff',
    fontSize: 13,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  chatSendBtn: {
    backgroundColor: '#4f46e5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const markdownStyles = {
  body: {
    color: '#1e293b',
    fontSize: 13,
    lineHeight: 20,
  },
  strong: {
    fontWeight: '800',
    color: '#0f172a',
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  heading1: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heading2: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  heading3: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
};
