// app/admin/semesters.jsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native';
import {
  getSemesters, createSemester, updateSemester,
  deleteSemester, setActiveSemester,
} from '../../lib/api';
import BottomSheetModal, { ModalCancelButton, ModalSubmitButton } from '../../lib/BottomSheetModal';

const C = {
  bg:       '#f5f0e8',
  cream:    '#ede5d0',
  border:   '#cfc4aa',
  textDark: '#1a1209',
  textMid:  '#3d2f1a',
  textMuted:'#7a6a52',
  red:      '#6b1d2a',
  white:    '#ffffff',
  yellow:   '#ca8a04',
  green50:  '#f0fdf4',
  green700: '#15803d',
  green300: '#86efac',
  red50:    '#fef2f2',
  red700:   '#b91c1c',
  red300:   '#fca5a5',
  blue50:   '#eff6ff',
  blue300:  '#93c5fd',
  blue700:  '#1d4ed8',
  amber50:  '#fffbeb',
  amber300: '#fcd34d',
  amber700: '#b45309',
};

const SEMESTER_TYPES = [
  { key: '1st_sem', label: '1st Semester' },
  { key: '2nd_sem', label: '2nd Semester' },
  { key: 'summer',  label: 'Summer'       },
];

const emptyForm = {
  academic_year: '',
  semester_type: '1st_sem',
  start_date:    '',
  end_date:      '',
};

