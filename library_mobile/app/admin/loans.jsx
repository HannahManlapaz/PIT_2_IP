// app/admin/loans.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from "expo-router";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, ScrollView, Modal,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  createLoan, updateLoan, deleteLoan,
  getMembers, getBooks, verifyReturn, rejectReturn,
  getLoansBySemester, getSemesters,
} from '../../lib/api';
import BottomSheetModal, { ModalCancelButton, ModalSubmitButton } from '../../lib/BottomSheetModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Colour tokens ─────────────────────────────────────────────────────────────
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
  purple50: '#fdf4ff',
  purple300:'#e9d5ff',
  purple700:'#7e22ce',
};

const today = () => new Date().toISOString().split('T')[0];

const FEE_PER_DAY = 20;

// ── Simple date input ─────────────────────────────────────────────────────────
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

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ loan, overdueFee: fee }) => {
  if (loan.return_verified_date)
    return <View style={[s.badge, { backgroundColor: C.green50, borderColor: C.green300 }]}><Text style={[s.badgeText, { color: C.green700 }]}>Returned</Text></View>;
  if (loan.return_status === 'pending' && loan.return_requested_date && !loan.return_verified_date)
    return <View style={[s.badge, { backgroundColor: C.yellow100, borderColor: C.yellow300 }]}><Text style={[s.badgeText, { color: C.yellow700 }]}>Pending</Text></View>;
  if ((loan.overdue_days ?? 0) > 0 && !loan.return_verified_date)
    return (
      <View style={{ gap: 1 }}>
        <View style={[s.badge, { backgroundColor: C.red50, borderColor: C.red300 }]}>
          <Text style={[s.badgeText, { color: C.red700 }]}>Overdue {loan.overdue_days}d</Text>
        </View>
        <Text style={[s.badgeText, { color: C.red600, marginLeft: 2 }]}>₱{fee.toLocaleString()}</Text>
      </View>
    );
  return <View style={[s.badge, { backgroundColor: C.blue50, borderColor: C.blue300 }]}><Text style={[s.badgeText, { color: C.blue700 }]}>Active</Text></View>;
};

