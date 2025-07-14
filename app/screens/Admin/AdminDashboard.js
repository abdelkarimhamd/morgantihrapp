/* ------------------------------------------------------------------------
   AdminDashboard.js  ―  React-Native version of the HR Admin dashboard
   ------------------------------------------------------------------------
   Packages you’ll need (all stable, community-maintained):

   npm i axios react-native-chart-kit react-native-svg
   npx expo install react-native-svg          # if you’re on Expo

   Optional icons (Expo):
   npx expo install @expo/vector-icons
   ----------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import axios from 'axios';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'; // expo-vector-icons
import api from '../../../services/api';

/* ------------------------------  THEME  -------------------------------- */
const COLORS = {
  primaryDark: '#1e3e7b',
  primaryMid:  '#2788b9',
  accent:      '#768f3a',
  lightBG:     '#f0f2f5',
  white:       '#ffffff',
  cardShadow:  Platform.OS === 'ios' ? '#0002' : '#00000040',
};

const CHART_COLORS = [COLORS.primaryDark, COLORS.primaryMid, COLORS.accent];

/* ---------------------------  MAIN SCREEN  ----------------------------- */
export default function AdminDashboard() {
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await api.get(
        '/admin/dashboard'
      );
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* --------------------  PARSE THE API DATA  -------------------- */
  const summary          = data.dashboard_summary ?? {};
  const requestsSummary  = summary.requests ?? {};
  const allUsersBalances = data.all_users_balances ?? [];

  const avgVacBalance = allUsersBalances.length
    ? (
        allUsersBalances.reduce((acc, cur) => acc + (parseFloat(cur.balance) || 0), 0) /
        allUsersBalances.length
      ).toFixed(1)
    : 0;

  const pieData = [
    { name: 'Approved', count: requestsSummary.approved || 0, color: CHART_COLORS[0] },
    { name: 'Pending',  count: requestsSummary.pending  || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', count: requestsSummary.rejected || 0, color: CHART_COLORS[2] },
  ];

  const vacationsByMonth = data.vacationsByMonth ?? [];
  const barLabels = vacationsByMonth.map((m) => m.month);
  const annual    = vacationsByMonth.map((m) => m.annual  ?? 0);
  const sick      = vacationsByMonth.map((m) => m.sick    ?? 0);
  const other     = vacationsByMonth.map((m) => m.other   ?? 0);

  /* -------------------  LOADING STATE  ------------------- */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
        <Text style={styles.loaderText}>Loading dashboard…</Text>
      </View>
    );
  }

  /* =========================  RENDER  ========================= */
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          colors={[COLORS.primaryDark]}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDashboard();
          }}
        />
      }
    >
      {/* ---------- Header ---------- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HR Admin Dashboard</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year:    'numeric',
            month:   'long',
            day:     'numeric',
          })}
        </Text>
      </View>

      {/* ---------- Quick Stats ---------- */}
      <View style={styles.statsRow}>
        <StatCard
          icon="account-multiple"
          label="Employees"
          value={summary.total_users ?? 0}
          color={COLORS.primaryDark}
        />
        <StatCard
          icon="timer-sand"
          label="Open Req."
          value={requestsSummary.pending ?? 0}
          color={COLORS.primaryMid}
        />
        <StatCard
          icon="calendar-check"
          label="Avg. Vacation"
          value={avgVacBalance}
          color={COLORS.accent}
        />
      </View>

      {/* ---------- Bar Chart ---------- */}
      <SectionTitle>Vacations & Requests Over Time</SectionTitle>
      {vacationsByMonth.length ? (
        <BarChart
          data={{
            labels: barLabels,
            datasets: [
              { data: annual, color: () => CHART_COLORS[0] },
              { data: sick,   color: () => CHART_COLORS[1] },
              { data: other,  color: () => CHART_COLORS[2] },
            ],
            legend: ['Annual', 'Sick', 'Other'],
          }}
          width={Dimensions.get('window').width - 32}
          height={240}
          fromZero
          showBarTops
          withHorizontalLabels={false}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      ) : (
        <NoData />
      )}

      {/* ---------- Pie Chart ---------- */}
      <SectionTitle>Requests Status</SectionTitle>
      {pieData.some((p) => p.count > 0) ? (
        <PieChart
          data={pieData.map((p) => ({
            name: p.name,
            population: p.count,
            color: p.color,
            legendFontColor: '#444',
            legendFontSize: 12,
          }))}
          width={Dimensions.get('window').width - 32}
          height={220}
          accessor="population"
          chartConfig={chartConfig}
          backgroundColor="transparent"
          paddingLeft="5"
          center={[0, 0]}
          absolute
          style={styles.chart}
        />
      ) : (
        <NoData />
      )}

      {/* ---------- Announcements ---------- */}
      <SectionTitle>Announcements</SectionTitle>
      {data.announcements?.length ? (
        data.announcements.map((a) => (
          <View key={a.id} style={styles.announceCard}>
            <Text style={styles.announceTitle}>{a.title}</Text>
            <Text style={styles.announceDate}>
              {new Date(a.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.announceMsg}>{a.message}</Text>
          </View>
        ))
      ) : (
        <NoData />
      )}
    </ScrollView>
  );
}

/* ----------------  SMALL REUSABLE PIECES  ---------------- */
function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function NoData() {
  return <Text style={styles.noData}>No data available</Text>;
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.white} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/* -------------------------  STYLES  ------------------------- */
const chartConfig = {
  backgroundColor: COLORS.white,
  backgroundGradientFrom: COLORS.white,
  backgroundGradientTo: COLORS.white,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(30, 62, 123, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
  barPercentage: 0.6,
  propsForBackgroundLines: { strokeWidth: 0 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightBG, padding: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loaderText: { marginTop: 8, color: COLORS.primaryDark, fontWeight: '500' },

  header: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  headerDate:  { color: '#dbe3ff', fontSize: 12, marginTop: 4 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: { color: COLORS.white, fontSize: 13, marginTop: 4 },
  statValue: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primaryDark, marginBottom: 8 },
  chart: { marginVertical: 8, borderRadius: 8 },

  noData: { color: '#777', marginBottom: 12 },

  announceCard: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  announceTitle: { fontWeight: 'bold', fontSize: 14, color: '#222' },
  announceDate: { fontStyle: 'italic', color: '#666', fontSize: 12, marginVertical: 4 },
  announceMsg: { color: '#333', fontSize: 13 },
});
