// app/admin/loans.jsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getLoans, createLoan, updateLoan, deleteLoan, getMembers, getBooks, verifyReturn, rejectReturn } from '../../lib/api';
import BottomSheetModal, { ModalCancelButton, ModalSubmitButton } from '../../lib/BottomSheetModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  bg:       '#f5f0e8',
  cream:    '#ede5d0',
  border:   '#cfc4aa',
  textDark: '#1a1209',
  textMid:  '#3d2f1a',
  textMuted:'#7a6a52',
  red:      '#6b1d2a',
  white:    '#ffffff',
  green50:  '#f0fdf4',
  green300: '#86efac',
  green600: '#16a34a',
  green700: '#15803d',
  red50:    '#fef2f2',
  red300:   '#fca5a5',
  red600:   '#dc2626',
  red700:   '#b91c1c',
  blue50:   '#eff6ff',
  blue300:  '#93c5fd',
  blue700:  '#1d4ed8',
  yellow50: '#fefce8',
  yellow100:'#fef9c3',
  yellow300:'#fde047',
  yellow600:'#ca8a04',
  yellow700:'#a16207',
};

const today = () => new Date().toISOString().split('T')[0];
const emptyLoan = () => ({ member: 0, book: 0, loan_date: today(), due_date: null, return_date: null });
const FEE_PER_DAY = 20;

