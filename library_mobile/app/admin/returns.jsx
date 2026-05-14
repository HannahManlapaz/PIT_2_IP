// app/admin/returns.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar,
  Platform, Modal, useWindowDimensions, ScrollView,
} from 'react-native';
import { useFonts } from 'expo-font';
import { getPendingReturns, verifyReturn, rejectReturn } from '../../lib/api';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  navBg:        '#1A0F0A',
  navBorder:    'rgba(180,83,9,0.35)',
  secondary:    '#D4A373',
  parchment:    '#F5F0E1',
  cream:        '#EDE3D4',
  creamDark:    '#DDD0BC',
  surface:      '#FFFFFF',
  textPrimary:  '#2C1810',
  textSecondary:'#6B4C3A',
  textMuted:    '#9C7A5A',
  green50:      '#F0FDF4',
  green300:     '#86EFAC',
  green600:     '#16A34A',
  red50:        '#FEF2F2',
  red300:       '#FCA5A5',
  red600:       '#DC2626',
  amber50:      '#FFFBEB',
  amber300:     '#FCD34D',
  amber700:     '#B45309',
  error:        '#B22222',
};

const FONTS = {
  logo:    'AllrounderMonumentTest-Medium',
  heading: 'LibreBaskerville-SemiBold',
  body:    'LibreBaskerville-Regular',
  medium:  'LibreBaskerville-Medium',
  italic:  'LibreBaskerville-Italic',
};

