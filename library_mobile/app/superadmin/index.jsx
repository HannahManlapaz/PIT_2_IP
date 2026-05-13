import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import {
  superadminGetStats,
  superadminGetStaff,
  superadminCreateStaff,
  superadminToggleStaff,
  superadminDeleteStaff,
  superadminEditStaff,
  logoutApi,
} from '../../lib/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

// ── Asset imports ──────────────────────────────────────────────────────────────
import libraryIcon from '../../assets/library-icon.png';
import bookIcon    from '../../assets/book-icon.png';
import authorIcon  from '../../assets/author-icon.png';
import memberIcon  from '../../assets/member-icon.png';
import loanIcon    from '../../assets/loan-icon.png';

// ── Colour tokens (mirrors Tailwind classes in original) ───────────────────────
const C = {
  bg:          '#f5f0e8',
  navBg:       '#1a1209',
  navBorder:   '#ca8a04',   // yellow-600
  cream:       '#ede5d0',
  creamLight:  '#fdf9f4',
  border:      '#cfc4aa',
  textDark:    '#1a1209',
  textMid:     '#3d2f1a',
  textMuted:   '#7a6a52',
  textLight:   '#c8bfad',
  yellow:      '#eab308',   // yellow-500
  yellowDark:  '#92400e',   // yellow-900 bg tint
  red:         '#6b1d2a',
  redHover:    '#8c2f3f',
  white:       '#ffffff',
  green50:     '#f0fdf4',
  green700:    '#15803d',
  green300:    '#86efac',
  red50:       '#fef2f2',
  red700:      '#b91c1c',
  red300:      '#fca5a5',
  orange700:   '#c2410c',
  orange300:   '#fdba74',
  blue700:     '#1d4ed8',
  blue300:     '#93c5fd',
};

