import React, { useEffect, useState, useMemo } from 'react';
import { View, Linking, StyleSheet, ScrollView, FlatList } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    Menu,
    Portal,
    Searchbar,
    Text,
} from 'react-native-paper';
import api from '../../../services/api';

// Use Icons from `@expo/vector-icons` or `react-native-vector-icons`
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Navigation
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens for each tab
import HRVacationRequestsScreen from './HRVacationRequestsScreen';
import HrAdminFinalApprovalsScreen from './HrAdminFinalApprovalsScreen';
import HRAdminMyRequestsScreen from './HRAdminMyRequestsScreen';
import ExitEntryRequestHRScreen from './ExitEntryRequestHRScreen';
import HRAdminExitEntryRequestsScreen from './HRAdminExitEntryRequestsScreen';

const Tab = createBottomTabNavigator();

export default function VactionsScreenHRScreen() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHrStatus, setSelectedHrStatus] = useState('Pending');
    const [selectedStatus, setSelectedStatus] = useState('Approved');
    const [menuVisible, setMenuVisible] = useState(false);

    useEffect(() => {
        fetchFinalRequests();
    }, []);

    const fetchFinalRequests = () => {
        setLoading(true);
        api
            .get('/admin/vacation-requests2/index')
            .then(res => setRequests(res.data || []))
            .catch(err => console.error('Failed to fetch final approval requests:', err))
            .finally(() => setLoading(false));
    };

    const filtered = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return requests
            .filter(r =>
                (r.user?.name + ' ' + r.leave_type).toLowerCase().includes(lower),
            )
            .filter(r => selectedHrStatus === 'All' || r.hr_status === selectedHrStatus)
            .filter(r => selectedStatus === 'All' || r.status === selectedStatus);
    }, [requests, searchTerm, selectedHrStatus, selectedStatus]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));

    const updateRequest = (id, status, hr_status) =>
        api
            .patch(`/admin/vacation-requests/${id}`, { status, hr_status })
            .then(fetchFinalRequests)
            .catch(err => console.error('Update failed:', err));

    const handleApprove = id => updateRequest(id, 'Approved', 'Approved');
    const handleReject = id => updateRequest(id, 'Rejected', 'Rejected');

    const renderRequestCard = ({ item }) => (
        <Card style={styles.card} key={item.id}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                        {item.user?.name || '—'}
                    </Text>
                    <Chip style={styles.typeChip} textStyle={styles.chipText}>
                        {item.leave_type}
                    </Chip>
                </View>

                <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Start: </Text>
                    <Text style={styles.dateValue}>{item.start_date}</Text>
                    <Text style={styles.dateLabel}>End: </Text>
                    <Text style={styles.dateValue}>{item.end_date}</Text>
                </View>

                <View style={styles.statusRow}>
                    <View style={styles.statusContainer}>
                        <Text variant="labelSmall">HR Status</Text>
                        <Chip style={[styles.statusChip, styles.chip(item.hr_status)]} textStyle={styles.chipText}>
                            {item.hr_status}
                        </Chip>
                    </View>

                    <View style={styles.statusContainer}>
                        <Text variant="labelSmall">Mgr Status</Text>
                        <Chip style={[styles.statusChip, styles.chip(item.status)]} textStyle={styles.chipText}>
                            {item.status}
                        </Chip>
                    </View>
                </View>
            </Card.Content>

            <Card.Actions style={styles.cardActions}>
                {item.hr_status === 'Pending' && item.status === 'Approved' && (
                    <>
                        <Button
                            mode="contained"
                            icon="check"
                            style={styles.approveButton}
                            onPress={() => handleApprove(item.id)}
                        >
                            Approve
                        </Button>
                        <Button
                            mode="outlined"
                            icon="close"
                            style={styles.rejectButton}
                            onPress={() => handleReject(item.id)}
                        >
                            Reject
                        </Button>
                    </>
                )}
                <Button
                    mode="text"
                    icon="eye"
                    onPress={() => setViewRequest(item)}
                >
                    Details
                </Button>
            </Card.Actions>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 8 }}>Loading final approval requests…</Text>
            </View>
        );
    }

    return (
  <Tab.Navigator
    screenOptions={{
      headerShown: false, // ✅ Hides the top header title for all tabs
      tabBarShowLabel: true, // you can also hide tab labels if needed
    }}
  >
            <Tab.Screen
                name="My Requests"
                component={HRAdminMyRequestsScreen}
                options={{
                    tabBarIcon: () => <MaterialCommunityIcons name="account-circle" size={24} />,
                }}
            />
            <Tab.Screen
                name="Manager Requests"
                component={HRVacationRequestsScreen}
                options={{
                    tabBarIcon: () => <MaterialCommunityIcons name="account-group" size={24} />,
                }}
                
            />
            <Tab.Screen
                name="Final Approvals"
                component={HrAdminFinalApprovalsScreen}
                options={{
                    tabBarIcon: () => <MaterialCommunityIcons name="check-circle-outline" size={24} />,
                }}
            />
            <Tab.Screen
                name="Exit/Entry Requests"
                component={HRAdminExitEntryRequestsScreen}
                options={{
                    tabBarIcon: () => <MaterialCommunityIcons name="airplane-takeoff" size={24} />,
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    // Add all your styles here
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        marginBottom: 16,
        borderRadius: 12,
        elevation: 2,
        backgroundColor: 'white',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontWeight: 'bold',
        flexShrink: 1,
        marginRight: 8,
    },
    typeChip: {
        backgroundColor: '#e0f7fa',
    },
    dateRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dateLabel: {
        fontWeight: 'bold',
        marginRight: 4,
    },
    dateValue: {
        marginRight: 16,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statusContainer: {
        alignItems: 'center',
    },
    statusChip: {
        marginTop: 4,
        minWidth: 100,
        justifyContent: 'center',
    },
    cardActions: {
        justifyContent: 'flex-end',
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    approveButton: {
        backgroundColor: '#4caf50',
        marginRight: 8,
    },
    rejectButton: {
        borderColor: '#f44336',
        marginRight: 8,
    },
    chipText: {
        color: 'white',
        fontSize: 12,
    },
    chip: status => ({
        backgroundColor:
            status === 'Approved'
                ? '#4caf50'
                : status === 'Rejected'
                    ? '#f44336'
                    : status === 'Pending'
                        ? '#ff9800'
                        : '#9e9e9e',
    }),
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 8,
    },
    pageText: {
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#fafafa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