// ── Ornamental divider ────────────────────────────────────────────────────────
const OrnamentalDivider = ({ color = C.creamDark, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
    <View style={{ flex: 1, height: 1, backgroundColor: color + '80' }} />
    <Text style={{ color, fontSize: 9, letterSpacing: 2 }}>✦</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: color + '80' }} />
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReturnsScreen() {
  // ── useWindowDimensions re-renders on resize/rotation ─────────────────────
  const { width: W } = useWindowDimensions();
  const isWide   = W >= 768;   // tablet / desktop
  const isMedium = W >= 480;   // large phone / small tablet

  const [fontsLoaded] = useFonts({
    'AllrounderMonumentTest-Medium': require('../../assets/fonts/AllrounderMonumentTest-Medium.ttf'),
    'LibreBaskerville-Regular':      require('../../assets/fonts/LibreBaskerville-Regular.ttf'),
    'LibreBaskerville-Medium':       require('../../assets/fonts/LibreBaskerville-Medium.ttf'),
    'LibreBaskerville-SemiBold':     require('../../assets/fonts/LibreBaskerville-SemiBold.ttf'),
    'LibreBaskerville-Italic':       require('../../assets/fonts/LibreBaskerville-Italic.ttf'),
  });

  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [search,         setSearch]         = useState('');
  const [verifyingLoan,  setVerifyingLoan]  = useState(null);
  const [verifyNotes,    setVerifyNotes]    = useState('');
  const [rejectingLoan,  setRejectingLoan]  = useState(null);
  const [rejectReason,   setRejectReason]   = useState('');
  const [actionLoading,  setActionLoading]  = useState(false);
  const [actionError,    setActionError]    = useState('');

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else        setLoading(true);
    try {
      const data = await getPendingReturns();
      setPendingReturns(Array.isArray(data) ? data : []);
    } catch { /* silent fail */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(true); }, []));

  const handleVerify = async () => {
    if (!verifyingLoan) return;
    setActionLoading(true); setActionError('');
    try {
      await verifyReturn(verifyingLoan.id, verifyNotes);
      setVerifyingLoan(null); setVerifyNotes('');
      await load(true);
    } catch { setActionError('Failed to verify return. Please try again.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectingLoan || !rejectReason.trim()) return;
    setActionLoading(true); setActionError('');
    try {
      await rejectReturn(rejectingLoan.id, rejectReason);
      setRejectingLoan(null); setRejectReason('');
      await load(true);
    } catch { setActionError('Failed to reject return. Please try again.'); }
    finally { setActionLoading(false); }
  };

  const filtered = pendingReturns.filter(item =>
    (item.book_title  ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.member_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Responsive card ────────────────────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const isOverdue = (item.overdue_days ?? 0) > 0;
    const fine      = (item.overdue_days ?? 0) * 20;

    return (
      <View style={[
        s.card,
        { backgroundColor: index % 2 === 0 ? C.surface : '#FDFAF4' },
        // On wide screens, cards sit in a 2-col grid — handled by numColumns
      ]}>
        {/* Amber left bar */}
        <View style={s.cardBar} />

        <View style={[s.cardContent, { padding: isWide ? 20 : 14 }]}>

          {/* ── Title row ── */}
          <View style={s.cardTopRow}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[s.cardBookTitle, { fontSize: isWide ? 16 : 13 }]} numberOfLines={2}>
                {item.book_title}
              </Text>
              <View style={s.pendingPill}>
                <Text style={s.pendingPillText}>⏳ Pending Verification</Text>
              </View>
            </View>
            {/* Request date — always visible, right-aligned */}
            {!!item.return_requested_date && (
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={s.dateEyebrow}>REQUESTED</Text>
                <Text style={s.dateValue}>{item.return_requested_date}</Text>
              </View>
            )}
          </View>

          <OrnamentalDivider style={{ marginVertical: 10 }} />

          {/* ── Details — 2-col on wide, 1-col on narrow ── */}
          <View style={[s.detailsGrid, isMedium && { flexDirection: 'row', flexWrap: 'wrap' }]}>

            <View style={[s.detailItem, isMedium && { width: '50%' }]}>
              <Text style={s.detailIcon}>👤</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>BORROWER</Text>
                <Text style={s.detailValue} numberOfLines={1}>{item.member_name}</Text>
              </View>
            </View>

            {!!item.loan_date && (
              <View style={[s.detailItem, isMedium && { width: '50%' }]}>
                <Text style={s.detailIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>LOAN DATE</Text>
                  <Text style={s.detailValue}>{item.loan_date}</Text>
                </View>
              </View>
            )}

            {!!item.due_date && (
              <View style={[s.detailItem, isMedium && { width: '50%' }]}>
                <Text style={s.detailIcon}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>DUE DATE</Text>
                  <Text style={[s.detailValue, isOverdue && { color: C.error, fontFamily: FONTS.medium }]}>
                    {item.due_date}
                    {isOverdue ? `  (${item.overdue_days}d late)` : ''}
                  </Text>
                </View>
              </View>
            )}

            {!!item.semester_label && (
              <View style={[s.detailItem, isMedium && { width: '50%' }]}>
                <Text style={s.detailIcon}>🗓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>SEMESTER</Text>
                  <Text style={s.detailValue}>{item.semester_label}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Overdue fine banner ── */}
          {isOverdue && (
            <View style={s.fineBanner}>
              <Text style={s.fineBannerText}>
                ⚠️  {item.overdue_days} day{item.overdue_days !== 1 ? 's' : ''} overdue — Fine: ₱{fine.toLocaleString()}
              </Text>
            </View>
          )}

          {/* ── Action buttons ── */}
          <View style={[s.cardActions, isMedium && { flexDirection: 'row' }]}>
            <TouchableOpacity
              style={[s.verifyBtn, isMedium && { flex: 1 }]}
              onPress={() => { setVerifyingLoan(item); setVerifyNotes(''); setActionError(''); }}
              activeOpacity={0.85}
            >
              <Text style={s.verifyBtnText}>✓  Verify Return</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectBtn, isMedium && { flex: 0 }]}
              onPress={() => { setRejectingLoan(item); setRejectReason(''); setActionError(''); }}
              activeOpacity={0.85}
            >
              <Text style={s.rejectBtnText}>✕  Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* ── Page header ── */}
      <View style={[s.pageHeader, { paddingHorizontal: isWide ? 32 : 16 }]}>
        <View>
          <Text style={s.eyebrow}>RETURN MANAGEMENT</Text>
          <Text style={[s.headerTitle, { fontSize: isWide ? 26 : 20 }]}>
            Pending Verifications
          </Text>
        </View>
        {pendingReturns.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{pendingReturns.length}</Text>
          </View>
        )}
      </View>

      {/* ── Search ── */}
      <View style={[s.searchWrap, { paddingHorizontal: isWide ? 24 : 14 }]}>
        <View style={s.searchBar}>
          <Text style={{ fontSize: 13 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by book title or borrower…"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {!loading && (
          <Text style={s.recordCount}>
            {filtered.length} pending request{filtered.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.secondary} />
          <Text style={s.loadingText}>Retrieving pending returns…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyCircle}>
            <Text style={{ fontSize: 30 }}>✅</Text>
          </View>
          <Text style={s.emptyTitle}>{search ? 'No results found' : 'All clear!'}</Text>
          <Text style={s.emptyBody}>
            {search
              ? 'Try a different search term.'
              : 'There are no pending return verification requests at this time.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          // 2-column grid on wide screens, 1 column on phones
          key={isWide ? 'wide' : 'narrow'}
          numColumns={isWide ? 2 : 1}
          columnWrapperStyle={isWide ? { gap: 0 } : undefined}
          contentContainerStyle={[
            s.listContent,
            { paddingHorizontal: isWide ? 0 : 0 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ItemSeparatorComponent={() =>
            <View style={{ height: 1, backgroundColor: C.cream }} />
          }
        />
      )}

      {/* ══════════════════════════════════════════
          VERIFY MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={!!verifyingLoan}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyingLoan(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: isWide ? 520 : W - 32 }]}>

            <View style={[s.modalHeaderBar, { backgroundColor: C.green600 }]}>
              <Text style={s.modalHeaderText}>Confirm Book Return</Text>
            </View>

            <ScrollView
              contentContainerStyle={[s.modalBody, { gap: 14 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.modalSub}>
                Confirm that you have physically received the book from the borrower.
              </Text>

              <View style={s.modalInfoCard}>
                <View style={s.modalInfoRow}>
                  <Text style={s.modalInfoLabel}>Book</Text>
                  <Text style={s.modalInfoValue}>{verifyingLoan?.book_title}</Text>
                </View>
                <View style={s.modalInfoDivider} />
                <View style={s.modalInfoRow}>
                  <Text style={s.modalInfoLabel}>Borrower</Text>
                  <Text style={s.modalInfoValue}>{verifyingLoan?.member_name}</Text>
                </View>
                {(verifyingLoan?.overdue_days ?? 0) > 0 && (
                  <View style={s.modalFeeRow}>
                    <Text style={s.modalFeeText}>
                      ⚠️  Overdue {verifyingLoan.overdue_days}d — Fine: ₱{(verifyingLoan.overdue_days * 20).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              <View>
                <Text style={s.modalFieldLabel}>
                  Condition Notes{' '}
                  <Text style={s.modalFieldOptional}>(optional)</Text>
                </Text>
                <TextInput
                  style={s.modalTextarea}
                  placeholder="e.g. Book returned in good condition, slight wear on cover…"
                  placeholderTextColor={C.textMuted}
                  value={verifyNotes}
                  onChangeText={setVerifyNotes}
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {!!actionError && (
                <Text style={s.actionErrorText}>{actionError}</Text>
              )}

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={() => setVerifyingLoan(null)}
                  disabled={actionLoading}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirmBtn, { backgroundColor: C.green600 }, actionLoading && s.disabledBtn]}
                  onPress={handleVerify}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.modalConfirmText}>Confirm Verification</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════
          REJECT MODAL
      ══════════════════════════════════════════ */}
      <Modal
        visible={!!rejectingLoan}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingLoan(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: isWide ? 520 : W - 32 }]}>

            <View style={[s.modalHeaderBar, { backgroundColor: C.error }]}>
              <Text style={s.modalHeaderText}>Reject Return Request</Text>
            </View>

            <ScrollView
              contentContainerStyle={[s.modalBody, { gap: 14 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.modalSub}>
                The borrower will be notified and may re-submit their return request after resolving the issue.
              </Text>

              <View style={s.modalInfoCard}>
                <View style={s.modalInfoRow}>
                  <Text style={s.modalInfoLabel}>Book</Text>
                  <Text style={s.modalInfoValue}>{rejectingLoan?.book_title}</Text>
                </View>
                <View style={s.modalInfoDivider} />
                <View style={s.modalInfoRow}>
                  <Text style={s.modalInfoLabel}>Borrower</Text>
                  <Text style={s.modalInfoValue}>{rejectingLoan?.member_name}</Text>
                </View>
              </View>

              <View>
                <Text style={s.modalFieldLabel}>
                  Reason for Rejection{' '}
                  <Text style={{ color: C.error }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    s.modalTextarea,
                    rejectReason.trim() === '' && { borderColor: C.error },
                  ]}
                  placeholder="e.g. Book not physically received, damaged cover, wrong book submitted…"
                  placeholderTextColor={C.textMuted}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
                {rejectReason.trim() === '' && (
                  <Text style={s.fieldErrorText}>A reason is required before rejecting.</Text>
                )}
              </View>

              {!!actionError && (
                <Text style={s.actionErrorText}>{actionError}</Text>
              )}

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={() => setRejectingLoan(null)}
                  disabled={actionLoading}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.modalConfirmBtn,
                    { backgroundColor: C.error },
                    (actionLoading || rejectReason.trim() === '') && s.disabledBtn,
                  ]}
                  onPress={handleReject}
                  disabled={actionLoading || rejectReason.trim() === ''}
                >
                  {actionLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.modalConfirmText}>Confirm Rejection</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Static styles (non-responsive values only) ────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.parchment },

  // Header
  pageHeader: {
    backgroundColor: C.navBg,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.navBorder,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: FONTS.body,
    fontSize: 8, letterSpacing: 3,
    color: C.secondary, marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.logo,
    color: C.secondary, letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: C.amber700,
    borderRadius: 999,
    minWidth: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 17, color: '#fff',
  },

  // Search
  searchWrap: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.cream,
    paddingVertical: 10,
    gap: 5,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.parchment,
    borderRadius: 8, borderWidth: 1, borderColor: C.creamDark,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body, fontSize: 13,
    color: C.textPrimary, paddingVertical: 0,
  },
  recordCount: {
    fontFamily: FONTS.italic,
    fontSize: 11, color: C.textMuted, fontStyle: 'italic',
  },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadingText: { fontFamily: FONTS.italic, fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.green50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.green300,
  },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 16, color: C.textSecondary },
  emptyBody: {
    fontFamily: FONTS.italic, fontSize: 13,
    color: C.textMuted, textAlign: 'center', maxWidth: 300, fontStyle: 'italic',
  },

  // List
  listContent: { paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row',
    flex: 1,                        // needed for 2-col grid on wide
    borderBottomWidth: 1,
    borderBottomColor: C.cream,
  },
  cardBar: { width: 4, backgroundColor: C.amber700, flexShrink: 0 },
  cardContent: { flex: 1 },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 10,
  },
  cardBookTitle: {
    fontFamily: FONTS.heading,
    color: C.textPrimary, lineHeight: 20,
  },
  pendingPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.amber50,
    borderWidth: 1, borderColor: C.amber300,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  pendingPillText: { fontFamily: FONTS.medium, fontSize: 10, color: C.amber700 },
  dateEyebrow: {
    fontFamily: FONTS.body, fontSize: 8,
    color: C.textMuted, letterSpacing: 1.2, textAlign: 'right',
  },
  dateValue: { fontFamily: FONTS.medium, fontSize: 11, color: C.textSecondary, textAlign: 'right' },

  // Details grid
  detailsGrid: { gap: 8, marginBottom: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingRight: 8 },
  detailIcon: { fontSize: 12, marginTop: 1 },
  detailLabel: { fontFamily: FONTS.body, fontSize: 8, color: C.textMuted, letterSpacing: 1.2, marginBottom: 1 },
  detailValue: { fontFamily: FONTS.medium, fontSize: 12, color: C.textSecondary },

  // Fine banner
  fineBanner: {
    backgroundColor: C.red50,
    borderWidth: 1, borderColor: C.red300,
    borderRadius: 6, padding: 8, marginTop: 6,
  },
  fineBannerText: { fontFamily: FONTS.medium, fontSize: 11, color: C.error },

  // Card actions
  cardActions: {
    gap: 8, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.cream,
  },
  verifyBtn: {
    backgroundColor: C.green600,
    borderRadius: 7, paddingVertical: 10,
    alignItems: 'center',
  },
  verifyBtnText: { fontFamily: FONTS.heading, fontSize: 12, color: '#fff', letterSpacing: 0.3 },
  rejectBtn: {
    paddingHorizontal: 18,
    backgroundColor: C.red50,
    borderWidth: 1, borderColor: C.red300,
    borderRadius: 7, paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: { fontFamily: FONTS.heading, fontSize: 12, color: C.error, letterSpacing: 0.3 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeaderBar: { paddingHorizontal: 20, paddingVertical: 14 },
  modalHeaderText: { fontFamily: FONTS.heading, fontSize: 15, color: '#fff', letterSpacing: 0.5 },
  modalBody: { padding: 18 },
  modalSub: {
    fontFamily: FONTS.italic, fontSize: 12,
    color: C.textMuted, lineHeight: 18, fontStyle: 'italic',
  },
  modalInfoCard: {
    backgroundColor: C.parchment,
    borderRadius: 8, borderWidth: 1, borderColor: C.creamDark, padding: 14,
  },
  modalInfoRow:    { flexDirection: 'row', gap: 10 },
  modalInfoDivider:{ height: 1, backgroundColor: C.cream, marginVertical: 8 },
  modalInfoLabel:  { fontFamily: FONTS.body, fontSize: 10, color: C.textMuted, width: 60, paddingTop: 2 },
  modalInfoValue:  { fontFamily: FONTS.medium, fontSize: 13, color: C.textPrimary, flex: 1 },
  modalFeeRow:     { marginTop: 10, backgroundColor: C.red50, borderRadius: 5, padding: 8, borderWidth: 1, borderColor: C.red300 },
  modalFeeText:    { fontFamily: FONTS.medium, fontSize: 11, color: C.error },
  modalFieldLabel: { fontFamily: FONTS.medium, fontSize: 12, color: C.textSecondary, marginBottom: 6 },
  modalFieldOptional: { fontFamily: FONTS.italic, fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
  modalTextarea: {
    backgroundColor: C.parchment,
    borderWidth: 1, borderColor: C.creamDark,
    borderRadius: 7, padding: 12,
    fontFamily: FONTS.body, fontSize: 13,
    color: C.textPrimary, minHeight: 80,
  },
  fieldErrorText:  { fontFamily: FONTS.italic, fontSize: 11, color: C.error, marginTop: 4, fontStyle: 'italic' },
  actionErrorText: {
    fontFamily: FONTS.italic, fontSize: 12, color: C.error,
    backgroundColor: C.red50, padding: 8, borderRadius: 5, fontStyle: 'italic',
  },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: C.creamDark, borderRadius: 7,
  },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: 13, color: C.textMuted },
  modalConfirmBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 7, alignItems: 'center', minWidth: 140,
  },
  modalConfirmText: { fontFamily: FONTS.heading, fontSize: 13, color: '#fff', letterSpacing: 0.3 },
  disabledBtn: { opacity: 0.5 },
});