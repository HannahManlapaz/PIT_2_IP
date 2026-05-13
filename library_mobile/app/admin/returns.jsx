/**
 * AdminReturnVerification → returns.jsx
 * Save at: app/admin/returns.jsx
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getPendingReturns, verifyReturn, rejectReturn } from '../../lib/api';

const C = {
  bg:       '#faf7f2',
  white:    '#ffffff',
  border:   '#cfc4aa',
  cream:    '#e2d9c4',
  textDark: '#1a1209',
  textMid:  '#3d2f1a',
  textMuted:'#7a6a52',
  green:    '#16a34a',
  greenDark:'#15803d',
  red:      '#dc2626',
  redDark:  '#b91c1c',
  overlay:  'rgba(0,0,0,0.5)',
};

export default function ReturnsScreen() {
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // Verify modal
  const [verifyingLoan, setVerifyingLoan] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Reject modal
  const [rejectingLoan, setRejectingLoan] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadPendingReturns = async (silent = false) => {
    if (silent) setRefreshing(true);  // ✅ silent = background refresh
    else setLoading(true);
    try {
      const data = await getPendingReturns();
      setPendingReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load pending returns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
};

  useEffect(() => { loadPendingReturns(); }, []);

  useFocusEffect(
  useCallback(() => {
    loadPendingReturns(true); 
  }, [])
)
  const handleVerify = async () => {
    if (!verifyingLoan) return;
    setActionLoading(true);
    try {
      await verifyReturn(verifyingLoan.id, verifyNotes);
      setVerifyingLoan(null);
      setVerifyNotes('');
      await loadPendingReturns();
    } catch {
      Alert.alert('Error', 'Failed to verify return.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingLoan || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectReturn(rejectingLoan.id, rejectReason);
      setRejectingLoan(null);
      setRejectReason('');
      await loadPendingReturns();
    } catch {
      Alert.alert('Error', 'Failed to reject return.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardInfo}>
          <Text style={s.bookTitle}>{item.book_title}</Text>
          <Text style={s.cardSub}>Borrower: {item.member_name}</Text>
          <Text style={s.cardDate}>Requested: {item.return_requested_date}</Text>
        </View>
        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.green }]}
            onPress={() => { setVerifyingLoan(item); setVerifyNotes(''); }}
          >
            <Text style={s.actionBtnText}>✓ Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.red }]}
            onPress={() => { setRejectingLoan(item); setRejectReason(''); }}
          >
            <Text style={s.actionBtnText}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <Text style={s.headerTitle}>Pending Return Verifications</Text>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.textMuted} />
          <Text style={s.loadingText}>Loading pending returns…</Text>
        </View>
      ) : pendingReturns.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>✅</Text>
          <Text style={s.emptyText}>No pending return requests.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingReturns}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Verify Modal ── */}
      <Modal
        visible={!!verifyingLoan}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyingLoan(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Confirm Return</Text>
            <Text style={s.modalSub}>
              Confirm that the physical book has been received.
            </Text>

            <View style={s.infoBox}>
              <Text style={s.infoLine}>
                <Text style={s.infoLabel}>Book: </Text>
                <Text style={s.infoValue}>{verifyingLoan?.book_title}</Text>
              </Text>
              <Text style={s.infoLine}>
                <Text style={s.infoLabel}>Borrower: </Text>
                <Text style={s.infoValue}>{verifyingLoan?.member_name}</Text>
              </Text>
            </View>

            <TextInput
              style={s.textarea}
              placeholder="Optional notes (condition, remarks…)"
              placeholderTextColor={C.textMuted}
              value={verifyNotes}
              onChangeText={setVerifyNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setVerifyingLoan(null)}
                disabled={actionLoading}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: C.green }, actionLoading && s.disabledBtn]}
                onPress={handleVerify}
                disabled={actionLoading}
              >
                <Text style={s.confirmBtnText}>
                  {actionLoading ? 'Confirming…' : 'Confirm Verification'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        visible={!!rejectingLoan}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingLoan(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={[s.modalTitle, { color: C.red }]}>Reject Return</Text>
            <Text style={s.modalSub}>
              The borrower will be notified and can re-submit their return request.
            </Text>

            <View style={s.infoBox}>
              <Text style={s.infoLine}>
                <Text style={s.infoLabel}>Book: </Text>
                <Text style={s.infoValue}>{rejectingLoan?.book_title}</Text>
              </Text>
              <Text style={s.infoLine}>
                <Text style={s.infoLabel}>Borrower: </Text>
                <Text style={s.infoValue}>{rejectingLoan?.member_name}</Text>
              </Text>
            </View>

            <Text style={s.fieldLabel}>
              Reason for rejection <Text style={{ color: C.red }}>*</Text>
            </Text>
            <TextInput
              style={s.textarea}
              placeholder="e.g. Book not physically received, damaged condition, wrong book…"
              placeholderTextColor={C.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {rejectReason.trim() === '' && (
              <Text style={s.errorText}>A reason is required.</Text>
            )}

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setRejectingLoan(null)}
                disabled={actionLoading}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  { backgroundColor: C.red },
                  (actionLoading || rejectReason.trim() === '') && s.disabledBtn,
                ]}
                onPress={handleReject}
                disabled={actionLoading || rejectReason.trim() === ''}
              >
                <Text style={s.confirmBtnText}>
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.cream,
    backgroundColor: C.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: C.textDark,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textDark,
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: C.border,
  },
  btnRow: {
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: C.textMuted,
    fontStyle: 'italic',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: C.textMuted,
    fontStyle: 'italic',
    fontSize: 15,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.textDark,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 14,
  },
  infoBox: {
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cream,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  infoLine: {
    fontSize: 13,
  },
  infoLabel: {
    color: C.textMuted,
  },
  infoValue: {
    fontWeight: '700',
    color: C.textDark,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMid,
    marginBottom: 6,
  },
  textarea: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    padding: 10,
    fontSize: 13,
    color: C.textDark,
    backgroundColor: C.white,
    minHeight: 80,
  },
  errorText: {
    fontSize: 11,
    color: C.red,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
  },
  cancelBtnText: {
    fontSize: 13,
    color: C.textMid,
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  disabledBtn: {
    opacity: 0.55,
  },
});