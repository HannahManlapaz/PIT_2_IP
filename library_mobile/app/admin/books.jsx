// app/admin/books.jsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, Image, Switch, Modal, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {
  getBooks, createBook, updateBook, deleteBook,
  getAuthors, getCategories, getDepartments,
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
};

const emptyBook = () => ({
  title: '', isbn: '', publication_year: new Date().getFullYear(),
  author: 0, available: true, cover_image: null, description: '',
  category: null, department: null,
});

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

const BookTable = () => {
  const [books,         setBooks]         = useState([]);
  const [authors,       setAuthors]       = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [departments,   setDepartments]   = useState([]);
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

  // ── Filter state ────────────────────────────────────────────────────────────
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCategory,  setFilterCategory]  = useState(null);
  const [filterDept,      setFilterDept]      = useState(null);
  const [filterAuthor,    setFilterAuthor]     = useState(null);
  const [filterAvail,     setFilterAvail]      = useState('all'); // 'all' | 'available' | 'on_loan'
  const [filterYearMin,   setFilterYearMin]    = useState('');
  const [filterYearMax,   setFilterYearMax]    = useState('');
  // draft state (inside drawer before Apply)
  const [draftCategory,   setDraftCategory]   = useState(null);
  const [draftDept,       setDraftDept]        = useState(null);
  const [draftAuthor,     setDraftAuthor]      = useState(null);
  const [draftAvail,      setDraftAvail]       = useState('all');
  const [draftYearMin,    setDraftYearMin]     = useState('');
  const [draftYearMax,    setDraftYearMax]     = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [b, a, cats, depts] = await Promise.all([
        getBooks(), getAuthors(), getCategories(), getDepartments(),
      ]);
      setBooks(b); setAuthors(a); setCategories(cats); setDepartments(depts);
    } catch { setError('Failed to load books.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Active filter count ──────────────────────────────────────────────────────
  const activeFilterCount = [
    filterCategory !== null,
    filterDept     !== null,
    filterAuthor   !== null,
    filterAvail    !== 'all',
    filterYearMin  !== '',
    filterYearMax  !== '',
  ].filter(Boolean).length;

  // ── Computed filtered list ───────────────────────────────────────────────────
  const filtered = books
    .filter(b => {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.isbn.includes(q) ||
        (authors.find(a => a.id === b.author)?.name ?? '').toLowerCase().includes(q)
      );
    })
    .filter(b => filterCategory === null || b.category   === filterCategory)
    .filter(b => filterDept     === null || b.department === filterDept)
    .filter(b => filterAuthor   === null || b.author     === filterAuthor)
    .filter(b => {
      if (filterAvail === 'available') return b.available;
      if (filterAvail === 'on_loan')   return !b.available;
      return true;
    })
    .filter(b => filterYearMin === '' || b.publication_year >= parseInt(filterYearMin))
    .filter(b => filterYearMax === '' || b.publication_year <= parseInt(filterYearMax));

  const openFilterModal = () => {
    setDraftCategory(filterCategory);
    setDraftDept(filterDept);
    setDraftAuthor(filterAuthor);
    setDraftAvail(filterAvail);
    setDraftYearMin(filterYearMin);
    setDraftYearMax(filterYearMax);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setFilterCategory(draftCategory);
    setFilterDept(draftDept);
    setFilterAuthor(draftAuthor);
    setFilterAvail(draftAvail);
    setFilterYearMin(draftYearMin);
    setFilterYearMax(draftYearMax);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setDraftCategory(null); setDraftDept(null); setDraftAuthor(null);
    setDraftAvail('all'); setDraftYearMin(''); setDraftYearMax('');
    setFilterCategory(null); setFilterDept(null); setFilterAuthor(null);
    setFilterAvail('all'); setFilterYearMin(''); setFilterYearMax('');
    setShowFilterModal(false);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyBook()); setEditing(null);
    setImagePreview(null); setImageFile(null);
    setError(''); setShowForm(true);
  };

  const openEdit = (book) => {
    setForm({
      title:            book.title,
      isbn:             book.isbn,
      publication_year: book.publication_year,
      author:           book.author,
      available:        book.available ?? true,
      cover_image:      null,
      description:      book.description ?? '',
      category:         book.category   ?? null,
      department:       book.department ?? null,
    });
    setImagePreview(book.cover_image_url ?? null);
    setImageFile(null);
    setEditing(book); setError(''); setShowForm(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Camera roll permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const asset   = result.assets[0];
      const fileObj = { uri: asset.uri, name: asset.fileName ?? 'cover.jpg', type: asset.mimeType ?? 'image/jpeg' };
      setImagePreview(asset.uri); setImageFile(fileObj);
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
      else         await createBook(payload);
      setShowForm(false); await load();
    } catch (e) {
      console.log('Save error:', JSON.stringify(e?.response?.data));
      setError('Failed to save book.');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteBook(confirmDelete.id); setConfirmDelete(null); await load(); }
    catch { setError('Failed to delete book.'); }
  };

  const authorName = (id) => authors.find(a => a.id === id)?.name ?? '—';

  // ── Book card ─────────────────────────────────────────────────────────────────
  const renderItem = ({ item: book }) => (
    <View style={s.card}>
      <View style={s.coverWrap}>
        {book.cover_image_url
          ? <Image source={{ uri: book.cover_image_url }} style={s.cover} resizeMode="cover" />
          : <View style={s.coverPlaceholder}><Text style={s.coverPlaceholderIcon}>📖</Text></View>
        }
        <View style={[s.availBadge, book.available ? s.availTrue : s.availFalse]}>
          <Text style={[s.availText, { color: book.available ? C.green700 : C.red700 }]}>
            {book.available ? 'Available' : 'On Loan'}
          </Text>
        </View>
      </View>
      <View style={s.cardInfo}>
        <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={s.bookAuthor} numberOfLines={1}>{authorName(book.author)}</Text>
        <Text style={s.bookYear}>{book.publication_year}</Text>
        {!!book.category_name   && <Text style={s.bookMeta} numberOfLines={1}>📂 {book.category_name}</Text>}
        {!!book.department_name && <Text style={s.bookMeta} numberOfLines={1}>🏫 {book.department_name}</Text>}
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

      {/* Search + Filter */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search} onChangeText={setSearch}
          placeholder="Search by title, ISBN, or author…"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={openFilterModal}
        >
          <Text style={[s.filterBtnText, activeFilterCount > 0 && { color: C.white }]}>
            ⚙ Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }} contentContainerStyle={s.chipsRow}>
          {filterCategory !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>📂 {categories.find(c => c.id === filterCategory)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterCategory(null)} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {filterDept !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>🏫 {departments.find(d => d.id === filterDept)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterDept(null)} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {filterAuthor !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>✍️ {authors.find(a => a.id === filterAuthor)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterAuthor(null)} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {filterAvail !== 'all' && (
            <View style={s.chip}>
              <Text style={s.chipText}>{filterAvail === 'available' ? '✅ Available' : '📕 On Loan'}</Text>
              <TouchableOpacity onPress={() => setFilterAvail('all')} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {(filterYearMin !== '' || filterYearMax !== '') && (
            <View style={s.chip}>
              <Text style={s.chipText}>
                📅 {filterYearMin || '…'} – {filterYearMax || '…'}
              </Text>
              <TouchableOpacity onPress={() => { setFilterYearMin(''); setFilterYearMax(''); }} hitSlop={8}>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={s.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Text style={s.recordCount}>{filtered.length} book{filtered.length !== 1 ? 's' : ''}</Text>

      {/* Grid */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTitle}>No books found</Text>
          <Text style={s.emptyBody}>
            {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Add a new book to get started.'}
          </Text>
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

      {/* ══════════════════════════════════════════════════
          FILTER DRAWER
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
            <View style={s.drawerHandle} />
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Filter Books</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={s.drawerClearText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.drawerBody}>

              {/* Availability */}
              <Text style={s.drawerSectionLabel}>Availability</Text>
              <View style={s.drawerChipRow}>
                {[
                  { key: 'all',       label: 'All' },
                  { key: 'available', label: '✅ Available' },
                  { key: 'on_loan',   label: '📕 On Loan' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.drawerChip, draftAvail === key && s.drawerChipActive]}
                    onPress={() => setDraftAvail(key)}
                  >
                    <Text style={[s.drawerChipText, draftAvail === key && s.drawerChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Category</Text>
              {categories.length === 0
                ? <Text style={s.drawerNoData}>No categories created yet.</Text>
                : (
                  <View style={s.drawerChipRow}>
                    <TouchableOpacity
                      style={[s.drawerChip, draftCategory === null && s.drawerChipActive]}
                      onPress={() => setDraftCategory(null)}
                    >
                      <Text style={[s.drawerChipText, draftCategory === null && s.drawerChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[s.drawerChip, draftCategory === c.id && s.drawerChipActive]}
                        onPress={() => setDraftCategory(c.id)}
                      >
                        <Text style={[s.drawerChipText, draftCategory === c.id && s.drawerChipTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              }

              {/* Department */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Department</Text>
              {departments.length === 0
                ? <Text style={s.drawerNoData}>No departments created yet.</Text>
                : (
                  <View style={s.drawerChipRow}>
                    <TouchableOpacity
                      style={[s.drawerChip, draftDept === null && s.drawerChipActive]}
                      onPress={() => setDraftDept(null)}
                    >
                      <Text style={[s.drawerChipText, draftDept === null && s.drawerChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {departments.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[s.drawerChip, draftDept === d.id && s.drawerChipActive]}
                        onPress={() => setDraftDept(d.id)}
                      >
                        <Text style={[s.drawerChipText, draftDept === d.id && s.drawerChipTextActive]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              }

              {/* Author */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Author</Text>
              {authors.length === 0
                ? <Text style={s.drawerNoData}>No authors found.</Text>
                : (
                  <View style={s.drawerChipRow}>
                    <TouchableOpacity
                      style={[s.drawerChip, draftAuthor === null && s.drawerChipActive]}
                      onPress={() => setDraftAuthor(null)}
                    >
                      <Text style={[s.drawerChipText, draftAuthor === null && s.drawerChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {authors.map(a => (
                      <TouchableOpacity
                        key={a.id}
                        style={[s.drawerChip, draftAuthor === a.id && s.drawerChipActive]}
                        onPress={() => setDraftAuthor(a.id)}
                      >
                        <Text style={[s.drawerChipText, draftAuthor === a.id && s.drawerChipTextActive]}>
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              }

              {/* Publication Year */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Publication Year</Text>
              <View style={s.yearRow}>
                <View style={s.yearField}>
                  <Text style={s.yearLabel}>From</Text>
                  <TextInput
                    style={s.yearInput}
                    value={draftYearMin}
                    onChangeText={setDraftYearMin}
                    placeholder="e.g. 2000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <Text style={s.yearDash}>–</Text>
                <View style={s.yearField}>
                  <Text style={s.yearLabel}>To</Text>
                  <TextInput
                    style={s.yearInput}
                    value={draftYearMax}
                    onChangeText={setDraftYearMax}
                    placeholder="e.g. 2024"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

            </ScrollView>

            <View style={s.drawerFooter}>
              <TouchableOpacity style={s.applyBtn} onPress={applyFilters}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

        <View style={s.fieldWrap}>
          <Text style={s.label}>Cover Image</Text>
          <View style={s.coverPickerRow}>
            <View style={s.coverPreviewBox}>
              {imagePreview
                ? <Image source={{ uri: imagePreview }} style={s.coverPreviewImg} resizeMode="cover" />
                : <Text style={{ fontSize: 26, color: C.border }}>📖</Text>
              }
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
            <Field
              label="Year"
              value={String(form.publication_year)}
              onChange={v => setForm({ ...form, publication_year: parseInt(v) || 0 })}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Author *</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.author} onValueChange={v => setForm({ ...form, author: v })} style={s.picker}>
              <Picker.Item label="Select an author…" value={0} />
              {authors.map(a => <Picker.Item key={a.id} label={a.name} value={a.id} />)}
            </Picker>
          </View>
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Category</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.category} onValueChange={v => setForm({ ...form, category: v || null })} style={s.picker}>
              <Picker.Item label="No category…" value={null} />
              {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
            </Picker>
          </View>
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Department</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={form.department} onValueChange={v => setForm({ ...form, department: v || null })} style={s.picker}>
              <Picker.Item label="No department…" value={null} />
              {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.id} />)}
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

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 16 },

  header:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.cream },
  headerAccent: { position: 'absolute', bottom: -2, left: 0, width: 48, height: 2, backgroundColor: C.red },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.textDark },
  pageSubtitle: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  addBtn:       { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  addBtnText:   { color: C.white, fontWeight: '700', fontSize: 13 },

  alertError:     { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300, borderRadius: 8, padding: 12, marginBottom: 12 },
  alertErrorText: { color: C.red700, fontSize: 13 },

  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput:    { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  filterBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  filterBtnActive:{ backgroundColor: C.red, borderColor: C.red },
  filterBtnText:  { fontSize: 12, fontWeight: '600', color: C.textMid },

  chipsRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingBottom: 4 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.red, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText:     { fontSize: 11, color: C.white, fontWeight: '600' },
  chipX:        { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  clearAllText: { fontSize: 11, color: C.red700, fontStyle: 'italic', paddingHorizontal: 4 },

  recordCount:  { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginBottom: 10 },

  card:               { flex: 1, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  coverWrap:          { width: '100%', aspectRatio: 2 / 3, backgroundColor: C.cream },
  cover:              { width: '100%', height: '100%' },
  coverPlaceholder:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderIcon: { fontSize: 32, color: C.border },
  availBadge:         { position: 'absolute', top: 6, right: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  availTrue:          { backgroundColor: C.green50, borderColor: '#86efac' },
  availFalse:         { backgroundColor: C.red50, borderColor: C.red300 },
  availText:          { fontSize: 9, fontWeight: '700' },
  cardInfo:           { padding: 10 },
  bookTitle:          { fontSize: 13, fontWeight: '700', color: C.textDark, lineHeight: 18, marginBottom: 2 },
  bookAuthor:         { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginBottom: 2 },
  bookYear:           { fontSize: 11, color: C.border, marginBottom: 4 },
  bookMeta:           { fontSize: 10, color: C.textMuted, marginBottom: 2 },
  cardActions:        { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionBtn:          { flex: 1, paddingVertical: 5, borderRadius: 5, borderWidth: 1, alignItems: 'center' },
  actionBtnText:      { fontSize: 11, fontWeight: '600' },

  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  centerStateText: { color: C.textMuted, fontStyle: 'italic' },
  emptyState:      { alignItems: 'center', padding: 40, gap: 6 },
  emptyEmoji:      { fontSize: 40 },
  emptyTitle:      { fontSize: 17, fontWeight: '700', color: C.textMid },
  emptyBody:       { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },

  // Filter drawer
  drawerOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  drawerSheet:    { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 32 },
  drawerHandle:   { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  drawerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cream },
  drawerTitle:    { fontSize: 16, fontWeight: '700', color: C.textDark },
  drawerClearText:{ fontSize: 13, color: C.red700 },
  drawerBody:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  drawerSectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' },
  drawerChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drawerChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  drawerChipActive:     { backgroundColor: C.red, borderColor: C.red },
  drawerChipText:       { fontSize: 12, fontWeight: '600', color: C.textMid },
  drawerChipTextActive: { color: C.white },
  drawerNoData:   { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  drawerFooter:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cream },
  applyBtn:       { backgroundColor: C.red, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  applyBtnText:   { color: C.white, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  yearRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearField:  { flex: 1 },
  yearLabel:  { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  yearInput:  { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  yearDash:   { fontSize: 18, color: C.textMuted, marginTop: 16 },

  // Form
  fieldWrap:          { marginBottom: 14 },
  label:              { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:              { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  textArea:           { minHeight: 90, paddingTop: 10 },
  hint:               { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
  formRow:            { flexDirection: 'row', gap: 10 },
  pickerWrap:         { borderWidth: 1, borderColor: C.border, borderRadius: 7, backgroundColor: C.white, overflow: 'hidden' },
  picker:             { height: 48, color: C.textDark },
  toggleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  toggleLabel:        { fontSize: 14, color: C.textMid, fontWeight: '500' },
  coverPickerRow:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  coverPreviewBox:    { width: 68, height: 96, backgroundColor: C.cream, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverPreviewImg:    { width: '100%', height: '100%' },
  coverPickerBtn:     { flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  coverPickerBtnText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  confirmBody:  { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji: { fontSize: 38 },
  confirmTitle: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
});