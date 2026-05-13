// app/admin/categories.jsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';
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
};

const emptyForm = { name: '', description: '' };

export default function CategoriesScreen() {
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [search,        setSearch]        = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form,          setForm]          = useState(emptyForm);
  const [saving,        setSaving]        = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch { setError('Failed to load categories.'); }
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

  const openEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description ?? '' });
    setEditing(cat); setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Category name is required.'); return; }
    try {
      setSaving(true); setError('');
      if (editing) {
        await updateCategory(editing.id, form);
        setSuccess(`"${form.name}" updated successfully.`);
      } else {
        await createCategory(form);
        setSuccess(`"${form.name}" created successfully.`);
      }
      setShowForm(false);
      await load();
    } catch { setError('Failed to save category.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCategory(confirmDelete.id);
      setSuccess(`"${confirmDelete.name}" deleted.`);
      setConfirmDelete(null);
      await load();
    } catch { setError('Failed to delete category.'); }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item: cat, index }) => (
    <View style={[s.card, index % 2 === 0 ? { backgroundColor: C.white } : { backgroundColor: '#fdf9f4' }]}>
      <View style={s.cardLeft}>
        <View style={s.iconWrap}>
          <Text style={s.iconText}>📂</Text>
        </View>
        <View style={s.cardInfo}>
          <Text style={s.catName}>{cat.name}</Text>
          {!!cat.description && (
            <Text style={s.catDesc} numberOfLines={2}>{cat.description}</Text>
          )}
        </View>
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: C.yellow }]}
          onPress={() => openEdit(cat)}>
          <Text style={[s.actionBtnText, { color: C.yellow }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: C.red300 }]}
          onPress={() => setConfirmDelete(cat)}>
          <Text style={[s.actionBtnText, { color: C.red700 }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading categories…</Text>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Categories</Text>
          <Text style={s.pageSubtitle}>Manage book categories</Text>
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

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search} onChangeText={setSearch}
          placeholder="Search categories…"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        <Text style={s.recordCount}>
          {filtered.length} categor{filtered.length !== 1 ? 'ies' : 'y'}
        </Text>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📂</Text>
          <Text style={s.emptyTitle}>No categories yet</Text>
          <Text style={s.emptyBody}>Add a category to organize your books.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add / Edit Modal */}
      <BottomSheetModal
        visible={showForm}
        title={editing ? 'Edit Category' : 'New Category'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <ModalCancelButton onPress={() => setShowForm(false)} />
            <ModalSubmitButton
              onPress={handleSave} disabled={saving}
              label={editing ? 'Save Changes' : 'Create Category'}
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
          <Text style={s.label}>Category Name *</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={v => setForm({ ...form, name: v })}
            placeholder="e.g. Textbook, Fiction, Reference…"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
          />
        </View>
        <View style={s.fieldWrap}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={form.description}
            onChangeText={v => setForm({ ...form, description: v })}
            placeholder="Optional description…"
            placeholderTextColor={C.textMuted}
            multiline numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </BottomSheetModal>

      {/* Delete Confirm Modal */}
      <BottomSheetModal
        visible={!!confirmDelete}
        title="Delete Category"
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
            Delete <Text style={{ fontWeight: '700' }}>"{confirmDelete?.name}"</Text>?
          </Text>
          <Text style={s.confirmNote}>
            Books in this category will not be deleted — they'll just have no category assigned.
          </Text>
        </View>
      </BottomSheetModal>
    </View>
  );
}

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

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  recordCount: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  card:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.cream },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  iconText:    { fontSize: 20 },
  cardInfo:    { flex: 1 },
  catName:     { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  catDesc:     { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  emptyState:  { alignItems: 'center', padding: 48, gap: 6 },
  emptyEmoji:  { fontSize: 40 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: C.textMid },
  emptyBody:   { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },

  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerStateText: { color: C.textMuted, fontStyle: 'italic' },

  fieldWrap:  { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:      { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  textArea:   { minHeight: 80, paddingTop: 10 },

  confirmBody:  { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji: { fontSize: 38 },
  confirmTitle: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 8 },
});