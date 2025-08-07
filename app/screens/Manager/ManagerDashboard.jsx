// File: app/screens/Manager/ManagerDashboard.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import moment from 'moment';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import MapView, { Marker } from 'react-native-maps';
import api from '../../../services/api';

/* ────────────────────────────────────────────────────────────
   Enable LayoutAnimation on Android
────────────────────────────────────────────────────────────── */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ────────────────────────────────────────────────────────────
   Shared colour palette (same as Employee dashboard)
────────────────────────────────────────────────────────────── */
const COLORS = {
  primary:   '#1f3d7c',
  secondary: '#248bbc',
  accent:    '#74933c',
  background:'#f8f9fd',
  text:      '#2c3e50',
  success:   '#27ae60',
  error:     '#e74c3c',
  warning:   '#f1c40f',
  white:     '#ffffff',
  teal:      '#1c6c7c',
  border:    '#e2e8f0',
};

/* ────────────────────────────────────────────────────────────
   Leave‑type metadata (mini‑icons & colours)
────────────────────────────────────────────────────────────── */
const LEAVE_TYPE = {
  Annual:       { label:'Annual',      icon:'🌴',  col:'#74933c' },
  Sick:         { label:'Sick',        icon:'🤒',  col:'#248bbc' },
  Emergency:    { label:'Emergency',   icon:'🚨',  col:'#e74c3c' },
  Unpaid:       { label:'Unpaid',      icon:'💸',  col:'#9e9e9e' },
  BabyBorn:     { label:'Baby Born',   icon:'👶',  col:'#ff8f00' },
  FamilyDeath:  { label:'Family Loss', icon:'🕊️', col:'#6d4c41' },
  Exam:         { label:'Exam',        icon:'📝',  col:'#5e35b1' },
  Haj:          { label:'Haj',         icon:'🕋',  col:'#00897b' },
  Marriage:     { label:'Marriage',    icon:'💍',  col:'#c2185b' },
  Pregnancy:    { label:'Pregnancy',   icon:'🤰',  col:'#f06292' },
  HusbandDeath: { label:'Husb. Loss',  icon:'🖤',  col:'#37474f' },
};

/* ────────────────────────────────────────────────────────────
   Helper utilities
────────────────────────────────────────────────────────────── */
const servicePeriod = (joinDate) => {
  if (!joinDate) return '—';
  const diff = moment.duration(moment().diff(moment(joinDate)));
  return `${diff.years()}y ${diff.months()}m`;
};
const daysLeftThisYear = () => moment().endOf('year').diff(moment(), 'days');
const accrualRate = (contract, type) => {
  if (type === 'Annual') {
    if (contract === '30 Days Yearly') return 30 / 365;
    if (contract === '21 Days Yearly') return 21 / 365;
  }
  return 0;
};
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/* ╔══════════════════════════════════════════════════════════╗
   ║                     MAIN COMPONENT                      ║
   ╚══════════════════════════════════════════════════════════╝ */
