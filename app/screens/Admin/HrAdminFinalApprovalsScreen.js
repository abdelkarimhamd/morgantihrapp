// HrAdminFinalApprovalsScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Linking, StyleSheet, ScrollView, FlatList } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    IconButton,
    Menu,
    Paragraph,
    Portal,
    Provider as PaperProvider,
    Searchbar,
    Text,
    TextInput,
} from 'react-native-paper';
import api from '../../../services/api';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

export default function HrAdminFinalApprovalsScreen() {
    /* ────── STATE ────── */
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // search + filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHrStatus, setSelectedHrStatus] = useState('Pending');
    const [selectedStatus, setSelectedStatus] = useState('Approved');
    const [menuVisible, setMenuVisible] = useState(false);

    // pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // modal
    const [viewRequest, setViewRequest] = useState(null);

    /* ────── DATA FETCH ────── */
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

    /* ────── ACTIONS ────── */
    const updateRequest = (id, status, hr_status) =>
        api
            .patch(`/admin/vacation-requests/${id}`, { status, hr_status })
            .then(fetchFinalRequests)
            .catch(err => console.error('Update failed:', err));

    const handleApprove = id => updateRequest(id, 'Approved', 'Approved');
    const handleReject = id => updateRequest(id, 'Rejected', 'Rejected');

    /* ────── SEARCH + FILTER + PAGINATION ────── */
    const filtered = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return requests
            .filter(r =>
                (r.user?.name + ' ' + r.leave_type).toLowerCase().includes(lower),
            )
            .filter(r => selectedHrStatus === 'All' || r.hr_status === selectedHrStatus)
            .filter(r => selectedStatus === 'All' || r.status === selectedStatus);
    }, [requests, searchTerm, selectedHrStatus, selectedStatus]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const paginated = filtered.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    /* ────── RENDER ITEM ────── */
    const renderRequestCard = ({ item }) => (
        <Card style={styles.card} key={item.id}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                        {item.user?.name || '—'}
                    </Text>
                    <Chip
                        style={styles.typeChip}
                        textStyle={styles.chipText}
                    >
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
                        <Chip
                            style={[styles.statusChip, styles.chip(item.hr_status)]}
                            textStyle={styles.chipText}
                        >
                            {item.hr_status}
                        </Chip>
                    </View>

                    <View style={styles.statusContainer}>
                        <Text variant="labelSmall">Mgr Status</Text>
                        <Chip
                            style={[styles.statusChip, styles.chip(item.status)]}
                            textStyle={styles.chipText}
                        >
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
        <PaperProvider>
            <ScrollView contentContainerStyle={styles.container}>
                {/* ╭─ HERO ────────────────────────╮ */}
                <View style={styles.hero}>
                    <Text variant="headlineMedium" style={styles.heroTitle}>
                        Final Approval Requests
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Manage requests that were manager-approved and now require HR action
                    </Text>
                </View>

                {/* ╭─ SEARCH + FILTERS ─╮*/}
                {/* ╭─ SEARCH + FILTERS ─╮*/}
                <View style={styles.controls}>
                    <Searchbar
                        placeholder="Search (Employee / Leave Type)"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        style={styles.search}
                    />

                    <View style={styles.filterRow}>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    icon="filter"
                                    onPress={() => setMenuVisible(true)}
                                    style={styles.filterButton}
                                >
                                    Filters
                                </Button>
                            }
                        >
                            <Menu.Item
                                title="HR Status"
                                titleStyle={styles.menuTitle}
                            />
                            <View style={styles.menuGroup}>
                                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                                    <Chip
                                        key={`hr-${status}`}
                                        mode={selectedHrStatus === status ? 'flat' : 'outlined'}
                                        selected={selectedHrStatus === status}
                                        onPress={() => {
                                            setSelectedHrStatus(status);
                                            setPage(0);
                                            setMenuVisible(false);
                                        }}
                                        style={styles.filterChip}
                                    >
                                        {status}
                                    </Chip>
                                ))}
                            </View>

                            <Menu.Item
                                title="Manager Status"
                                titleStyle={styles.menuTitle}
                            />
                            <View style={styles.menuGroup}>
                                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                                    <Chip
                                        key={`mgr-${status}`}
                                        mode={selectedStatus === status ? 'flat' : 'outlined'}
                                        selected={selectedStatus === status}
                                        onPress={() => {
                                            setSelectedStatus(status);
                                            setPage(0);
                                            setMenuVisible(false);
                                        }}
                                        style={styles.filterChip}
                                    >
                                        {status}
                                    </Chip>
                                ))}
                            </View>
                        </Menu>

                        <View style={styles.paginationInfo}>
                            <Text variant="bodySmall">
                                Showing {Math.min(rowsPerPage, filtered.length)} of {filtered.length} requests
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ╭─ REQUEST CARDS ────────────────╮ */}
                {paginated.length > 0 ? (
                    <FlatList
                        data={paginated}
                        renderItem={renderRequestCard}
                        keyExtractor={item => item.id.toString()}
                        scrollEnabled={false}
                        contentContainerStyle={styles.listContainer}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No requests found</Text>
                    </View>
                )}

                {/* ╭─ PAGINATION ──────────────────╮ */}
                <View style={styles.paginationContainer}>
                    <Button
                        mode="outlined"
                        disabled={page === 0}
                        onPress={() => setPage(p => Math.max(0, p - 1))}
                    >
                        Previous
                    </Button>

                    <Text style={styles.pageText}>
                        Page {page + 1} of {totalPages}
                    </Text>

                    <Button
                        mode="outlined"
                        disabled={page >= totalPages - 1}
                        onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    >
                        Next
                    </Button>
                </View>
            </ScrollView>

            {/* ╭─ DETAILS MODAL ─────────────────╮ */}
            <Portal>
                <Dialog
                    visible={!!viewRequest}
                    onDismiss={() => setViewRequest(null)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={styles.dialogTitle}>
                        Vacation Request Details
                    </Dialog.Title>

                    {viewRequest && (
                        <Dialog.Content>
                            <DetailRow label="Employee" value={viewRequest.user?.name || 'N/A'} />
                            <DetailRow label="Leave Type" value={viewRequest.leave_type} />
                            <DetailRow label="Start Date" value={viewRequest.start_date} />
                            <DetailRow label="End Date" value={viewRequest.end_date} />
                            <DetailRow label="HR Status" value={viewRequest.hr_status || 'Not finalized'} />
                            <DetailRow label="Manager Status" value={viewRequest.status} />

                            {/* Attachments */}
                            <Text variant="titleSmall" style={styles.attachmentsTitle}>
                                Attachments
                            </Text>

                            {viewRequest.attachments?.length ? (
                                viewRequest.attachments.map((att, idx) => (
                                    <Button
                                        key={idx}
                                        icon="file"
                                        mode="outlined"
                                        style={styles.attachmentButton}
                                        onPress={() => Linking.openURL(`/storage/${att.file_path}`)}
                                    >
                                        Attachment {idx + 1}
                                    </Button>
                                ))
                            ) : (
                                <Text style={styles.noAttachments}>No attachments</Text>
                            )}
                        </Dialog.Content>
                    )}

                    <Dialog.Actions>
                        <Button
                            mode="contained"
                            onPress={() => setViewRequest(null)}
                            style={styles.closeButton}
                        >
                            Close
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </PaperProvider>
    );
}