// ── Date input field ──────────────────────────────────────────────────────────
const DateField = ({ label, value, onChange, hint }) => (
  <View style={s.fieldWrap}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={s.input}
      value={value ?? ''}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={C.textMuted}
      keyboardType="numbers-and-punctuation"
    />
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SemestersScreen() {
  const [semesters,     setSemesters]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form,          setForm]          = useState(emptyForm);
  const [saving,        setSaving]        = useState(false);
  const [activating,    setActivating]    = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getSemesters();
      setSemesters(data);
    } catch { setError('Failed to load semesters.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const openCreate = () => {
    setForm(emptyForm); setEditing(null);
    setError(''); setShowForm(true);
  };

  const openEdit = (sem) => {
    setForm({
      academic_year: sem.academic_year,
      semester_type: sem.semester_type,
      start_date:    sem.start_date,
      end_date:      sem.end_date,
    });
    setEditing(sem); setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.academic_year.trim()) { setError('Academic year is required. e.g. 2024-2025'); return; }
    if (!form.start_date)           { setError('Start date is required.');                   return; }
    if (!form.end_date)             { setError('End date is required.');                     return; }
    if (form.start_date >= form.end_date) {
      setError('End date must be after start date.'); return;
    }
    try {
      setSaving(true); setError('');
      if (editing) {
        await updateSemester(editing.id, form);
        setSuccess('Semester updated successfully.');
      } else {
        await createSemester(form);
        setSuccess('Semester created successfully.');
      }
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = e?.response?.data;
      if (msg?.non_field_errors) {
        setError('This semester already exists for that academic year.');
      } else {
        setError('Failed to save semester.');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSemester(confirmDelete.id);
      setSuccess(`"${confirmDelete}" deleted.`);
      setConfirmDelete(null);
      await load();
    } catch { setError('Failed to delete semester.'); }
  };

  const handleSetActive = async (sem) => {
    try {
      setActivating(sem.id);
      await setActiveSemester(sem.id);
      setSuccess(`"${sem}" is now the active semester.`);
      await load();
    } catch { setError('Failed to set active semester.'); }
    finally { setActivating(null); }
  };

  // Group semesters by academic year
  const grouped = semesters.reduce((acc, sem) => {
    const g = acc.find(x => x.academic_year === sem.academic_year);
    if (g) g.semesters.push(sem);
    else acc.push({ academic_year: sem.academic_year, semesters: [sem] });
    return acc;
  }, []);

  const semTypeColor = (type) => {
    if (type === '1st_sem') return { bg: C.blue50,  border: C.blue300,  text: C.blue700  };
    if (type === '2nd_sem') return { bg: C.green50, border: C.green300, text: C.green700 };
    return                         { bg: C.amber50, border: C.amber300, text: C.amber700 };
  };

  const renderSemester = (sem) => {
    const col      = semTypeColor(sem.semester_type);
    const isActive = sem.is_active;

    return (
      <View key={sem.id} style={[s.semCard, isActive && s.semCardActive]}>
        {/* Active ribbon */}
        {isActive && (
          <View style={s.activeRibbon}>
            <Text style={s.activeRibbonText}>✦ CURRENT SEMESTER</Text>
          </View>
        )}

        <View style={s.semTop}>
          {/* Type badge */}
          <View style={[s.typeBadge, { backgroundColor: col.bg, borderColor: col.border }]}>
            <Text style={[s.typeBadgeText, { color: col.text }]}>
              {sem.semester_type_display}
            </Text>
          </View>

          {/* Loan count */}
          <View style={s.loanCountBadge}>
            <Text style={s.loanCountText}>📋 {sem.loan_count} loan{sem.loan_count !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Date range */}
        <View style={s.dateRow}>
          <View style={s.dateItem}>
            <Text style={s.dateItemLabel}>START</Text>
            <Text style={s.dateItemValue}>{sem.start_date}</Text>
          </View>
          <View style={s.dateDivider} />
          <View style={s.dateItem}>
            <Text style={s.dateItemLabel}>END</Text>
            <Text style={s.dateItemValue}>{sem.end_date}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.semActions}>
          {!isActive && (
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: C.green300, flex: 1 }]}
              onPress={() => handleSetActive(sem)}
              disabled={activating === sem.id}
            >
              {activating === sem.id
                ? <ActivityIndicator size="small" color={C.green700} />
                : <Text style={[s.actionBtnText, { color: C.green700 }]}>✓ Set Active</Text>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.yellow }]}
            onPress={() => openEdit(sem)}
          >
            <Text style={[s.actionBtnText, { color: C.yellow }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.red300 }]}
            onPress={() => setConfirmDelete(sem)}
          >
            <Text style={[s.actionBtnText, { color: C.red700 }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading semesters…</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Semesters</Text>
          <Text style={s.pageSubtitle}>Manage academic semesters</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {!!error && (
        <View style={s.alertError}>
          <Text style={s.alertErrorText}>⚠️  {error}</Text>
        </View>
      )}
      {!!success && (
        <View style={s.alertSuccess}>
          <Text style={s.alertSuccessText}>✅  {success}</Text>
        </View>
      )}

      {/* Legend */}
      <View style={s.legend}>
        {[
          { type: '1st_sem', label: '1st Sem' },
          { type: '2nd_sem', label: '2nd Sem' },
          { type: 'summer',  label: 'Summer'  },
        ].map(({ type, label }) => {
          const col = semTypeColor(type);
          return (
            <View key={type} style={[s.legendItem, { backgroundColor: col.bg, borderColor: col.border }]}>
              <Text style={[s.legendText, { color: col.text }]}>{label}</Text>
            </View>
          );
        })}
        <View style={[s.legendItem, { backgroundColor: '#fdf4ff', borderColor: '#e9d5ff' }]}>
          <Text style={[s.legendText, { color: '#7e22ce' }]}>✦ Active</Text>
        </View>
      </View>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🗓️</Text>
          <Text style={s.emptyTitle}>No semesters yet</Text>
          <Text style={s.emptyBody}>
            Add a semester to track loans by academic period.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {grouped.map(({ academic_year, semesters: sems }) => (
            <View key={academic_year} style={s.group}>
              {/* Academic year header */}
              <View style={s.groupHeader}>
                <Text style={s.groupYear}>🎓 A.Y. {academic_year}</Text>
                <Text style={s.groupCount}>{sems.length} semester{sems.length !== 1 ? 's' : ''}</Text>
              </View>
              {sems.map(renderSemester)}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <BottomSheetModal
        visible={showForm}
        title={editing ? 'Edit Semester' : 'New Semester'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <ModalCancelButton onPress={() => setShowForm(false)} />
            <ModalSubmitButton
              onPress={handleSave} disabled={saving}
              label={editing ? 'Save Changes' : 'Create Semester'}
              loading={saving} loadingLabel="Saving…"
            />
          </>
        }>

        {!!error && (
          <View style={[s.alertError, { marginBottom: 14 }]}>
            <Text style={s.alertErrorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* Academic Year */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Academic Year *</Text>
          <TextInput
            style={s.input}
            value={form.academic_year}
            onChangeText={v => setForm({ ...form, academic_year: v })}
            placeholder="e.g. 2024-2025"
            placeholderTextColor={C.textMuted}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={s.hint}>Format: YYYY-YYYY (e.g. 2024-2025)</Text>
        </View>

        {/* Semester Type */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Semester Type *</Text>
          <View style={s.typeRow}>
            {SEMESTER_TYPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  s.typeBtn,
                  form.semester_type === key && s.typeBtnActive,
                ]}
                onPress={() => setForm({ ...form, semester_type: key })}
              >
                <Text style={[
                  s.typeBtnText,
                  form.semester_type === key && s.typeBtnTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date range */}
        <View style={s.formRow}>
          <View style={{ flex: 1 }}>
            <DateField
              label="Start Date *"
              value={form.start_date}
              onChange={v => setForm({ ...form, start_date: v })}
              hint="YYYY-MM-DD"
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="End Date *"
              value={form.end_date}
              onChange={v => setForm({ ...form, end_date: v })}
              hint="YYYY-MM-DD"
            />
          </View>
        </View>

        {/* Preview */}
        {form.academic_year && form.start_date && form.end_date && (
          <View style={s.previewBox}>
            <Text style={s.previewLabel}>PREVIEW</Text>
            <Text style={s.previewText}>
              {SEMESTER_TYPES.find(t => t.key === form.semester_type)?.label} — A.Y. {form.academic_year}
            </Text>
            <Text style={s.previewDates}>
              {form.start_date}  →  {form.end_date}
            </Text>
          </View>
        )}
      </BottomSheetModal>

      {/* ── Delete Confirm Modal ── */}
      <BottomSheetModal
        visible={!!confirmDelete}
        title="Delete Semester"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setConfirmDelete(null)} />
            <ModalSubmitButton
              onPress={handleDelete} label="Delete" color={C.red700}
            />
          </>
        }>
        <View style={s.confirmBody}>
          <Text style={s.confirmEmoji}>🗑️</Text>
          <Text style={s.confirmTitle}>
            Delete <Text style={{ fontWeight: '700' }}>"{String(confirmDelete)}"</Text>?
          </Text>
          <Text style={s.confirmNote}>
            Loans linked to this semester will not be deleted — they'll just have no semester assigned.
          </Text>
        </View>
      </BottomSheetModal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 16 },

  header:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.cream },
  headerAccent: { position: 'absolute', bottom: -2, left: 0, width: 48, height: 2, backgroundColor: C.red },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.textDark },
  pageSubtitle: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  addBtn:       { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  addBtnText:   { color: C.white, fontWeight: '700', fontSize: 13 },

  alertError:       { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertErrorText:   { color: C.red700, fontSize: 13 },
  alertSuccess:     { backgroundColor: C.green50, borderWidth: 1, borderColor: C.green300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertSuccessText: { color: C.green700, fontSize: 13 },

  // Legend
  legend:     { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  legendText: { fontSize: 11, fontWeight: '600' },

  // Group
  group:       { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  groupYear:   { fontSize: 15, fontWeight: '800', color: C.textDark },
  groupCount:  { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  // Semester card
  semCard: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  semCardActive: {
    borderColor: '#a855f7', borderWidth: 2,
    backgroundColor: '#fdf4ff',
  },
  activeRibbon: {
    backgroundColor: '#7e22ce', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  activeRibbonText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  semTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  typeBadge:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  typeBadgeText:{ fontSize: 12, fontWeight: '700' },
  loanCountBadge: { backgroundColor: C.cream, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  loanCountText:  { fontSize: 11, color: C.textMuted },

  dateRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: C.cream, borderRadius: 8, padding: 10 },
  dateItem:     { flex: 1, alignItems: 'center' },
  dateItemLabel:{ fontSize: 9, color: C.textMuted, letterSpacing: 1.5, marginBottom: 3 },
  dateItemValue:{ fontSize: 13, fontWeight: '700', color: C.textDark },
  dateDivider:  { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 8 },

  semActions:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  actionBtnText:{ fontSize: 12, fontWeight: '600' },

  emptyState:   { alignItems: 'center', padding: 48, gap: 6 },
  emptyEmoji:   { fontSize: 40 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: C.textMid },
  emptyBody:    { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },

  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerStateText: { color: C.textMuted, fontStyle: 'italic' },

  // Form
  fieldWrap:  { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:      { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  hint:       { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
  formRow:    { flexDirection: 'row', gap: 10 },

  typeRow:         { flexDirection: 'row', gap: 8 },
  typeBtn:         { flex: 1, paddingVertical: 9, borderRadius: 7, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.white },
  typeBtnActive:   { backgroundColor: C.red, borderColor: C.red },
  typeBtnText:     { fontSize: 12, fontWeight: '600', color: C.textMid },
  typeBtnTextActive: { color: C.white },

  previewBox:   { backgroundColor: C.cream, borderRadius: 8, padding: 12, marginTop: 4, alignItems: 'center' },
  previewLabel: { fontSize: 9, color: C.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  previewText:  { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  previewDates: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  confirmBody:  { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji: { fontSize: 38 },
  confirmTitle: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 8 },
});