export default function ManagerDashboard() {
  /* ── DATA STATE ─────────────────────────────── */
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [manager,       setManager]       = useState(null);
  const [contractType,  setContractType]  = useState('');
  const [vacations,     setVacations]     = useState([]);
  const [myReqs,        setMyReqs]        = useState([]);
  const [subReqs,       setSubReqs]       = useState([]);
  const [holidays,      setHolidays]      = useState([]);
  const [anns,          setAnns]          = useState([]);

  /* ── LOCATION & ATTENDANCE ───────────────────── */
  const [location,      setLocation]      = useState(null);
  const [currentProject,setCurrentProject]= useState(null);   // ← NEW
  const [geoStatus,     setGeoStatus]     = useState('');
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [lastPunchType, setLastPunchType] = useState(null);

  /* ── UI STATE ────────────────────────────────── */
  const [open,          setOpen]          = useState({ balances:true,my:true,sub:true,anns:true,hols:true });
  const role = useSelector((s)=>s.auth.user?.role);

  /* ── ANIMATION HOOKS ─────────────────────────── */
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const btnScale       = useRef(new Animated.Value(1)).current;
  const pulseAvatar    = useRef(new Animated.Value(1)).current;

  /* ── PREFIX RESOLVER ─────────────────────────── */
  const apiPrefix = (() => {
    switch (role) {
      case 'hr_admin':            return '/admin';
      case 'manager':             return '/manager';
      case 'finance':             return '/finance';
      case 'ceo':                 return '/ceo';
      case 'finance_coordinator': return '/finance_coordinator';
      default:                    return '/employee';
    }
  })();

  /* ── INITIALISE ──────────────────────────────── */
  useEffect(() => {
    requestLocationPermission();
    fetchAll();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAvatar,{ toValue:1.06,duration:1200,useNativeDriver:true }),
        Animated.timing(pulseAvatar,{ toValue:1,   duration:1200,useNativeDriver:true }),
      ])
    ).start();
  }, []);

  useEffect(() => { if (manager) fetchLastPunch(); }, [manager]);

  useEffect(() => {
    Animated.timing(messageOpacity,{
      toValue: attendanceMsg ? 1 : 0,
      duration: 300,
      useNativeDriver:true,
    }).start();
  }, [attendanceMsg]);

  /* ── LOCATION HANDLERS ───────────────────────── */
  const requestLocationPermission = async () => {
    try {
      setGeoStatus('Requesting GPS…');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoStatus('Permission denied');
        Alert.alert('Permission Denied','Location access is required for attendance.');
        return;
      }
      startWatcher();
    } catch (e) {
      console.error('Loc‑perm error',e);
      setGeoStatus('Permission error');
    }
  };

  const startWatcher = async () => {
    setGeoStatus('Getting location…');
    await Location.watchPositionAsync(
      { accuracy:Location.Accuracy.High, distanceInterval:1 },
      (pos)=>{ 
        setLocation(pos.coords);
        setGeoStatus('');
        checkGeofence(pos.coords);   // ← NEW
      });
  };

  const checkGeofence = async (coords) => {
    try{
      const { data } = await api.get('/attendances/functionlati',{
        params:{ lat:coords.latitude, lng:coords.longitude },
      });
      const inRange = (data.projects || []).find(p=>p.in_range);
      setCurrentProject(inRange ? inRange.project_id : null);
    }catch(err){
      console.error('Geofence API err',err);
      setCurrentProject(null);
    }
  };

  /* ── API FETCHES ─────────────────────────────── */
  const fetchAll = async () => {
    !refreshing && setLoading(true);
    try{
      const [dashRes, holRes, annRes] = await Promise.all([
        api.get(`${apiPrefix}/dashboard`),
        api.get('/holidays'),
        api.get('/announcements'),
      ]);
      const d = dashRes.data;
      setManager(d.manager || {});
      setContractType(d.manager?.contract_type || '');
      setVacations(d.vacations || []);
      setMyReqs(d.managerRequests || []);
      setSubReqs(d.subordinateRequests || []);
      setHolidays(holRes.data || []);
      setAnns(annRes.data || []);
    }catch(err){
      console.error('Dash fetch err',err);
      Alert.alert('Error','Could not load dashboard.');
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(()=>{
    setRefreshing(true);
    fetchAll();
  },[]);

  const fetchLastPunch = async () => {
    try{
      const today = moment().format('YYYY-MM-DD');
      const { data } = await api.get('/attendances',{
        params:{
          employee_code: manager.employee_code,
          from:`${today} 00:00:00`,
          to  :`${today} 23:59:59`,
        },
      });
      const list = (data.data || []).sort((a,b)=>new Date(b.log_time)-new Date(a.log_time));
      setLastPunchType(list[0]?.type ?? null);
    }catch(e){ console.error('Last punch err',e); }
  };

  /* ── ATTENDANCE LOGIC ────────────────────────── */
  const nextPunch = !lastPunchType || lastPunchType==='CheckOut' ? 'CheckIn' : 'CheckOut';
  const canPunch  = () => location && currentProject!==null;   // ← tightened

  const handlePunchBiometric = async () => {
    if(!canPunch()){
      setAttendanceMsg('Out of range – cannot punch.');
      return;
    }
    try{
      await biometricAuth();
      await submitPunch(nextPunch);
    }catch(err){
      console.error('Punch err',err);
      setAttendanceMsg(err.message || 'Could not authenticate.');
    }
  };

  const biometricAuth = async () => {
    const [hw,enr] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if(!hw)  throw new Error('Device lacks biometric hardware.');
    if(!enr) throw new Error('No biometrics enrolled.');
    const res = await LocalAuthentication.authenticateAsync({ promptMessage:'Authenticate to proceed' });
    if(!res.success) throw new Error('Authentication failed.');
  };

  const submitPunch = async (type) => {
    try{
      const payload = {
        employee_code: manager.employee_code,
        device_stgid : 'PHONE-01',
        project_id   : currentProject,
        log_time     : moment().format('YYYY-MM-DD HH:mm:ss'),
        type,
        input_type   : 'GPS',
        raw_payload  : JSON.stringify({ latitude:location.latitude, longitude:location.longitude }),
      };
      const { data } = await api.post(`/attendances`,payload);
      if(data?.id){
        setLastPunchType(type);
        setAttendanceMsg(`${type} successful!`);
      }else throw new Error('Server returned no ID.');
    }catch(err){
      console.error('Submit punch err',err?.response?.data || err);
      setAttendanceMsg(err?.response?.data?.error || 'Attendance error');
    }
  };

  /* ── BUTTON PRESS FX ─────────────────────────── */
  const pressIn  = ()=>Animated.spring(btnScale,{ toValue:0.95,useNativeDriver:true }).start();
  const pressOut = ()=>Animated.spring(btnScale,{ toValue:1, friction:3, tension:40,useNativeDriver:true }).start();

  /* ── DERIVED DATA ────────────────────────────── */
  const latest = arr => [...arr].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date)).slice(0,5);
  const balances = vacations.map(v=>{
    const cur = +v.current_balance || 0;
    const proj = cur + accrualRate(contractType,v.leave_type)*daysLeftThisYear();
    return {...v,current_balance:cur, projected_balance:proj};
  });

  const toggle = key => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o=>({...o,[key]:!o[key]}));
  };

  /* ── LOADING STATE ───────────────────────────── */
  if(loading){
    return(
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.teal}/>
        <Text style={styles.loadTxt}>Loading dashboard…</Text>
      </View>
    );
  }

  /* ── MAIN RENDER ─────────────────────────────── */
  return(
    <ScrollView
      style={styles.wrapper}
      refreshControl={<RefreshControl colors={[COLORS.primary,COLORS.secondary]} tintColor={COLORS.primary} refreshing={refreshing} onRefresh={onRefresh}/>}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <LinearGradient colors={[COLORS.primary,'#3949ab']} style={styles.header}>
        <View style={styles.headRow}>
          <Animated.View style={[styles.avatar,{ transform:[{scale:pulseAvatar}] }]}>
            <Text style={styles.avatarTxt}>{manager?.name?.[0] || 'M'}</Text>
          </Animated.View>
          <View style={{flex:1}}>
            <Text style={styles.dateTxt}>{moment().format('dddd, MMM D')}</Text>
            <Text style={styles.nameTxt} numberOfLines={1}>{manager?.name}</Text>
            <Text style={styles.roleTxt} numberOfLines={1}>
              {manager?.position}{manager?.department ? ` • ${manager.department}` : ''}
            </Text>
            <Text style={styles.roleTxt}>Service {servicePeriod(manager?.joining_date)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ATTENDANCE CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Attendance</Text>
        <Animated.Text style={[styles.attMsg,{ opacity:messageOpacity, color:attendanceMsg.includes('successful')?COLORS.success:COLORS.error }]}>
          {attendanceMsg}
        </Animated.Text>

        <Text style={styles.locTxt}>
          {location
            ? `Lat ${location.latitude.toFixed(4)}, Lng ${location.longitude.toFixed(4)}`
            : geoStatus || 'Waiting location…'}
        </Text>
        {currentProject===null && location && (<Text style={styles.outRange}>You are outside all projects’ geofence.</Text>)}

        {location && (
          <View style={styles.mapBox}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude:location.latitude,
                longitude:location.longitude,
                latitudeDelta:0.01,
                longitudeDelta:0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={location}/>
            </MapView>
          </View>
        )}

        <AnimatedTouchable
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={handlePunchBiometric}
          disabled={!canPunch()}
          style={[
            styles.punchBtn,
            { backgroundColor:nextPunch==='CheckIn'?COLORS.accent:COLORS.error,
              opacity:canPunch()?1:0.5,
              transform:[{scale:btnScale}] }
          ]}
        >
          <Text style={styles.punchIcon}>{nextPunch==='CheckIn'?'🔓':'🔒'}</Text>
          <Text style={styles.punchTxt}>{nextPunch} with Biometrics</Text>
        </AnimatedTouchable>
      </View>

      {/* LEAVE BALANCES */}
      <Section title="Leave Balances" open={open.balances} toggle={()=>toggle('balances')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:4}}>
          {balances.map(b=><BalanceCard key={b.leave_type} item={b}/>)}
        </ScrollView>
      </Section>

      {/* OWN REQUESTS */}
      <Section title="My Recent Requests" open={open.my} toggle={()=>toggle('my')}>
        <RequestList data={latest(myReqs)} isSub={false}/>
      </Section>

      {/* SUBORDINATE REQUESTS */}
      {role!=='finance' && (
        <Section title="Subordinate Requests" open={open.sub} toggle={()=>toggle('sub')}>
          <RequestList data={latest(subReqs)} isSub/>
        </Section>
      )}

      {/* ANNOUNCEMENTS */}
      <Section title="Announcements" open={open.anns} toggle={()=>toggle('anns')}>
        <Timeline data={anns} kind="ann"/>
      </Section>

      {/* HOLIDAYS */}
      <Section title="Holidays" open={open.hols} toggle={()=>toggle('hols')}>
        <Timeline data={holidays} kind="hol"/>
      </Section>
    </ScrollView>
  );
}