// ── Date field — plain TextInput (works on web + native) ──────────────────────
const DateField = ({ label, value, onChange, hint }) => (
  <View style={s.fieldWrap}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={s.input}
      value={value ?? ''}
      onChangeText={v => onChange(v || null)}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={C.textMuted}
    />
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────
const LoanTable = () => {
  const [loans,         setLoans]         = useState([]);
  const [members,       setMembers]       = useState([]);
  const [books,         setBooks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState('all');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [verifyModal,   setVerifyModal]   = useState(null);
  const [verifyNotes,   setVerifyNotes]   = useState('');
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [form,          setForm]          = useState(emptyLoan());
  const [saving,        setSaving]        = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [collapsedMembers, setCollapsedMembers] = useState(new Set());

  const load = async () => {
    try {
      setLoading(true);
      const [l, m, b] = await Promise.all([getLoans(), getMembers(), getBooks()]);
      setLoans(Array.isArray(l) ? l : []);
      setMembers(Array.isArray(m) ? m : []);
      setBooks(Array.isArray(b) ? b : []);
      setCollapsedMembers(new Set((Array.isArray(l) ? l : []).map(loan => loan.member)));
    } catch { setError('Failed to load loans.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyLoan()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (loan) => {
    setForm({ member: loan.member, book: loan.book, loan_date: loan.loan_date, due_date: loan.due_date, return_date: loan.return_date });
    setEditing(loan); setError(''); setShowForm(true);
  };

  const handleVerify = async () => {
    if (!verifyModal) return;
    setActionLoading(true);
    try { await verifyReturn(verifyModal.id, verifyNotes); setVerifyModal(null); setVerifyNotes(''); await load(); }
    catch (err) { setError(err?.message || 'Failed to verify return.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try { await rejectReturn(rejectModal.id, rejectReason); setRejectModal(null); setRejectReason(''); await load(); }
    catch (err) { setError(err?.message || 'Failed to reject return.'); }
    finally { setActionLoading(false); }
  };

  const handleSave = async () => {
    if (!form.member || !form.book) { setError('Member and book are required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateLoan(editing.id, form); else await createLoan(form);
      setShowForm(false); await load();
    } catch (e) { setError(e?.message || 'Failed to save loan.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteLoan(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete loan.'); }
  };

  const memberName = (id) => members.find(m => m.id === id)?.name ?? '—';
  const bookTitle  = (id) => books.find(b => b.id === id)?.title ?? '—';
  const isOverdue  = (loan) => !loan.return_verified_date && (loan.overdue_days ?? 0) > 0;
  const isPending  = (loan) => !!loan.return_requested_date && !loan.return_verified_date && loan.return_status === 'pending';
  const overdueFee = (loan) => (loan.overdue_days ?? 0) * FEE_PER_DAY;

  const filtered = loans
    .filter(l => {
      if (filter === 'active')   return !l.return_verified_date && !isOverdue(l) && !isPending(l);
      if (filter === 'returned') return !!l.return_verified_date;
      if (filter === 'overdue')  return isOverdue(l);
      if (filter === 'pending')  return isPending(l);
      return true;
    })
    .filter(l =>
      memberName(l.member).toLowerCase().includes(search.toLowerCase()) ||
      bookTitle(l.book).toLowerCase().includes(search.toLowerCase())
    );

  const grouped = filtered.reduce((acc, loan) => {
    const g = acc.find(x => x.memberId === loan.member);
    if (g) g.loans.push(loan);
    else acc.push({ memberId: loan.member, loans: [loan] });
    return acc;
  }, []);

  const toggleCollapse = (memberId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedMembers(prev => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  };

  const overdueCount = loans.filter(isOverdue).length;
  const pendingCount = loans.filter(isPending).length;

  const StatusBadge = ({ loan }) => {
    const overdue = isOverdue(loan);
    const pending = isPending(loan);
    if (loan.return_verified_date) return (
      <View style={[s.badge, { backgroundColor: C.green50, borderColor: C.green300 }]}>
        <Text style={[s.badgeText, { color: C.green700 }]}>Returned</Text>
      </View>
    );
    if (pending) return (
      <View style={[s.badge, { backgroundColor: C.yellow100, borderColor: C.yellow300 }]}>
        <Text style={[s.badgeText, { color: C.yellow700 }]}>Pending</Text>
      </View>
    );
    if (overdue) return (
      <View style={{ gap: 2 }}>
        <View style={[s.badge, { backgroundColor: C.red50, borderColor: C.red300 }]}>
          <Text style={[s.badgeText, { color: C.red700 }]}>Overdue {loan.overdue_days}d</Text>
        </View>
        <Text style={[s.badgeText, { color: C.red600, paddingLeft: 2 }]}>
          Fee: ₱{overdueFee(loan).toLocaleString()}
        </Text>
      </View>
    );
    return (
      <View style={[s.badge, { backgroundColor: C.blue50, borderColor: C.blue300 }]}>
        <Text style={[s.badgeText, { color: C.blue700 }]}>Active</Text>
      </View>
    );
  };

  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading loans…</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Loans</Text>
          <Text style={s.pageSubtitle}>Track book borrowing and returns</Text>
        </View>
        <View style={s.headerBadges}>
          {pendingCount > 0 && (
            <View style={[s.badge, { backgroundColor: C.yellow100, borderColor: C.yellow300 }]}>
              <Text style={[s.badgeText, { color: C.yellow700 }]}>⏳ {pendingCount}</Text>
            </View>
          )}
          {overdueCount > 0 && (
            <View style={[s.badge, { backgroundColor: C.red50, borderColor: C.red300 }]}>
              <Text style={[s.badgeText, { color: C.red700 }]}>⚠️ {overdueCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Loan</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.alertError}>
          <Text style={s.alertErrorText}>⚠️  {error}</Text>
        </View>
      )}

      {/* Search */}
      <TextInput
        style={[s.searchInput, { marginBottom: 10 }]}
        value={search} onChangeText={setSearch}
        placeholder="Search by member or book…"
        placeholderTextColor={C.textMuted}
        autoCapitalize="none"
      />

      {/* ── Filter tabs — fixed height, horizontal scroll ── */}
      <View style={s.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterScroll}
        >
          {[
            { key: 'all',      label: 'All' },
            { key: 'active',   label: 'Active' },
            { key: 'pending',  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { key: 'overdue',  label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
            { key: 'returned', label: 'Returned' },
          ].map(({ key, label }) => {
            const active = filter === key;
            const activeBg =
              key === 'overdue' ? C.red700 :
              key === 'pending' ? C.yellow600 : C.red;
            return (
              <TouchableOpacity
                key={key}
                style={[s.filterBtn, active && { backgroundColor: activeBg, borderColor: activeBg }]}
                onPress={() => setFilter(key)}
              >
                <Text style={[s.filterBtnText, active && { color: C.white }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={s.recordCount}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🔖</Text>
          <Text style={s.emptyTitle}>No loan records found</Text>
          <Text style={s.emptyBody}>Create a new loan to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => String(item.memberId)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item: { memberId, loans: memberLoans } }) => {
            const isCollapsed = collapsedMembers.has(memberId);
            const hasOverdue  = memberLoans.some(isOverdue);
            const hasPending  = memberLoans.some(isPending);
            const totalFee    = memberLoans.filter(isOverdue).reduce((sum, l) => sum + overdueFee(l), 0);
            const name        = memberLoans[0].member_name ?? memberName(memberId);

            return (
              <View style={s.group}>
                <TouchableOpacity
                  style={[
                    s.groupHeader,
                    hasOverdue ? { backgroundColor: '#fee2e2' } :
                    hasPending ? { backgroundColor: C.yellow50 } :
                    { backgroundColor: C.cream },
                  ]}
                  onPress={() => toggleCollapse(memberId)}
                  activeOpacity={0.7}
                >
                  <Text style={s.groupChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                  <View style={s.groupAvatar}>
                    <Text style={s.groupAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={s.groupName} numberOfLines={1}>{name}</Text>
                  <Text style={s.groupCount}>{memberLoans.length}</Text>
                  {hasOverdue && (
                    <View style={[s.badge, { backgroundColor: C.red50, borderColor: C.red300, marginLeft: 4 }]}>
                      <Text style={[s.badgeText, { color: C.red700 }]}>⚠️</Text>
                    </View>
                  )}
                  {hasPending && (
                    <View style={[s.badge, { backgroundColor: C.yellow100, borderColor: C.yellow300, marginLeft: 4 }]}>
                      <Text style={[s.badgeText, { color: C.yellow700 }]}>⏳</Text>
                    </View>
                  )}
                  {hasOverdue && totalFee > 0 && (
                    <View style={[s.badge, { backgroundColor: '#fecaca', borderColor: C.red300, marginLeft: 'auto' }]}>
                      <Text style={[s.badgeText, { color: C.red700, fontWeight: '700' }]}>₱{totalFee.toLocaleString()}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {!isCollapsed && memberLoans.map((loan, idx) => {
                  const overdue = isOverdue(loan);
                  const pending = isPending(loan);
                  const isLast  = idx === memberLoans.length - 1;
                  return (
                    <View key={loan.id} style={[
                      s.loanRow, isLast && s.loanRowLast,
                      overdue ? { backgroundColor: C.red50 } :
                      pending ? { backgroundColor: C.yellow50 } :
                      { backgroundColor: C.white },
                    ]}>
                      <View style={s.loanRowTop}>
                        <Text style={s.loanTreeChar}>{isLast ? '└─' : '├─'}</Text>
                        <Text style={s.loanBookTitle} numberOfLines={1}>{bookTitle(loan.book)}</Text>
                        <StatusBadge loan={loan} />
                      </View>
                      <View style={s.loanMeta}>
                        <Text style={s.loanMetaText}>Loan: {loan.loan_date}</Text>
                        <Text style={[s.loanMetaText, overdue && { color: C.red600, fontWeight: '700' }]}>
                          Due: {loan.due_date ?? '—'}
                        </Text>
                        <Text style={s.loanMetaText}>
                          {loan.return_verified_date
                            ? `Returned: ${loan.return_verified_date}`
                            : pending ? 'Pending verification'
                            : 'Not yet returned'}
                        </Text>
                      </View>
                      <View style={s.loanActions}>
                        {pending && !loan.return_verified_date && (
                          <>
                            <TouchableOpacity
                              style={[s.actionBtn, { borderColor: C.green300 }]}
                              onPress={() => { setVerifyModal(loan); setVerifyNotes(''); }}>
                              <Text style={[s.actionBtnText, { color: C.green700 }]}>✓ Verify</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.actionBtn, { borderColor: C.red300 }]}
                              onPress={() => { setRejectModal(loan); setRejectReason(''); }}>
                              <Text style={[s.actionBtnText, { color: C.red700 }]}>✕ Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {!loan.return_verified_date && !pending && (
                          <TouchableOpacity
                            style={[s.actionBtn, { borderColor: C.blue300 }]}
                            onPress={() => openEdit(loan)}>
                            <Text style={[s.actionBtnText, { color: C.blue700 }]}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: C.red300 }]}
                          onPress={() => setConfirmDelete(loan)}>
                          <Text style={[s.actionBtnText, { color: C.red700 }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          }}
        />
      )}

      {/* ── New / Edit Loan Modal ── */}
      <BottomSheetModal
        visible={showForm}
        title={editing ? 'Edit Loan' : 'New Loan'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <ModalCancelButton onPress={() => setShowForm(false)} />
            <ModalSubmitButton
              onPress={handleSave} disabled={saving}
              label={editing ? 'Save Changes' : 'Create Loan'}
              loading={saving} loadingLabel="Saving…"
            />
          </>
        }>
        {!!error && (
          <View style={[s.alertError, { marginBottom: 14 }]}>
            <Text style={s.alertErrorText}>⚠️  {error}</Text>
          </View>
        )}

        <View style={s.fieldWrap}>
          <Text style={s.label}>Member *</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.member} onValueChange={v => setForm({ ...form, member: v })} style={s.picker}>
              <Picker.Item label="Select a member…" value={0} />
              {members.map(m => <Picker.Item key={m.id} label={m.name} value={m.id} />)}
            </Picker>
          </View>
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Book *</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.book} onValueChange={v => setForm({ ...form, book: v })} style={s.picker}>
              <Picker.Item label="Select a book…" value={0} />
              {books.map(b => (
                <Picker.Item
                  key={b.id}
                  label={`${b.title}${!b.available && b.id !== editing?.book ? ' (On Loan)' : ''}`}
                  value={b.id}
                  enabled={b.available || b.id === editing?.book}
                />
              ))}
            </Picker>
          </View>
          <Text style={s.hint}>Books marked "On Loan" cannot be borrowed.</Text>
        </View>

        <DateField
          label="Loan Date" value={form.loan_date}
          onChange={v => setForm({ ...form, loan_date: v })}
          hint={!editing ? 'Due date auto-set to 14 days from loan date.' : undefined}
        />
        {editing && (
          <DateField label="Due Date" value={form.due_date}
            onChange={v => setForm({ ...form, due_date: v || null })}
            hint="Override the auto-calculated due date if needed."
          />
        )}
        {editing && (
          <DateField label="Return Date" value={form.return_date}
            onChange={v => setForm({ ...form, return_date: v || null })}
          />
        )}
      </BottomSheetModal>

      {/* ── Verify Return Modal ── */}
      <BottomSheetModal
        visible={!!verifyModal}
        title="Verify Return"
        onClose={() => setVerifyModal(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setVerifyModal(null)} />
            <ModalSubmitButton
              onPress={handleVerify} disabled={actionLoading}
              label="Confirm Verification" loading={actionLoading} loadingLabel="Confirming…"
              color={C.green600}
            />
          </>
        }>
        <Text style={[s.label, { marginBottom: 10 }]}>Confirm that the book has been physically received:</Text>
        <View style={s.infoBox}>
          <Text style={s.infoBoxTitle}>{bookTitle(verifyModal?.book)}</Text>
          <Text style={s.infoBoxSub}>by {memberName(verifyModal?.member)}</Text>
          {verifyModal && isOverdue(verifyModal) && (
            <Text style={s.infoBoxFee}>
              ⚠️ Overdue {verifyModal.overdue_days}d — Fee: ₱{overdueFee(verifyModal).toLocaleString()}
            </Text>
          )}
        </View>
        <TextInput
          style={[s.input, s.textArea, { marginTop: 8 }]}
          value={verifyNotes} onChangeText={setVerifyNotes}
          placeholder="Optional notes (condition, remarks…)"
          placeholderTextColor={C.textMuted}
          multiline numberOfLines={3} textAlignVertical="top"
        />
      </BottomSheetModal>

      {/* ── Reject Return Modal ── */}
      <BottomSheetModal
        visible={!!rejectModal}
        title="Reject Return"
        onClose={() => setRejectModal(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setRejectModal(null)} />
            <ModalSubmitButton
              onPress={handleReject}
              disabled={actionLoading || rejectReason.trim() === ''}
              label="Confirm Rejection" loading={actionLoading} loadingLabel="Rejecting…"
              color={C.red600}
            />
          </>
        }>
        <Text style={[s.label, { marginBottom: 10 }]}>The borrower will be notified and can re-submit their return request.</Text>
        <View style={s.infoBox}>
          <Text style={s.infoBoxTitle}>{bookTitle(rejectModal?.book)}</Text>
          <Text style={s.infoBoxSub}>by {memberName(rejectModal?.member)}</Text>
        </View>
        <Text style={[s.label, { marginTop: 12 }]}>Reason for rejection *</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={rejectReason} onChangeText={setRejectReason}
          placeholder="e.g. Book not physically received, damaged condition…"
          placeholderTextColor={C.textMuted}
          multiline numberOfLines={3} textAlignVertical="top"
        />
        {rejectReason.trim() === '' && (
          <Text style={{ fontSize: 11, color: C.red600, marginTop: 4 }}>A reason is required.</Text>
        )}
      </BottomSheetModal>

      {/* ── Delete Confirm Modal ── */}
      <BottomSheetModal
        visible={!!confirmDelete}
        title="Delete Loan Record"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setConfirmDelete(null)} />
            <ModalSubmitButton onPress={handleDelete} label="Delete" color={C.red700} />
          </>
        }>
        <View style={s.confirmBody}>
          <Text style={s.confirmEmoji}>🗑️</Text>
          <Text style={s.confirmTitle}>Delete this loan record?</Text>
          <Text style={s.confirmNote}>
            {memberName(confirmDelete?.member)} → {bookTitle(confirmDelete?.book)}
          </Text>
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default LoanTable;

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 16 },

  header:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.cream },
  headerAccent: { position: 'absolute', bottom: -2, left: 0, width: 48, height: 2, backgroundColor: C.red },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.textDark },
  pageSubtitle: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  headerBadges: { flexDirection: 'row', marginRight: 8 },
  addBtn:       { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  addBtnText:   { color: C.white, fontWeight: '700', fontSize: 13 },

  alertError:     { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertErrorText: { color: C.red700, fontSize: 13 },

  searchInput:  { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },

  // ── Filter tabs fix ────────────────────────────────────────────────────────
  filterWrap:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  filterScroll: { flexGrow: 0, flexShrink: 1 },          // ← KEY FIX: prevents vertical stretch
  filterRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingRight: 8 },
  filterBtn:    {
    height: 30,                                           // ← fixed height
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  filterBtnText:  { fontSize: 12, fontWeight: '600', color: C.textMid },
  recordCount:    { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginLeft: 4, flexShrink: 0 },

  // Group
  group:          { marginBottom: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  groupHeader:    { flexDirection: 'row', alignItems: 'center', padding: 10 },
  groupChevron:   { fontSize: 10, color: C.textMuted, width: 14, marginRight: 4 },
  groupAvatar:    { width: 30, height: 30, borderRadius: 15, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  groupAvatarText:{ color: C.white, fontWeight: '800', fontSize: 13 },
  groupName:      { fontSize: 14, fontWeight: '700', color: C.textDark, flex: 1 },
  groupCount:     { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginRight: 4 },

  loanRow:        { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.cream },
  loanRowLast:    { borderBottomWidth: 2, borderBottomColor: C.border },
  loanRowTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  loanTreeChar:   { fontSize: 11, color: C.textMuted, width: 20 },
  loanBookTitle:  { fontSize: 13, fontWeight: '600', color: C.textMid, flex: 1, marginRight: 6 },
  loanMeta:       { flexDirection: 'row', flexWrap: 'wrap', paddingLeft: 20, marginBottom: 6 },
  loanMetaText:   { fontSize: 11, color: C.textMuted, marginRight: 12 },
  loanActions:    { flexDirection: 'row', flexWrap: 'wrap', paddingLeft: 20 },
  actionBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, marginRight: 6, marginBottom: 4 },
  actionBtnText:  { fontSize: 11, fontWeight: '600' },

  badge:          { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText:      { fontSize: 10, fontWeight: '600' },

  emptyState:     { alignItems: 'center', padding: 40 },
  emptyEmoji:     { fontSize: 40, marginBottom: 8 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: C.textMid, marginBottom: 4 },
  emptyBody:      { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  centerState:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerStateText:{ color: C.textMuted, fontStyle: 'italic', marginTop: 10 },

  fieldWrap:      { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:          { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.textDark },
  textArea:       { minHeight: 80, paddingTop: 10 },
  hint:           { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
  pickerWrap:     { borderWidth: 1, borderColor: C.border, borderRadius: 7, backgroundColor: C.white, overflow: 'hidden' },
  picker:         { height: 48, color: C.textDark },

  infoBox:        { backgroundColor: '#faf7f2', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.cream },
  infoBoxTitle:   { fontSize: 14, fontWeight: '700', color: C.textDark },
  infoBoxSub:     { fontSize: 12, color: C.textMuted, marginTop: 2 },
  infoBoxFee:     { fontSize: 12, color: C.red600, fontWeight: '700', marginTop: 8 },

  confirmBody:    { alignItems: 'center', paddingVertical: 16 },
  confirmEmoji:   { fontSize: 38, marginBottom: 10 },
  confirmTitle:   { fontSize: 15, color: C.textMid, textAlign: 'center', marginBottom: 6 },
  confirmNote:    { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
});