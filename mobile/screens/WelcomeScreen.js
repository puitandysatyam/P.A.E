import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronRight, ShieldCheck, FileText, AlertTriangle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// A mini floating transaction card simulating the web frontend
const FloatingCard = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12], // gently floats up by 12px
  });

  return (
    <Animated.View style={[styles.floatingCardContainer, { transform: [{ translateY }] }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <FileText size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>HDFC Bank Statement</Text>
          <Text style={styles.cardSubtitle}>Apr 2025 · 312 txns</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>Analysed</Text>
        </View>
      </View>

      <View style={styles.txRow}>
        <View style={[styles.txAvatar, { backgroundColor: '#f9731620' }]} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.txName}>Swiggy Order</Text>
          <Text style={styles.txCat}>Food & Dining</Text>
        </View>
        <Text style={styles.txAmt}>-₹ 486</Text>
      </View>

      <View style={styles.txRow}>
        <View style={[styles.txAvatar, { backgroundColor: '#05966920' }]} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.txName}>Salary Credit</Text>
          <Text style={styles.txCat}>Income</Text>
        </View>
        <Text style={[styles.txAmt, { color: '#059669' }]}>+₹ 85,000</Text>
      </View>
      
      {/* Overlapping mini alert widget */}
      <View style={styles.floatingAlert}>
        <AlertTriangle size={12} color="#f97316" />
        <Text style={styles.alertText}>Flagged for Review</Text>
      </View>
    </Animated.View>
  );
};

export default function WelcomeScreen({ onStart }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      {/* Background base */}
      <LinearGradient
        colors={['#1e1b4b', '#312e81', '#0f172a']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Simulated Mesh Gradients using absolute angled LinearGradients */}
      <LinearGradient
        colors={['rgba(120, 80, 240, 0.4)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.blob1}
      />
      <LinearGradient
        colors={['rgba(249, 115, 22, 0.25)', 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.blob2}
      />
      <LinearGradient
        colors={['rgba(5, 150, 105, 0.3)', 'transparent']}
        start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
        style={styles.blob3}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Drag.Drop.{'\n'}
              <Text style={styles.titleItalic}>Decode.</Text>
            </Text>

            <Text style={styles.description}>
              Securely process statements, uncover spending patterns and flag anomalies instantly. Transform static data into live insights.
            </Text>
          </View>

          {/* The new floating visualization */}
          <View style={styles.mockupWrapper}>
             <FloatingCard />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={onStart}>
              <Text style={styles.primaryButtonText}>Open Dashboard</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>API Docs</Text>
              <ChevronRight size={16} color="#111111" />
            </TouchableOpacity>
          </View>

          {/* Privacy footer */}
          <View style={styles.privacyFooter}>
            <ShieldCheck size={14} color="#a7f3d0" />
            <Text style={styles.privacyText}>Privacy-First. No PII leaves the app.</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  blob1: { position: 'absolute', top: -100, left: -50, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 },
  blob2: { position: 'absolute', top: height * 0.2, right: -100, width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45 },
  blob3: { position: 'absolute', bottom: -50, left: 20, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 },
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  textContainer: { width: '100%', alignItems: 'center', marginTop: 40 },
  title: { color: '#ffffff', fontSize: 44, fontWeight: '900', textAlign: 'center', lineHeight: 52, letterSpacing: -1.5, marginBottom: 16 },
  titleItalic: { color: '#fef08a', fontStyle: 'italic' },
  description: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 10 },
  mockupWrapper: { width: '100%', alignItems: 'center', marginVertical: 36, zIndex: 10 },
  floatingCardContainer: { width: width * 0.85, backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#7850f0', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  cardSubtitle: { fontSize: 11, color: '#64748b' },
  cardBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  cardBadgeText: { color: '#059669', fontSize: 9, fontWeight: '800' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  txAvatar: { width: 28, height: 28, borderRadius: 8 },
  txName: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  txCat: { fontSize: 10, color: '#64748b' },
  txAmt: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  floatingAlert: { position: 'absolute', bottom: -15, right: -10, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, shadowColor: '#f97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, borderWidth: 1, borderColor: '#ffedd5' },
  alertText: { fontSize: 10, fontWeight: '800', color: '#f97316', marginLeft: 6, textTransform: 'uppercase' },
  buttonContainer: { width: '100%', gap: 12, marginBottom: 30 },
  primaryButton: { backgroundColor: '#7850f0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 14, gap: 8, shadowColor: '#7850f0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 },
  primaryButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: 'rgba(255, 255, 255, 0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  secondaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  privacyFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52, 211, 153, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  privacyText: { color: '#a7f3d0', fontSize: 11, fontWeight: '600' },
});