// Helper component for detail rows
const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

/* ────── STYLES ────── */
const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 32,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Hero section
    hero: {
        backgroundColor: '#1f3d7c',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    heroTitle: {
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        maxWidth: '90%',
    },

    // Controls
    controls: {
        marginBottom: 16,
    },
    search: {
        marginBottom: 12,
        backgroundColor: 'white',
        elevation: 2,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    filterButton: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    paginationInfo: {
        alignItems: 'flex-end',
        flex: 1,
    },

    // Filter menu
    menuTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        paddingVertical: 8,
    },
    menuGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    filterChip: {
        marginRight: 8,
        marginBottom: 8,
    },

    // Cards
    listContainer: {
        paddingBottom: 16,
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

    // Status chips
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
    chipText: {
        color: 'white',
        fontSize: 12,
    },

    // Pagination
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

    // Empty state
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

    // Dialog
    dialog: {
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    dialogTitle: {
        backgroundColor: '#1f3d7c',
        color: 'white',
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailLabel: {
        fontWeight: 'bold',
        width: 120,
    },
    detailValue: {
        flex: 1,
    },
    attachmentsTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    attachmentButton: {
        marginBottom: 8,
    },
    noAttachments: {
        fontStyle: 'italic',
        color: '#666',
    },
    closeButton: {
        backgroundColor: '#1f3d7c',
        margin: 16,
    },
});