// ── Reusable labelled input ────────────────────────────────────────────────────
const LabeledInput = ({ label, value, onChange, placeholder, secureTextEntry, keyboardType, style }) => (
  <View style={style}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────
const SuperadminDashboard = ({ username, onLogout }) => {
  const [stats,         setStats]         = useState(null);
  const [staff,         setStaff]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [editStaff,     setEditStaff]     = useState(null);
  const [editForm,      setEditForm]      = useState({ first_name: '', last_name: '', email: '', password: '' });

  const emptyForm = { username: '', password: '', email: '', first_name: '', last_name: '', name: '', contact_number: '', address: '' };
  const [form, setForm] = useState(emptyForm);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const [s, st] = await Promise.all([superadminGetStats(), superadminGetStaff()]);
      setStats(s);
      setStaff(st);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.username || !form.password) {
      setError('Username and password are required.');
      return;
    }
    try {
      setSaving(true); setError(''); setSuccess('');
      await superadminCreateStaff(form);
      setSuccess(`Staff account "${form.username}" created successfully!`);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (e) {
      try {
        const msg = JSON.parse(e.message);
        setError(Object.values(msg).flat().join(' '));
      } catch {
        setError('Failed to create staff.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      setError(''); setSuccess('');
      await superadminToggleStaff(item.id);
      setSuccess(`${item.username} has been ${item.is_active ? 'deactivated' : 'activated'}.`);
      await load();
    } catch {
      setError('Failed to update staff status.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setError(''); setSuccess('');
      await superadminDeleteStaff(confirmDelete.id);
      setSuccess(`${confirmDelete.username} has been deleted.`);
      setConfirmDelete(null);
      await load();
    } catch {
      setError('Failed to delete staff.');
    }
  };

  const handleEdit = async () => {
    if (!editStaff) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      await superadminEditStaff(editStaff.id, editForm);
      setSuccess(`${editStaff.username} has been updated.`);
      setEditStaff(null);
      await load();
    } catch {
      setError('Failed to update staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
    router.replace("/(auth)/login");
  };

  // ── Stat cards config ─────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Books',   value: stats?.total_books,   icon: bookIcon   },
    { label: 'Total Authors', value: stats?.total_authors, icon: authorIcon },
    { label: 'Total Members', value: stats?.total_members, icon: memberIcon },
    { label: 'Active Loans',  value: stats?.active_loans,  icon: loanIcon,  red: true },
    { label: 'Total Loans',   value: stats?.total_loans,   icon: loanIcon   },
    { label: 'Total Staff',   value: stats?.total_staff,   icon: memberIcon },
  ];

  // ── Staff row ─────────────────────────────────────────────────────────────────
  const renderStaffRow = ({ item, index }) => {
    const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ') || '—';
    const dateJoined = new Date(item.date_joined).toLocaleDateString();

    return (
      <View style={[s.staffRow, index % 2 === 0 ? { backgroundColor: C.white } : { backgroundColor: C.creamLight }]}>
        <View style={s.staffRowHeader}>
          <Text style={s.staffUsername}>{item.username}</Text>
          <View style={[s.statusBadge, item.is_active ? s.statusActive : s.statusInactive]}>
            <Text style={[s.statusText, { color: item.is_active ? C.green700 : C.red700 }]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={s.staffName}>{fullName}</Text>
        <Text style={s.staffMeta}>{item.email || '—'}</Text>
        <Text style={s.staffMeta}>Joined {dateJoined}</Text>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.blue300 }]}
            onPress={() => {
              setEditStaff(item);
              setEditForm({ first_name: item.first_name || '', last_name: item.last_name || '', email: item.email || '', password: '' });
            }}>
            <Text style={[s.actionBtnText, { color: C.blue700 }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, item.is_active ? { borderColor: C.orange300 } : { borderColor: C.green300 }]}
            onPress={() => handleToggle(item)}>
            <Text style={[s.actionBtnText, { color: item.is_active ? C.orange700 : C.green700 }]}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.red300 }]}
            onPress={() => setConfirmDelete(item)}>
            <Text style={[s.actionBtnText, { color: C.red700 }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* ── Top Nav ── */}
      <View style={s.nav}>
        <View style={s.navLeft}>
          <Image source={libraryIcon} style={s.navLogo} resizeMode="contain" />
          <View>
            <Text style={s.navTitle}>Librium</Text>
            <Text style={s.navSubtitle}>SUPER ADMIN PORTAL</Text>
          </View>
        </View>
        <View style={s.navRight}>
          <View style={s.superadminBadge}>
            <Text style={s.superadminBadgeText}>👑 Superadmin</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Welcome line ── */}
        <Text style={s.welcomeText}>
          Welcome, <Text style={{ color: C.yellow }}>{username}</Text>
        </Text>

        {/* ── Alerts ── */}
        {!!error   && (
          <View style={[s.alert, s.alertError]}>
            <Text style={s.alertErrorText}>⚠️  {error}</Text>
          </View>
        )}
        {!!success && (
          <View style={[s.alert, s.alertSuccess]}>
            <Text style={s.alertSuccessText}>✅  {success}</Text>
          </View>
        )}

        {/* ── Stats ── */}
        <Text style={s.sectionTitle}>System Overview</Text>
        <View style={s.statsGrid}>
          {statCards.map(({ label, value, icon, red }) => (
            <View key={label} style={s.statCard}>
              <Image source={icon} style={s.statIcon} resizeMode="contain" />
              {loading
                ? <View style={s.statSkeleton} />
                : <Text style={[s.statValue, red && { color: C.red700 }]}>{value ?? 0}</Text>
              }
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Staff Management ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Staff Accounts</Text>
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => { setShowForm(true); setError(''); setSuccess(''); }}>
            <Text style={s.createBtnText}>＋ Create Staff</Text>
          </TouchableOpacity>
        </View>

        {/* ── Create Staff Form ── */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>New Staff Account</Text>

            <View style={s.formRow}>
              <LabeledInput label="Username *" value={form.username} onChange={v => setForm({ ...form, username: v })} placeholder="librarian01" style={s.formHalf} />
              <LabeledInput label="Password *" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="••••••••" secureTextEntry style={s.formHalf} />
            </View>
            <View style={s.formRow}>
              <LabeledInput label="First Name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} placeholder="Juan" style={s.formHalf} />
              <LabeledInput label="Last Name"  value={form.last_name}  onChange={v => setForm({ ...form, last_name: v })}  placeholder="dela Cruz" style={s.formHalf} />
            </View>
            <LabeledInput label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="juan@library.com" keyboardType="email-address" style={s.formFull} />
            <View style={s.formRow}>
              <LabeledInput label="Full Name *"       value={form.name}           onChange={v => setForm({ ...form, name: v })}           placeholder="Juan dela Cruz" style={s.formHalf} />
              <LabeledInput label="Contact Number *"  value={form.contact_number} onChange={v => setForm({ ...form, contact_number: v })} placeholder="09XXXXXXXXX" keyboardType="phone-pad" style={s.formHalf} />
            </View>
            <LabeledInput label="Address *" value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="123 Main St, City" style={s.formFull} />

            <View style={s.formActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, saving && s.disabledBtn]} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.submitBtnText}>Create Account</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Staff List ── */}
        <View style={s.staffCard}>
          {loading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={C.yellow} size="large" />
              <Text style={s.emptyStateText}>Loading staff...</Text>
            </View>
          ) : staff.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyStateEmoji}>👥</Text>
              <Text style={s.emptyStateTitle}>No staff accounts yet</Text>
              <Text style={s.emptyStateText}>Create a staff account to get started.</Text>
            </View>
          ) : (
            <FlatList
              data={staff}
              keyExtractor={item => String(item.id)}
              renderItem={renderStaffRow}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Edit Staff Modal ── */}
      <Modal visible={!!editStaff} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Staff — {editStaff?.username}</Text>

            <View style={s.formRow}>
              <LabeledInput label="First Name" value={editForm.first_name} onChange={v => setEditForm({ ...editForm, first_name: v })} style={s.formHalf} />
              <LabeledInput label="Last Name"  value={editForm.last_name}  onChange={v => setEditForm({ ...editForm, last_name: v })}  style={s.formHalf} />
            </View>
            <LabeledInput label="Email" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} keyboardType="email-address" style={s.formFull} />
            <LabeledInput label="New Password (leave blank to keep current)" value={editForm.password} onChange={v => setEditForm({ ...editForm, password: v })} placeholder="••••••••" secureTextEntry style={s.formFull} />

            <View style={s.formActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditStaff(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, saving && s.disabledBtn]} onPress={handleEdit} disabled={saving}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.submitBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={!!confirmDelete} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, s.deleteModal]}>
            <Text style={s.deleteEmoji}>🗑️</Text>
            <Text style={s.deleteTitle}>Delete staff account?</Text>
            <Text style={s.deleteBody}>"{confirmDelete?.username}" will be permanently deleted.</Text>
            <View style={s.formActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmDelete(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteFinalBtn} onPress={handleDelete}>
                <Text style={s.submitBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.navBg },

  // Nav
  nav: {
    backgroundColor: C.navBg,
    borderBottomWidth: 2,
    borderBottomColor: C.navBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo:    { width: 36, height: 36 },
  navTitle:   { color: C.yellow, fontSize: 16, fontWeight: '700' },
  navSubtitle:{ color: C.textMuted, fontSize: 9, letterSpacing: 2 },
  navRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  superadminBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(120,80,20,0.35)',
    borderWidth: 1, borderColor: '#a16207',
    borderRadius: 999,
  },
  superadminBadgeText: { color: C.yellow, fontSize: 11, fontWeight: '600' },
  logoutBtn:  { paddingHorizontal: 10, paddingVertical: 6 },
  logoutText: { color: C.textLight, fontSize: 13 },

  // Scroll
  scroll:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, gap: 16 },
  welcomeText:   { color: C.textMid, fontSize: 14 },

  // Alerts
  alert:        { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  alertError:   { backgroundColor: '#fef2f2', borderColor: C.red300 },
  alertSuccess: { backgroundColor: C.green50, borderColor: C.green300 },
  alertErrorText:   { color: C.red700,   fontSize: 13 },
  alertSuccessText: { color: C.green700, fontSize: 13 },

  // Section titles
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: C.white,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  statIcon:     { width: 32, height: 32, marginBottom: 6 },
  statValue:    { fontSize: 22, fontWeight: '700', color: C.navBorder },
  statLabel:    { fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginTop: 2, textAlign: 'center' },
  statSkeleton: { width: 32, height: 24, backgroundColor: C.cream, borderRadius: 4, marginBottom: 2 },

  // Create button
  createBtn: {
    backgroundColor: C.red,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  createBtnText: { color: C.white, fontSize: 13, fontWeight: '600' },

  // Form card
  formCard: {
    backgroundColor: C.white,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
    gap: 10,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  formRow:   { flexDirection: 'row', gap: 10 },
  formHalf:  { flex: 1 },
  formFull:  {},
  label:     { fontSize: 12, fontWeight: '600', color: C.textMid, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.white, color: C.textDark, fontSize: 13,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn:  {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8,
  },
  cancelBtnText: { color: C.textMid, fontSize: 13 },
  submitBtn: {
    backgroundColor: C.red, borderRadius: 6,
    paddingHorizontal: 18, paddingVertical: 8,
    minWidth: 110, alignItems: 'center',
  },
  submitBtnText: { color: C.white, fontSize: 13, fontWeight: '600' },
  disabledBtn: { opacity: 0.6 },

  // Staff list card
  staffCard: {
    backgroundColor: C.white,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  staffRow: {
    padding: 14,
    borderTopWidth: 1, borderTopColor: C.cream,
    gap: 3,
  },
  staffRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  staffUsername: { fontSize: 14, fontWeight: '700', color: C.textDark },
  staffName:     { fontSize: 13, color: C.textMid },
  staffMeta:     { fontSize: 12, color: C.textMuted },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  statusActive:   { backgroundColor: C.green50,  borderColor: C.green300 },
  statusInactive: { backgroundColor: C.red50,    borderColor: C.red300   },
  statusText:     { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '500' },

  // Empty state
  emptyState: { padding: 40, alignItems: 'center', gap: 6 },
  emptyStateEmoji: { fontSize: 36 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: C.textMid },
  emptyStateText:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: C.white, borderRadius: 16,
    padding: 24, width: '100%', maxWidth: 440,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 4 },

  // Delete modal
  deleteModal:  { alignItems: 'center' },
  deleteEmoji:  { fontSize: 38 },
  deleteTitle:  { fontSize: 15, fontWeight: '700', color: C.textMid },
  deleteBody:   { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
  deleteFinalBtn: {
    backgroundColor: C.red700, borderRadius: 6,
    paddingHorizontal: 18, paddingVertical: 8,
    minWidth: 80, alignItems: 'center',
  },
});

export default SuperadminDashboard;