/* ╔══════════════════════════════════════════════════════════╗
   ║                   SUB‑COMPONENTS                        ║
   ╚══════════════════════════════════════════════════════════╝ */
const Section = ({ title, open, toggle, children }) => (
  <View style={styles.card}>
    <TouchableOpacity style={styles.secHead} onPress={toggle} activeOpacity={0.8}>
      <Text style={styles.secTitle}>{title}</Text>
      <Text style={styles.secIcon}>{open?'▲':'▼'}</Text>
    </TouchableOpacity>
    {open && <View style={{paddingTop:12}}>{children}</View>}
  </View>
);

const BalanceCard = ({ item }) => {
  const cfg = LEAVE_TYPE[item.leave_type] || {};
  const used = item.days_taken || 0;
  const available = item.current_balance;
  const total = used + available;
  const pct = total ? (available/total)*100 : 0;
  return(
    <View style={styles.balCard}>
      <View style={styles.balHead}>
        <Text style={styles.balIcon}>{cfg.icon || '❔'}</Text>
        <Text style={styles.balType}>{cfg.label || item.leave_type}</Text>
      </View>
      <Text style={styles.balAvail}>{available.toFixed(1)} <Text style={{fontSize:13}}>days</Text></Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill,{width:`${pct}%`,backgroundColor:cfg.col||COLORS.teal}]} />
      </View>
      <View style={styles.balFoot}>
        <Text style={styles.balInfo}>Used {used}</Text>
        <Text style={styles.balInfo}>Pending {item.on_hold||0}</Text>
      </View>
    </View>
  );
};