// ── Main component ─────────────────────────────────────────────────────────────
const LoanTable = () => {
  const [loans,          setLoans]          = useState([]);
  const [members,        setMembers]        = useState([]);
  const [books,          setBooks]          = useState([]);
  const [semesters,      setSemesters]      = useState([]);
  const emptyLoan = () => {
  const activeSem = semesters.find(s => s.is_active);
    return {
      member: 0, book: 0, loan_date: today(),
      due_date: null, return_date: null,  
      semester: activeSem?.id ?? null,
    };
  };
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [showForm,       setShowForm]       = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [verifyModal,    setVerifyModal]    = useState(null);
  const [verifyNotes,    setVerifyNotes]    = useState('');
  const [rejectModal,    setRejectModal]    = useState(null);
  const [rejectReason,   setRejectReason]   = useState('');
  const [form, setForm] = useState({
    member: 0, book: 0, loan_date: today(),
    due_date: null, return_date: null, semester: null,
  });
  const [saving,         setSaving]         = useState(false);
  const [actionLoading,  setActionLoading]  = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [semesterFilter,  setSemesterFilter]  = useState('');

  // pending filters (inside drawer before Apply)
  const [draftStatus,     setDraftStatus]     = useState('all');
  const [draftSemester,   setDraftSemester]   = useState('');

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true); // ✅
      const [l, m, b, sems] = await Promise.all([
        getLoansBySemester(semesterFilter),
        getMembers(), getBooks(), getSemesters(),
      ]);
      setLoans(Array.isArray(l) ? l : []);
      setMembers(Array.isArray(m) ? m : []);
      setBooks(Array.isArray(b) ? b : []);
      setSemesters(Array.isArray(sems) ? sems : []);
    } catch { setError('Failed to load loans.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [semesterFilter]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [semesterFilter])
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const memberName  = (id) => members.find(m => m.id === id)?.name ?? '—';
  const bookTitle   = (id) => books.find(b => b.id === id)?.title ?? '—';
  const isOverdue   = (l)  => !l.return_verified_date && (l.overdue_days ?? 0) > 0;
  const isPending   = (l)  => !!l.return_requested_date && !l.return_verified_date && l.return_status === 'pending';
  const overdueFee  = (l)  => (l.overdue_days ?? 0) * FEE_PER_DAY;

  const overdueCount = loans.filter(isOverdue).length;
  const pendingCount = loans.filter(isPending).length;

  // active filter count (for badge on filter button)
  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (semesterFilter !== '' ? 1 : 0);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = loans
    .filter(l => {
      if (statusFilter === 'active')   return !l.return_verified_date && !isOverdue(l) && !isPending(l);
      if (statusFilter === 'returned') return !!l.return_verified_date;
      if (statusFilter === 'overdue')  return isOverdue(l);
      if (statusFilter === 'pending')  return isPending(l);
      return true;
    })
    .filter(l =>
      memberName(l.member).toLowerCase().includes(search.toLowerCase()) ||
      bookTitle(l.book).toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyLoan()); setEditing(null); setError(''); setShowForm(true); };
  const openEdit   = (loan) => {
    setForm({
      member: loan.member, book: loan.book,
      loan_date: loan.loan_date, due_date: loan.due_date,
      return_date: loan.return_date,
      semester: loan.semester ?? null,
    });
    setEditing(loan); setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.member || !form.book) { setError('Member and book are required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) await updateLoan(editing.id, form);
      else         await createLoan(form);
      setShowForm(false); await load();
    } catch (e) { setError(e?.message || 'Failed to save loan.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteLoan(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete loan.'); }
  };

  const handleVerify = async () => {
    if (!verifyModal) return;
    setActionLoading(true);
    try { await verifyReturn(verifyModal.id, verifyNotes); setVerifyModal(null); setVerifyNotes(''); await load(); }
    catch (e) { setError(e?.message || 'Failed to verify return.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try { await rejectReturn(rejectModal.id, rejectReason); setRejectModal(null); setRejectReason(''); await load(); }
    catch (e) { setError(e?.message || 'Failed to reject return.'); }
    finally { setActionLoading(false); }
  };

  const applyFilters = () => {
    setStatusFilter(draftStatus);
    setSemesterFilter(draftSemester);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setDraftStatus('all');
    setDraftSemester('');
    setStatusFilter('all');
    setSemesterFilter('');
    setShowFilterModal(false);
  };

  const openFilterModal = () => {
    // seed drafts with current applied values
    setDraftStatus(statusFilter);
    setDraftSemester(semesterFilter);
    setShowFilterModal(true);
  };

  // ── Loan card (flat, no grouping — shows ALL details) ─────────────────────
  const renderLoan = ({ item: loan }) => {
    const overdue = isOverdue(loan);
    const pending = isPending(loan);
    const fee     = overdueFee(loan);

    const cardBg = overdue ? '#fff8f8' : pending ? C.yellow50 : C.white;
    const leftBar = overdue ? C.red700 : pending ? C.yellow600 : loan.return_verified_date ? C.green700 : C.blue700;

    return (
      <View style={[s.loanCard, { backgroundColor: cardBg, borderLeftColor: leftBar }]}>
        {/* ── Row 1: Book title + Status ── */}
        <View style={s.loanCardTop}>
          <Text style={s.loanBookTitle} numberOfLines={2}>{bookTitle(loan.book)}</Text>
          <StatusBadge loan={loan} overdueFee={fee} />
        </View>

        {/* ── Row 2: Member ── */}
        <View style={s.loanDetailRow}>
          <Text style={s.loanDetailIcon}>👤</Text>
          <Text style={s.loanDetailLabel}>Borrower</Text>
          <Text style={s.loanDetailValue}>{loan.member_name ?? memberName(loan.member)}</Text>
        </View>

        {/* ── Row 3: Dates ── */}
        <View style={s.loanDatesRow}>
          <View style={s.loanDateItem}>
            <Text style={s.loanDateLabel}>LOANED</Text>
            <Text style={s.loanDateValue}>{loan.loan_date ?? '—'}</Text>
          </View>
          <View style={s.loanDateDivider} />
          <View style={s.loanDateItem}>
            <Text style={[s.loanDateLabel, overdue && { color: C.red700 }]}>DUE</Text>
            <Text style={[s.loanDateValue, overdue && { color: C.red700, fontWeight: '700' }]}>
              {loan.due_date ?? '—'}
            </Text>
          </View>
          <View style={s.loanDateDivider} />
          <View style={s.loanDateItem}>
            <Text style={s.loanDateLabel}>RETURNED</Text>
            <Text style={s.loanDateValue}>
              {loan.return_verified_date
                ? loan.return_verified_date
                : pending ? 'Pending…'
                : '—'}
            </Text>
          </View>
        </View>

        {/* ── Row 4: Semester + Overdue fee ── */}
        {(!!loan.semester_label || overdue) && (
          <View style={s.loanExtraRow}>
            {!!loan.semester_label && (
              <View style={s.semesterTag}>
                <Text style={s.semesterTagText}>🗓 {loan.semester_label}</Text>
              </View>
            )}
            {overdue && fee > 0 && (
              <View style={s.feeTag}>
                <Text style={s.feeTagText}>Fee: ₱{fee.toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Row 5: Actions ── */}
        <View style={s.loanActions}>
          {pending && !loan.return_verified_date && (
            <>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: C.green300, backgroundColor: C.green50 }]}
                onPress={() => { setVerifyModal(loan); setVerifyNotes(''); }}>
                <Text style={[s.actionBtnText, { color: C.green700 }]}>✓ Verify Return</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: C.red300, backgroundColor: C.red50 }]}
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
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading loans…</Text>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Loans</Text>
          <Text style={s.pageSubtitle}>Track book borrowing and returns</Text>
        </View>
        <View style={s.headerRight}>
          {pendingCount > 0 && (
            <View style={[s.headerBadge, { backgroundColor: C.yellow100, borderColor: C.yellow300 }]}>
              <Text style={[s.headerBadgeText, { color: C.yellow700 }]}>⏳ {pendingCount}</Text>
            </View>
          )}
          {overdueCount > 0 && (
            <View style={[s.headerBadge, { backgroundColor: C.red50, borderColor: C.red300 }]}>
              <Text style={[s.headerBadgeText, { color: C.red700 }]}>⚠️ {overdueCount}</Text>
            </View>
          )}
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Text style={s.addBtnText}>＋ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!error && (
        <View style={s.alertError}>
          <Text style={s.alertErrorText}>⚠️  {error}</Text>
        </View>
      )}

      {/* ── Search + Filter button ── */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search} onChangeText={setSearch}
          placeholder="Search by member or book…"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[s.filterBtn, activeFilters > 0 && s.filterBtnActive]}
          onPress={openFilterModal}
        >
          <Text style={[s.filterBtnIcon, activeFilters > 0 && { color: C.white }]}>⚙</Text>
          <Text style={[s.filterBtnText, activeFilters > 0 && { color: C.white }]}>
            Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active filter chips ── */}
      {(statusFilter !== 'all' || semesterFilter !== '') && (
        <View style={s.activeChipsRow}>
          {statusFilter !== 'all' && (
            <View style={s.chip}>
              <Text style={s.chipText}>{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</Text>
              <TouchableOpacity onPress={() => setStatusFilter('all')} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {semesterFilter !== '' && (
            <View style={s.chip}>
              <Text style={s.chipText}>
                {semesters.find(s => String(s.id) === semesterFilter)?.semester_type_display ?? 'Semester'}
              </Text>
              <TouchableOpacity onPress={() => setSemesterFilter('')} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={s.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Record count ── */}
      <Text style={s.recordCount}>
        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
      </Text>

      {/* ── Loan list ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🔖</Text>
          <Text style={s.emptyTitle}>No loan records found</Text>
          <Text style={s.emptyBody}>
            {activeFilters > 0 ? 'Try adjusting your filters.' : 'Create a new loan to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderLoan}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ══════════════════════════════════════════════════
          FILTER DRAWER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={s.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowFilterModal(false)} />
          <View style={s.drawerSheet}>
            {/* Handle */}
            <View style={s.drawerHandle} />

            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Filter Loans</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={s.drawerClearText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.drawerBody}>

              {/* Status filter */}
              <Text style={s.drawerSectionLabel}>Status</Text>
              <View style={s.drawerChipRow}>
                {[
                  { key: 'all',      label: 'All Loans' },
                  { key: 'active',   label: 'Active' },
                  { key: 'pending',  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                  { key: 'overdue',  label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
                  { key: 'returned', label: 'Returned' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.drawerChip, draftStatus === key && s.drawerChipActive]}
                    onPress={() => setDraftStatus(key)}
                  >
                    <Text style={[s.drawerChipText, draftStatus === key && s.drawerChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Semester filter */}
              <Text style={[s.drawerSectionLabel, { marginTop: 20 }]}>Semester</Text>
              {semesters.length === 0 ? (
                <Text style={s.drawerNoData}>No semesters created yet. Go to Admin → Semesters to add one.</Text>
              ) : (
                <View style={s.drawerChipRow}>
                  <TouchableOpacity
                    style={[s.drawerChip, draftSemester === '' && s.drawerChipActive]}
                    onPress={() => setDraftSemester('')}
                  >
                    <Text style={[s.drawerChipText, draftSemester === '' && s.drawerChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {semesters.map(sem => (
                    <TouchableOpacity
                      key={sem.id}
                      style={[s.drawerChip, draftSemester === String(sem.id) && s.drawerChipActive]}
                      onPress={() => setDraftSemester(String(sem.id))}
                    >
                      <Text style={[s.drawerChipText, draftSemester === String(sem.id) && s.drawerChipTextActive]}>
                        {sem.semester_type_display}{'\n'}
                        <Text style={{ fontSize: 10 }}>A.Y. {sem.academic_year}{sem.is_active ? ' ★' : ''}</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Apply button */}
            <View style={s.drawerFooter}>
              <TouchableOpacity style={s.applyBtn} onPress={applyFilters}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          NEW / EDIT LOAN MODAL
      ══════════════════════════════════════════════════ */}
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

        {/* Member */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Member *</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.member} onValueChange={v => setForm({ ...form, member: v })} style={s.picker}>
              <Picker.Item label="Select a member…" value={0} />
              {members.map(m => <Picker.Item key={m.id} label={m.name} value={m.id} />)}
            </Picker>
          </View>
        </View>

        {/* Semester */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Semester</Text>
          <View style={s.pickerWrap}>
            <Picker
              selectedValue={form.semester ?? null}
              onValueChange={v => setForm({ ...form, semester: v || null })}
              style={s.picker}>
              <Picker.Item label="No semester assigned" value={null} />
              {semesters.map(sem => (
                <Picker.Item
                  key={sem.id}
                  label={`${sem.semester_type_display} — A.Y. ${sem.academic_year}${sem.is_active ? ' ★' : ''}`}
                  value={sem.id}
                />
              ))}
            </Picker>
          </View>
          <Text style={s.hint}>★ = currently active semester</Text>
        </View>

        {/* Book */}
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

      {/* ══════════════════════════════════════════════════
          VERIFY RETURN MODAL
      ══════════════════════════════════════════════════ */}
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
        <Text style={[s.label, { marginBottom: 10 }]}>Confirm the book has been physically received:</Text>
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
          style={[s.input, s.textArea, { marginTop: 10 }]}
          value={verifyNotes} onChangeText={setVerifyNotes}
          placeholder="Optional notes (condition, remarks…)"
          placeholderTextColor={C.textMuted}
          multiline numberOfLines={3} textAlignVertical="top"
        />
      </BottomSheetModal>

      {/* ══════════════════════════════════════════════════
          REJECT RETURN MODAL
      ══════════════════════════════════════════════════ */}
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
        <Text style={[s.label, { marginBottom: 10 }]}>
          The borrower will be notified and can re-submit their return request.
        </Text>
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

      {/* ══════════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════════════════════════ */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 16 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.cream },
  headerAccent: { position: 'absolute', bottom: -2, left: 0, width: 48, height: 2, backgroundColor: C.red },
  pageTitle:    { fontSize: 24, fontWeight: '800', color: C.textDark },
  pageSubtitle: { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  headerBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  headerBadgeText: { fontSize: 11, fontWeight: '700' },
  addBtn:       { backgroundColor: C.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7 },
  addBtnText:   { color: C.white, fontWeight: '700', fontSize: 12 },

  // Alert
  alertError:     { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertErrorText: { color: C.red700, fontSize: 13 },

  // Search row
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput:  { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  filterBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  filterBtnActive: { backgroundColor: C.red, borderColor: C.red },
  filterBtnIcon:{ fontSize: 13, color: C.textMuted },
  filterBtnText:{ fontSize: 12, fontWeight: '600', color: C.textMid },

  // Active chips
  activeChipsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.red, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText:     { fontSize: 11, color: C.white, fontWeight: '600' },
  chipX:        { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  clearAllText: { fontSize: 11, color: C.red700, fontStyle: 'italic' },

  recordCount:  { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginBottom: 10 },
  listContent:  { paddingBottom: 32, gap: 10 },

  // Loan card
  loanCard: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  loanCardTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  loanBookTitle:  { flex: 1, fontSize: 14, fontWeight: '700', color: C.textDark, lineHeight: 20 },
  loanDetailRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loanDetailIcon: { fontSize: 12 },
  loanDetailLabel:{ fontSize: 11, color: C.textMuted, width: 60 },
  loanDetailValue:{ fontSize: 12, fontWeight: '600', color: C.textMid, flex: 1 },

  loanDatesRow:   { flexDirection: 'row', backgroundColor: C.cream, borderRadius: 8, padding: 10 },
  loanDateItem:   { flex: 1, alignItems: 'center' },
  loanDateLabel:  { fontSize: 8, color: C.textMuted, letterSpacing: 1.2, marginBottom: 3 },
  loanDateValue:  { fontSize: 11, fontWeight: '600', color: C.textDark },
  loanDateDivider:{ width: 1, backgroundColor: C.border, marginHorizontal: 6 },

  loanExtraRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  semesterTag:    { backgroundColor: C.purple50, borderWidth: 1, borderColor: C.purple300, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  semesterTagText:{ fontSize: 10, color: C.purple700, fontWeight: '600' },
  feeTag:         { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  feeTagText:     { fontSize: 10, color: C.red700, fontWeight: '700' },

  loanActions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.cream },
  actionBtn:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionBtnText:  { fontSize: 11, fontWeight: '600' },

  // States
  emptyState:     { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyEmoji:     { fontSize: 38 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: C.textMid },
  emptyBody:      { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
  centerState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  centerStateText:{ color: C.textMuted, fontStyle: 'italic' },

  badge:          { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText:      { fontSize: 10, fontWeight: '600' },

  // Filter drawer
  drawerOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  drawerSheet:    { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 32 },
  drawerHandle:   { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  drawerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cream },
  drawerTitle:    { fontSize: 16, fontWeight: '700', color: C.textDark },
  drawerClearText:{ fontSize: 13, color: C.red700 },
  drawerBody:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  drawerSectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' },
  drawerChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drawerChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  drawerChipActive:   { backgroundColor: C.red, borderColor: C.red },
  drawerChipText:     { fontSize: 12, fontWeight: '600', color: C.textMid },
  drawerChipTextActive: { color: C.white },
  drawerNoData:   { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  drawerFooter:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cream },
  applyBtn:       { backgroundColor: C.red, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  applyBtnText:   { color: C.white, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  // Form
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

  confirmBody:    { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji:   { fontSize: 38 },
  confirmTitle:   { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:    { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
});