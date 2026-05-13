import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, Image, Switch, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { getBooks, createBook, updateBook, deleteBook, getAuthors } from '../../lib/api';
import BottomSheetModal, { ModalCancelButton, ModalSubmitButton } from '../../lib/BottomSheetModal';

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
  yellow:   '#ca8a04',
  green50:  '#f0fdf4',
  green700: '#15803d',
  green300: '#86efac',
  red50:    '#fef2f2',
  red700:   '#b91c1c',
  red300:   '#fca5a5',
};

const emptyBook = () => ({
  title: '', isbn: '', publication_year: new Date().getFullYear(),
  author: 0, available: true, cover_image: null, description: '',
});

// ── Labelled text input ───────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, keyboardType, multiline, hint }) => (
  <View style={s.fieldWrap}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, multiline && s.textArea]}
      value={String(value ?? '')}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
      autoCapitalize="none"
    />
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────
const BookTable = () => {
  const [books,         setBooks]         = useState([]);
  const [authors,       setAuthors]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form,          setForm]          = useState(emptyBook());
  const [saving,        setSaving]        = useState(false);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [imageFile,     setImageFile]     = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [b, a] = await Promise.all([getBooks(), getAuthors()]);
      setBooks(b); setAuthors(a);
    } catch { setError('Failed to load books.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyBook()); setEditing(null);
    setImagePreview(null); setImageFile(null);
    setError(''); setShowForm(true);
  };
  const openEdit = (book) => {
    setForm({
      title: book.title, isbn: book.isbn,
      publication_year: book.publication_year,
      author: book.author, available: book.available,
      cover_image: book.cover_image ?? null,
      description: book.description ?? '',
    });
    setImagePreview(book.cover_image_url ?? null);
    setImageFile(null);
    setEditing(book); setError(''); setShowForm(true);
  };

  // expo-image-picker replaces the web <input type="file">
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Camera roll permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImagePreview(asset.uri);
      // Build a file-like object for the API (FormData compatible)
      const fileObj = { uri: asset.uri, name: asset.fileName ?? 'cover.jpg', type: asset.mimeType ?? 'image/jpeg' };
      setImageFile(fileObj);
      setForm(f => ({ ...f, cover_image: fileObj }));
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.isbn || !form.author) {
      setError('Please fill in all required fields.'); return;
    }
    try {
      setSaving(true); setError('');
      const payload = { ...form, cover_image: imageFile ?? form.cover_image };
      if (editing) await updateBook(editing.id, payload);
      else await createBook(payload);
      setShowForm(false); await load();
    } catch { setError('Failed to save book.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteBook(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete book.'); }
  };

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn.includes(search)
  );
  const authorName = (id) => authors.find(a => a.id === id)?.name ?? '—';

  // ── Book card ───────────────────────────────────────────────────────────────
  const renderItem = ({ item: book }) => (
    <View style={s.card}>
      {/* Cover */}
      <View style={s.coverWrap}>
        {book.cover_image_url
          ? <Image source={{ uri: book.cover_image_url }} style={s.cover} resizeMode="cover" />
          : (
            <View style={s.coverPlaceholder}>
              <Text style={s.coverPlaceholderIcon}>📖</Text>
            </View>
          )}
        <View style={[s.availBadge, book.available ? s.availTrue : s.availFalse]}>
          <Text style={[s.availText, { color: book.available ? C.green700 : C.red700 }]}>
            {book.available ? 'Available' : 'On Loan'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.cardInfo}>
        <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={s.bookAuthor} numberOfLines={1}>{authorName(book.author)}</Text>
        <Text style={s.bookYear}>{book.publication_year}</Text>
        <View style={s.cardActions}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: C.yellow }]} onPress={() => openEdit(book)}>
            <Text style={[s.actionBtnText, { color: C.yellow }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: C.red300 }]} onPress={() => setConfirmDelete(book)}>
            <Text style={[s.actionBtnText, { color: C.red700 }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading books…</Text>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View>
          <Text style={s.pageTitle}>Books</Text>
          <Text style={s.pageSubtitle}>Manage the library collection</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Add Book</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.alertError}>
          <Text style={s.alertErrorText}>⚠️  {error}</Text>
        </View>
      )}

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search} onChangeText={setSearch}
          placeholder="Search by title or ISBN…"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        <Text style={s.recordCount}>
          {filtered.length} book{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Grid — two columns */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTitle}>No books found</Text>
          <Text style={s.emptyBody}>Try a different search or add a new book.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <BottomSheetModal
        visible={showForm}
        title={editing ? 'Edit Book' : 'Add New Book'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <ModalCancelButton onPress={() => setShowForm(false)} />
            <ModalSubmitButton
              onPress={handleSave}
              label={editing ? 'Save Changes' : 'Add Book'}
              loading={saving} loadingLabel="Saving…" disabled={saving}
            />
          </>
        }>
        {!!error && (
          <View style={[s.alertError, { marginBottom: 14 }]}>
            <Text style={s.alertErrorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* Cover image picker */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Cover Image</Text>
          <View style={s.coverPickerRow}>
            <View style={s.coverPreviewBox}>
              {imagePreview
                ? <Image source={{ uri: imagePreview }} style={s.coverPreviewImg} resizeMode="cover" />
                : <Text style={{ fontSize: 26, color: C.border }}>📖</Text>}
            </View>
            <TouchableOpacity style={s.coverPickerBtn} onPress={pickImage}>
              <Text style={s.coverPickerBtnText}>📂  Choose from library</Text>
              <Text style={s.hint}>PNG, JPG up to 5 MB</Text>
            </TouchableOpacity>
          </View>
          {!!imageFile?.name && <Text style={s.hint}>{imageFile.name}</Text>}
        </View>

        <Field label="Title *" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="Book title" />

        <View style={s.formRow}>
          <View style={{ flex: 1 }}>
            <Field label="ISBN *" value={form.isbn} onChange={v => setForm({ ...form, isbn: v })} placeholder="978-…" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Year" value={String(form.publication_year)} onChange={v => setForm({ ...form, publication_year: parseInt(v) || 0 })} keyboardType="number-pad" />
          </View>
        </View>

        {/* Author picker */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Author *</Text>
          <View style={s.pickerWrap}>
            <Picker
              selectedValue={form.author}
              onValueChange={v => setForm({ ...form, author: v })}
              style={s.picker}>
              <Picker.Item label="Select an author…" value={0} />
              {authors.map(a => <Picker.Item key={a.id} label={a.name} value={a.id} />)}
            </Picker>
          </View>
        </View>

        <Field
          label="Description"
          value={form.description}
          onChange={v => setForm({ ...form, description: v })}
          placeholder="Write a short description about this book…"
          multiline
          hint="This will show when borrowers click the About button."
        />

        {/* Available toggle */}
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Available for borrowing</Text>
          <Switch
            value={form.available}
            onValueChange={v => setForm({ ...form, available: v })}
            trackColor={{ true: C.red, false: C.border }}
            thumbColor={C.white}
          />
        </View>
      </BottomSheetModal>

      {/* ── Delete Confirm ── */}
      <BottomSheetModal
        visible={!!confirmDelete}
        title="Delete Book"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setConfirmDelete(null)} />
            <ModalSubmitButton onPress={handleDelete} label="Delete" color="#b91c1c" />
          </>
        }>
        <View style={s.confirmBody}>
          <Text style={s.confirmEmoji}>🗑️</Text>
          <Text style={s.confirmTitle}>
            Delete <Text style={{ fontWeight: '700' }}>"{confirmDelete?.title}"</Text>?
          </Text>
          <Text style={s.confirmNote}>This action cannot be undone.</Text>
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default BookTable;

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, padding: 16 },

  header:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.cream },
  headerAccent:{ position: 'absolute', bottom: -2, left: 0, width: 48, height: 2, backgroundColor: C.red },
  pageTitle:   { fontSize: 26, fontWeight: '800', color: C.textDark },
  pageSubtitle:{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  addBtn:      { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  addBtnText:  { color: C.white, fontWeight: '700', fontSize: 13 },

  alertError:     { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertErrorText: { color: C.red700, fontSize: 13 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  recordCount: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  // Book card (2-column grid item)
  card:        { flex: 1, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  coverWrap:   { width: '100%', aspectRatio: 2 / 3, backgroundColor: C.cream },
  cover:       { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderIcon: { fontSize: 32, color: C.border },
  availBadge:  { position: 'absolute', top: 6, right: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  availTrue:   { backgroundColor: C.green50, borderColor: '#86efac' },
  availFalse:  { backgroundColor: C.red50, borderColor: C.red300 },
  availText:   { fontSize: 9, fontWeight: '700' },
  cardInfo:    { padding: 10 },
  bookTitle:   { fontSize: 13, fontWeight: '700', color: C.textDark, lineHeight: 18, marginBottom: 2 },
  bookAuthor:  { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginBottom: 2 },
  bookYear:    { fontSize: 11, color: C.border, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn:   { flex: 1, paddingVertical: 5, borderRadius: 5, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  centerStateText: { color: C.textMuted, fontStyle: 'italic' },
  emptyState:  { alignItems: 'center', padding: 40, gap: 6 },
  emptyEmoji:  { fontSize: 40 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: C.textMid },
  emptyBody:   { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },

  // Form
  fieldWrap:   { marginBottom: 14 },
  label:       { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:       { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  textArea:    { minHeight: 90, paddingTop: 10 },
  hint:        { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
  formRow:     { flexDirection: 'row', gap: 10 },
  pickerWrap:  { borderWidth: 1, borderColor: C.border, borderRadius: 7, backgroundColor: C.white, overflow: 'hidden' },
  picker:      { height: 48, color: C.textDark },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  toggleLabel: { fontSize: 14, color: C.textMid, fontWeight: '500' },

  // Cover image picker
  coverPickerRow:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  coverPreviewBox: { width: 68, height: 96, backgroundColor: C.cream, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverPreviewImg: { width: '100%', height: '100%' },
  coverPickerBtn:  { flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  coverPickerBtnText: { fontSize: 13, color: C.textMid, fontWeight: '600' },

  // Confirm
  confirmBody:  { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji: { fontSize: 38 },
  confirmTitle: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
});