const RequestList = ({ data, isSub }) => {
  if(!data.length) return <Text style={styles.empty}>No requests.</Text>;
  return data.map((r,i)=>{
    const cfg = LEAVE_TYPE[r.leave_type] || {};
    return(
      <View key={r.id} style={[styles.reqRow,i===data.length-1&&{borderBottomWidth:0}]}>
        {isSub && <Text style={styles.reqEmp}>{r.user?.name||`ID ${r.user_id}`}</Text>}
        <Text style={[styles.reqType,{color:cfg.col}]}>{cfg.label||r.leave_type}</Text>
        <Text style={styles.reqDates}>{moment(r.start_date).format('MMM D')} – {moment(r.end_date).format('MMM D')}</Text>
        <Status status={r.status}/>
      </View>
    );
  });
};

const Status = ({ status }) => {
  const bg = status==='Approved'?COLORS.success : status==='Pending'?COLORS.warning : COLORS.error;
  return(
    <View style={[styles.stBadge,{backgroundColor:bg}]}>
      <Text style={styles.stTxt}>{status}</Text>
    </View>
  );
};

const Timeline = ({ data, kind }) => {
  if(!data.length) return <Text style={styles.empty}>{kind==='hol'?'No holidays.':'No announcements.'}</Text>;
  return data.map(item=>(
    <View key={item.id} style={styles.timeRow}>
      <View style={styles.dot}/>
      <View style={{flex:1}}>
        <Text style={styles.timeTit}>{kind==='hol'?item.name:item.title}</Text>
        <Text style={styles.timeDate}>
          {moment(kind==='hol'?item.holiday_date:item.created_at).format('ddd, MMM D YYYY')}
        </Text>
        {kind==='ann' && <Text style={styles.timeMsg}>{item.message}</Text>}
      </View>
    </View>
  ));
};

