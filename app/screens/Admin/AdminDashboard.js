/* ------------------------------------------------------------------------
   AdminDashboard.js  ― Modern React‑Native HR Admin Dashboard
   ------------------------------------------------------------------------
   Packages: react-native-paper for progress bars & cards
   ----------------------------------------------------------------------*/
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions
} from 'react-native';
import { ProgressBar, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../../services/api';

const { width } = Dimensions.get('window');

/* ------------------------------  THEME  -------------------------------- */
const COLORS = {
  primary: '#2c3e50',     // Dark Blue
  secondary: '#3498db',   // Vibrant Blue
  accent: '#2ecc71',      // Emerald Green
  background: '#f8f9fa',  // Light Gray BG
  card: '#ffffff',        // White Cards
  textPrimary: '#34495e',
  textSecondary: '#7f8c8d',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  highlight: '#f1c40f',
};

const STATUS_COLORS = {
  manager: COLORS.primary,
  hr: COLORS.secondary,
  finance: COLORS.accent
};

/* ---------------------------  MAIN SCREEN  ----------------------------- */
export default function AdminDashboard() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  /* --------------------  DERIVED DATA  -------------------- */
  const summary = data.dashboard_summary || {};
  const requestsSummary = summary.requests || {};
  const stage = data.requests_stage_breakdown || {};
  const allUsersBalances = data.all_users_balances || [];
  const vacationsByMonth = data.vacationsByMonth || [];

  const avgVacBalance = allUsersBalances.length
    ? (
        allUsersBalances.reduce((acc, cur) => acc + (parseFloat(cur.balance) || 0), 0) /
        allUsersBalances.length
      ).toFixed(1)
    : 0;

  /* --- workflow progress data --- */
  const progressData = useMemo(() => {
    const total = Object.values(stage).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
    return [
      { label: 'Manager', key: 'manager', value: stage.manager_pending || 0 },
      { label: 'HR', key: 'hr', value: stage.hr_pending || 0 },
      { label: 'Finance', key: 'finance', value: stage.finance_pending || 0 },
    ].map(item => ({
      ...item,
      pct: total ? item.value / total : 0,
      color: STATUS_COLORS[item.key]
    }));
  }, [stage]);

  /* -------------------  LOADING STATE  ------------------- */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading Dashboard Data...</Text>
      </View>
    );
  }

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadDashboard();
  };

  /* =========================  RENDER  ========================= */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          colors={[COLORS.primary]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      {/* ---------- Header ---------- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>HR Dashboard</Text>
          <Text style={styles.headerSubtitle}>Administrator Panel</Text>
        </View>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric' 
          })}
        </Text>
      </View>

      {/* ---------- Quick Stats ---------- */}
      <View style={styles.statsRow}>
        <StatCard
          icon="account-group"
          label="Employees"
          value={summary.total_users ?? 0}
          trend="+2%"
          color={COLORS.primary}
        />
        <StatCard
          icon="clock-alert"
          label="Pending Req."
          value={requestsSummary.pending ?? 0}
          trend="↓5%"
          color={COLORS.secondary}
        />
        <StatCard
          icon="calendar-check"
          label="Avg. Vacation"
          value={avgVacBalance}
          suffix="days"
          color={COLORS.accent}
        />
      </View>

      {/* ---------- Workflow Status ---------- */}
      <Card style={styles.sectionCard}>
        <Card.Title 
          title="Approval Workflow" 
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="progress-check" size={24} color={COLORS.primary} />}
        />
        <Card.Content>
          {progressData.every(d => d.value === 0) ? (
            <NoData />
          ) : (
            progressData.map((item) => (
              <View key={item.label} style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>{item.label}</Text>
                  <Text style={[styles.progressValue, { color: item.color }]}>{item.value}</Text>
                </View>
                <ProgressBar
                  progress={item.pct}
                  color={item.color}
                  style={styles.progressBar}
                />
                <Text style={styles.progressPercentage}>
                  {Math.round(item.pct * 100)}%
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* ---------- Vacation Trends ---------- */}
      <Card style={styles.sectionCard}>
        <Card.Title 
          title="Vacation Trends" 
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="chart-bar" size={24} color={COLORS.accent} />}
        />
        <Card.Content>
          {vacationsByMonth.length ? (
            <View style={styles.chartContainer}>
              {vacationsByMonth.map((m) => {
                const total = m.annual + m.sick + m.other;
                const maxDays = Math.max(...vacationsByMonth.map(m => m.annual + m.sick + m.other));
                const barHeight = (total / maxDays) * 100;
                
                return (
                  <View key={m.month} style={styles.chartBar}>
                    <View style={[styles.barFill, { height: `${barHeight}%`, backgroundColor: COLORS.accent }]} />
                    <Text style={styles.chartLabel}>{m.month.slice(0, 3)}</Text>
                    <Text style={styles.chartValue}>{total}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <NoData />
          )}
        </Card.Content>
      </Card>

      {/* ---------- Announcements ---------- */}
      <Card style={styles.sectionCard}>
        <Card.Title 
          title="Company Announcements" 
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="bullhorn" size={24} color={COLORS.highlight} />}
        />
        <Card.Content>
          {data.announcements?.length ? (
            data.announcements.map((a) => (
              <View key={a.id} style={styles.announceCard}>
                <View style={styles.announceHeader}>
                  <Text style={styles.announceTitle}>{a.title}</Text>
                  <Text style={styles.announceDate}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.announceMsg}>{a.message}</Text>
              </View>
            ))
          ) : (
            <NoData message="No announcements" />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

/* ----------------  COMPONENTS  ---------------- */
function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function NoData({ message = "No data available" }) {
  return (
    <View style={styles.noDataContainer}>
      <MaterialCommunityIcons name="database-remove" size={32} color="#bdc3c7" />
      <Text style={styles.noData}>{message}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, suffix, trend, color }) {
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}{suffix ? ` ${suffix}` : ''}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {trend && <Text style={styles.statTrend}>{trend}</Text>}
      </Card.Content>
    </Card>
  );
}

/* -------------------------  STYLES  ------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  /* Loader */
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loaderText: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontSize: 16
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2
  },
  headerDate: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#ecf0f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },

  /* Stats Cards */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  statTrend: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success
  },

  /* Section Cards */
  sectionCard: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },

  /* Progress Bars */
  progressContainer: {
    marginBottom: 20
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500'
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ecf0f1',
  },
  progressPercentage: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  },

  /* Vacation Chart */
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 10,
    paddingBottom: 20
  },
  chartBar: {
    alignItems: 'center',
    width: (width - 100) / 6,
  },
  barFill: {
    width: '70%',
    borderRadius: 6,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4
  },

  /* Announcements */
  announceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.highlight
  },
  announceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  announceTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1
  },
  announceDate: {
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    fontSize: 12
  },
  announceMsg: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },

  /* No Data */
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30
  },
  noData: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8
  }
});