/* ╔══════════════════════════════════════════════════════════╗
   ║                      STYLES                             ║
   ╚══════════════════════════════════════════════════════════╝ */
const styles = StyleSheet.create({
  /* General wrappers */
  wrapper:{flex:1,backgroundColor:COLORS.background},
  loadingBox:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.background},
  loadTxt:{marginTop:12,color:COLORS.teal},
  empty:{textAlign:'center',color:COLORS.text,opacity:0.5,paddingVertical:8},

  /* Header */
  header:{paddingTop:50,paddingBottom:30,paddingHorizontal:24,borderBottomLeftRadius:30,borderBottomRightRadius:30},
  headRow:{flexDirection:'row',alignItems:'center'},
  avatar:{width:70,height:70,borderRadius:35,backgroundColor:COLORS.white,justifyContent:'center',alignItems:'center',marginRight:16,elevation:4},
  avatarTxt:{fontSize:32,fontWeight:'700',color:COLORS.primary},
  dateTxt:{fontSize:13,color:'rgba(255,255,255,0.7)'},
  nameTxt:{fontSize:22,fontWeight:'700',color:COLORS.white},
  roleTxt:{fontSize:13,color:'rgba(255,255,255,0.9)'},

  /* Card */
  card:{backgroundColor:COLORS.white,borderRadius:16,marginHorizontal:16,marginVertical:10,padding:16,elevation:3},
  cardTitle:{fontSize:18,fontWeight:'600',color:COLORS.primary,marginBottom:6},

  /* Attendance */
  attMsg:{textAlign:'center',fontWeight:'600',marginBottom:6},
  locTxt:{fontSize:13,color:COLORS.text},
  outRange:{fontSize:13,color:COLORS.error,marginTop:2},
  mapBox:{height:150,borderRadius:12,overflow:'hidden',marginVertical:10},
  punchBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:12,borderRadius:12},
  punchIcon:{fontSize:18,color:COLORS.white,marginRight:8},
  punchTxt:{fontSize:16,fontWeight:'600',color:COLORS.white},

  /* Collapsible section header */
  secHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  secTitle:{fontSize:17,fontWeight:'600',color:COLORS.primary},
  secIcon:{fontSize:16,color:COLORS.text},

  /* Balance card */
  balCard:{width:160,backgroundColor:'#f6f8fb',borderRadius:12,padding:12,marginHorizontal:4,borderWidth:1,borderColor:COLORS.border},
  balHead:{flexDirection:'row',alignItems:'center',marginBottom:6},
  balIcon:{fontSize:20,marginRight:6},
  balType:{fontSize:14,fontWeight:'600',color:COLORS.text},
  balAvail:{fontSize:24,fontWeight:'700',color:COLORS.text},
  barBg:{height:6,backgroundColor:COLORS.border,borderRadius:3,overflow:'hidden',marginVertical:6},
  barFill:{height:'100%'},
  balFoot:{flexDirection:'row',justifyContent:'space-between'},
  balInfo:{fontSize:11,color:COLORS.text},

  /* Requests */
  reqRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:COLORS.border,paddingVertical:10},
  reqEmp:{flex:1.3,fontSize:14,fontWeight:'600',color:COLORS.text},
  reqType:{flex:1,fontSize:14,fontWeight:'600'},
  reqDates:{flex:1.2,fontSize:13,color:COLORS.text},
  stBadge:{borderRadius:20,minWidth:80,alignItems:'center',paddingVertical:4},
  stTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},

  /* Timeline */
  timeRow:{flexDirection:'row',paddingBottom:20},
  dot:{width:10,height:10,borderRadius:5,backgroundColor:COLORS.secondary,marginTop:4,marginRight:12},
  timeTit:{fontSize:15,fontWeight:'600',color:COLORS.text},
  timeDate:{fontSize:12,color:COLORS.text,opacity:0.6},
  timeMsg:{fontSize:13,color:COLORS.text,marginTop:2},
});
