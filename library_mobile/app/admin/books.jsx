// app/admin/books.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, Image, Switch, Modal,
  ScrollView, useWindowDimensions, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {
  getBooks, createBook, updateBook, deleteBook,
  getAuthors, getCategories, getDepartments,
} from '../../lib/api';
import BottomSheetModal, { ModalCancelButton, ModalSubmitButton } from '../../lib/BottomSheetModal';

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#faf8f4',
  surface:   '#ffffff',
  cream:     '#f0ebe0',
  border:    '#e8e0d0',
  borderMid: '#cfc4aa',
  textDark:  '#1a1209',
  textMid:   '#3d2f1a',
  textMuted: '#7a6a52',
  red:       '#c0392b',
  redLight:  '#fef2f2',
  redBorder: '#fca5a5',
  redDark:   '#b91c1c',
  yellow:    '#ca8a04',
  green50:   '#e8f5e9',
  green700:  '#2e7d32',
  white:     '#ffffff',
  shelf:     '#c8b89a',
  shelfDark: '#a89070',
  spineColors: ['#c0392b','#2980b9','#27ae60','#8e44ad','#d35400','#16a085','#1a5276','#6d4c41'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Book cover card for the shelf ─────────────────────────────────────────────
const COVER_W = 100;
const COVER_H = 140;

const BookCover = ({ book, spineColor, onPress }) => (
  <TouchableOpacity style={s.bookCard} onPress={onPress} activeOpacity={0.85}>
    <View style={s.cover}>
      {/* spine */}
      <View style={[s.spine, { backgroundColor: spineColor }]} />
      {book.cover_image_url
        ? <Image source={{ uri: book.cover_image_url }} style={s.coverImg} resizeMode="cover" />
        : (
          <View style={[s.coverPlaceholder, { backgroundColor: spineColor + '22' }]}>
            <Text style={s.coverPlaceholderIcon}>📖</Text>
          </View>
        )
      }
      {/* availability dot */}
      <View style={[
        s.availDot,
        book.available ? s.availDotGreen : s.availDotRed,
      ]} />
    </View>
    <Text style={s.cardTitle} numberOfLines={2}>{book.title}</Text>
    <Text style={s.cardAuthor} numberOfLines={1}>{book.authorName}</Text>
  </TouchableOpacity>
);

// ── Category shelf section ────────────────────────────────────────────────────
const ShelfSection = ({ category, books, onBookPress }) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{category}</Text>
      <Text style={s.sectionMeta}>{books.length} book{books.length !== 1 ? 's' : ''}</Text>
    </View>
    <FlatList
      data={books}
      keyExtractor={item => String(item.id)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.shelfTrack}
      renderItem={({ item, index }) => (
        <BookCover
          book={item}
          spineColor={C.spineColors[index % C.spineColors.length]}
          onPress={() => onBookPress(item)}
        />
      )}
    />
    {/* wooden shelf floor */}
    <View style={s.shelfFloor} />
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────
const BookTable = () => {
  const { width } = useWindowDimensions();

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
  const [selectedBook,  setSelectedBook]  = useState(null); // detail sheet
  const [form,          setForm]          = useState(emptyBook());
  const [saving,        setSaving]        = useState(false);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [imageFile,     setImageFile]     = useState(null);

  // filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCategory,  setFilterCategory]  = useState(null);
  const [filterDept,      setFilterDept]      = useState(null);
  const [filterAuthor,    setFilterAuthor]     = useState(null);
  const [filterAvail,     setFilterAvail]      = useState('all');
  const [filterYearMin,   setFilterYearMin]    = useState('');
  const [filterYearMax,   setFilterYearMax]    = useState('');
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

  // ── Computed ─────────────────────────────────────────────────────────────────
  const authorName = (id) => authors.find(a => a.id === id)?.name ?? '—';

  const activeFilterCount = [
    filterCategory !== null, filterDept !== null, filterAuthor !== null,
    filterAvail !== 'all', filterYearMin !== '', filterYearMax !== '',
  ].filter(Boolean).length;

  const filtered = books
    .map(b => ({ ...b, authorName: authorName(b.author) }))
    .filter(b => {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.isbn.includes(q) ||
        b.authorName.toLowerCase().includes(q)
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

  // Group by category name (use category_name if present, else look up from categories list)
  const grouped = filtered.reduce((acc, book) => {
    const catName = book.category_name
      ?? categories.find(c => c.id === book.category)?.name
      ?? 'Uncategorised';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(book);
    return acc;
  }, {});

  // ── Filter handlers ───────────────────────────────────────────────────────────
  const openFilterModal = () => {
    setDraftCategory(filterCategory); setDraftDept(filterDept);
    setDraftAuthor(filterAuthor);     setDraftAvail(filterAvail);
    setDraftYearMin(filterYearMin);   setDraftYearMax(filterYearMax);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setFilterCategory(draftCategory); setFilterDept(draftDept);
    setFilterAuthor(draftAuthor);     setFilterAvail(draftAvail);
    setFilterYearMin(draftYearMin);   setFilterYearMax(draftYearMax);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setDraftCategory(null); setDraftDept(null); setDraftAuthor(null);
    setDraftAvail('all');   setDraftYearMin(''); setDraftYearMax('');
    setFilterCategory(null); setFilterDept(null); setFilterAuthor(null);
    setFilterAvail('all');   setFilterYearMin(''); setFilterYearMax('');
    setShowFilterModal(false);
  };

  // ── Form handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyBook()); setEditing(null);
    setImagePreview(null); setImageFile(null);
    setError(''); setShowForm(true);
  };

  const openEdit = (book) => {
    setSelectedBook(null);
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
      let payload, config;
      if (imageFile) {
        const fd = new FormData();
        fd.append('title',            form.title);
        fd.append('isbn',             form.isbn);
        fd.append('publication_year', String(form.publication_year));
        fd.append('author',           String(form.author));
        fd.append('available',        form.available ? '1' : '0');
        fd.append('description',      form.description ?? '');
        if (form.category   != null) fd.append('category',   String(form.category));
        if (form.department != null) fd.append('department', String(form.department));
        fd.append('cover_image', { uri: imageFile.uri, name: imageFile.name ?? 'cover.jpg', type: imageFile.type ?? 'image/jpeg' });
        payload = fd; config = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        payload = {
          title: form.title, isbn: form.isbn, publication_year: form.publication_year,
          author: form.author, available: form.available, description: form.description ?? '',
          category: form.category ?? null, department: form.department ?? null,
        };
        config = { headers: { 'Content-Type': 'application/json' } };
      }
      if (editing) await updateBook(editing.id, payload, config);
      else         await createBook(payload, config);
      setShowForm(false); await load();
    } catch (e) {
      console.log('Save error:', JSON.stringify(e?.response?.data));
      setError('Failed to save book.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteBook(confirmDelete.id); setConfirmDelete(null); setSelectedBook(null); await load(); }
    catch { setError('Failed to delete book.'); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color={C.red} size="large" />
      <Text style={s.centerStateText}>Loading books…</Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.pageEyebrow}>Library Admin</Text>
          <Text style={s.pageTitle}>Books</Text>
          <Text style={s.pageSubtitle}>Manage the collection</Text>
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

      {/* ── Search + Filter ── */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, ISBN, author…"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={openFilterModal}
        >
          <Text style={[s.filterBtnText, activeFilterCount > 0 && { color: C.white }]}>
            ⚙ {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 4 }} contentContainerStyle={s.chipsRow}>
          {filterCategory !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>📂 {categories.find(c => c.id === filterCategory)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterCategory(null)} hitSlop={8}><Text style={s.chipX}>✕</Text></TouchableOpacity>
            </View>
          )}
          {filterDept !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>🏫 {departments.find(d => d.id === filterDept)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterDept(null)} hitSlop={8}><Text style={s.chipX}>✕</Text></TouchableOpacity>
            </View>
          )}
          {filterAuthor !== null && (
            <View style={s.chip}>
              <Text style={s.chipText}>✍️ {authors.find(a => a.id === filterAuthor)?.name}</Text>
              <TouchableOpacity onPress={() => setFilterAuthor(null)} hitSlop={8}><Text style={s.chipX}>✕</Text></TouchableOpacity>
            </View>
          )}
          {filterAvail !== 'all' && (
            <View style={s.chip}>
              <Text style={s.chipText}>{filterAvail === 'available' ? '✅ Available' : '📕 On Loan'}</Text>
              <TouchableOpacity onPress={() => setFilterAvail('all')} hitSlop={8}><Text style={s.chipX}>✕</Text></TouchableOpacity>
            </View>
          )}
          {(filterYearMin !== '' || filterYearMax !== '') && (
            <View style={s.chip}>
              <Text style={s.chipText}>📅 {filterYearMin || '…'} – {filterYearMax || '…'}</Text>
              <TouchableOpacity onPress={() => { setFilterYearMin(''); setFilterYearMax(''); }} hitSlop={8}><Text style={s.chipX}>✕</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters}><Text style={s.clearAllText}>Clear all</Text></TouchableOpacity>
        </ScrollView>
      )}

      <Text style={s.recordCount}>{filtered.length} book{filtered.length !== 1 ? 's' : ''}</Text>

      {/* ── Shelves ── */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTitle}>No books found</Text>
          <Text style={s.emptyBody}>
            {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Add a new book to get started.'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {Object.entries(grouped).map(([catName, catBooks]) => (
            <ShelfSection
              key={catName}
              category={catName}
              books={catBooks}
              onBookPress={setSelectedBook}
            />
          ))}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOOK DETAIL BOTTOM SHEET
      ══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedBook}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBook(null)}
      >
        <View style={s.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedBook(null)} />
          {selectedBook && (
            <View style={s.detailSheet}>
              <View style={s.drawerHandle} />

              {/* cover + meta */}
              <View style={s.detailTop}>
                <View style={s.detailCoverWrap}>
                  {selectedBook.cover_image_url
                    ? <Image source={{ uri: selectedBook.cover_image_url }} style={s.detailCoverImg} resizeMode="cover" />
                    : <View style={s.detailCoverPlaceholder}><Text style={{ fontSize: 30 }}>📖</Text></View>
                  }
                </View>
                <View style={s.detailMeta}>
                  <Text style={s.detailTitle}>{selectedBook.title}</Text>
                  <Text style={s.detailAuthor}>{authorName(selectedBook.author)}</Text>
                  <View style={[s.availBadge, selectedBook.available ? s.availTrue : s.availFalse]}>
                    <Text style={[s.availText, { color: selectedBook.available ? C.green700 : C.redDark }]}>
                      {selectedBook.available ? 'Available' : 'On Loan'}
                    </Text>
                  </View>
                  <View style={s.detailTags}>
                    {!!selectedBook.category_name && (
                      <View style={s.tag}><Text style={s.tagText}>📂 {selectedBook.category_name}</Text></View>
                    )}
                    {!!selectedBook.department_name && (
                      <View style={s.tag}><Text style={s.tagText}>🏫 {selectedBook.department_name}</Text></View>
                    )}
                    <View style={s.tag}><Text style={s.tagText}>📅 {selectedBook.publication_year}</Text></View>
                  </View>
                </View>
              </View>

              {!!selectedBook.description && (
                <Text style={s.detailDesc} numberOfLines={3}>{selectedBook.description}</Text>
              )}

              {/* actions */}
              <View style={s.detailActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(selectedBook)}>
                  <Text style={s.editBtnText}>✏️  Edit Book</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => { setSelectedBook(null); setConfirmDelete(selectedBook); }}>
                  <Text style={s.delBtnText}>🗑️  Delete</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedBook(null)}>
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          FILTER DRAWER
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={s.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowFilterModal(false)} />
          <View style={s.drawerSheet}>
            <View style={s.drawerHandle} />
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Filter Books</Text>
              <TouchableOpacity onPress={clearFilters}><Text style={s.drawerClearText}>Clear all</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.drawerBody}>
              {/* Availability */}
              <Text style={s.drawerSectionLabel}>Availability</Text>
              <View style={s.drawerChipRow}>
                {[{ key: 'all', label: 'All' }, { key: 'available', label: '✅ Available' }, { key: 'on_loan', label: '📕 On Loan' }].map(({ key, label }) => (
                  <TouchableOpacity key={key} style={[s.drawerChip, draftAvail === key && s.drawerChipActive]} onPress={() => setDraftAvail(key)}>
                    <Text style={[s.drawerChipText, draftAvail === key && s.drawerChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Category</Text>
              {categories.length === 0 ? <Text style={s.drawerNoData}>No categories yet.</Text> : (
                <View style={s.drawerChipRow}>
                  <TouchableOpacity style={[s.drawerChip, draftCategory === null && s.drawerChipActive]} onPress={() => setDraftCategory(null)}>
                    <Text style={[s.drawerChipText, draftCategory === null && s.drawerChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {categories.map(c => (
                    <TouchableOpacity key={c.id} style={[s.drawerChip, draftCategory === c.id && s.drawerChipActive]} onPress={() => setDraftCategory(c.id)}>
                      <Text style={[s.drawerChipText, draftCategory === c.id && s.drawerChipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Department */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Department</Text>
              {departments.length === 0 ? <Text style={s.drawerNoData}>No departments yet.</Text> : (
                <View style={s.drawerChipRow}>
                  <TouchableOpacity style={[s.drawerChip, draftDept === null && s.drawerChipActive]} onPress={() => setDraftDept(null)}>
                    <Text style={[s.drawerChipText, draftDept === null && s.drawerChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {departments.map(d => (
                    <TouchableOpacity key={d.id} style={[s.drawerChip, draftDept === d.id && s.drawerChipActive]} onPress={() => setDraftDept(d.id)}>
                      <Text style={[s.drawerChipText, draftDept === d.id && s.drawerChipTextActive]}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Author */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Author</Text>
              {authors.length === 0 ? <Text style={s.drawerNoData}>No authors found.</Text> : (
                <View style={s.drawerChipRow}>
                  <TouchableOpacity style={[s.drawerChip, draftAuthor === null && s.drawerChipActive]} onPress={() => setDraftAuthor(null)}>
                    <Text style={[s.drawerChipText, draftAuthor === null && s.drawerChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {authors.map(a => (
                    <TouchableOpacity key={a.id} style={[s.drawerChip, draftAuthor === a.id && s.drawerChipActive]} onPress={() => setDraftAuthor(a.id)}>
                      <Text style={[s.drawerChipText, draftAuthor === a.id && s.drawerChipTextActive]}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Year range */}
              <Text style={[s.drawerSectionLabel, { marginTop: 18 }]}>Publication Year</Text>
              <View style={s.yearRow}>
                <View style={s.yearField}>
                  <Text style={s.yearLabel}>From</Text>
                  <TextInput style={s.yearInput} value={draftYearMin} onChangeText={setDraftYearMin} placeholder="e.g. 2000" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={4} />
                </View>
                <Text style={s.yearDash}>–</Text>
                <View style={s.yearField}>
                  <Text style={s.yearLabel}>To</Text>
                  <TextInput style={s.yearInput} value={draftYearMax} onChangeText={setDraftYearMax} placeholder="e.g. 2024" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={4} />
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

      {/* ══════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════════════════════ */}
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
        }
      >
        {!!error && <View style={[s.alertError, { marginBottom: 14 }]}><Text style={s.alertErrorText}>⚠️  {error}</Text></View>}

        {/* Cover image picker */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Cover Image</Text>
          <View style={s.coverPickerRow}>
            <View style={s.coverPreviewBox}>
              {imagePreview
                ? <Image source={{ uri: imagePreview }} style={s.coverPreviewImg} resizeMode="cover" />
                : <Text style={{ fontSize: 26, color: C.borderMid }}>📖</Text>
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
          <View style={{ flex: 1 }}><Field label="ISBN *" value={form.isbn} onChange={v => setForm({ ...form, isbn: v })} placeholder="978-…" /></View>
          <View style={{ flex: 1 }}><Field label="Year" value={String(form.publication_year)} onChange={v => setForm({ ...form, publication_year: parseInt(v) || 0 })} keyboardType="number-pad" /></View>
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
          hint="Shown when borrowers view the book details."
        />

        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Available for borrowing</Text>
          <Switch
            value={form.available}
            onValueChange={v => setForm({ ...form, available: v })}
            trackColor={{ true: C.red, false: C.borderMid }}
            thumbColor={C.white}
          />
        </View>
      </BottomSheetModal>

      {/* ══════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════════════════════════ */}
      <BottomSheetModal
        visible={!!confirmDelete}
        title="Delete Book"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <ModalCancelButton onPress={() => setConfirmDelete(null)} />
            <ModalSubmitButton onPress={handleDelete} label="Delete" color={C.redDark} />
          </>
        }
      >
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },

  // Header
  header:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pageEyebrow:  { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
  pageTitle:    { fontSize: 32, fontWeight: '900', color: C.textDark, letterSpacing: -1, lineHeight: 36 },
  pageSubtitle: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 2 },
  addBtn:       { backgroundColor: C.red, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  addBtnText:   { color: C.white, fontWeight: '700', fontSize: 13 },

  // Alert
  alertError:     { backgroundColor: C.redLight, borderWidth: 1, borderColor: C.redBorder, borderRadius: 8, padding: 12, marginHorizontal: 16, marginTop: 10 },
  alertErrorText: { color: C.redDark, fontSize: 13 },

  // Search
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchWrap:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12 },
  searchIcon:   { fontSize: 14, marginRight: 6 },
  searchInput:  { flex: 1, paddingVertical: 9, fontSize: 13, color: C.textDark },
  filterBtn:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  filterBtnActive: { backgroundColor: C.red, borderColor: C.red },
  filterBtnText:   { fontSize: 12, fontWeight: '600', color: C.textMid },

  // Chips
  chipsRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 4, paddingTop: 6 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.red, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText:     { fontSize: 11, color: C.white, fontWeight: '600' },
  chipX:        { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  clearAllText: { fontSize: 11, color: C.redDark, fontStyle: 'italic', paddingHorizontal: 4 },
  recordCount:  { fontSize: 11, color: C.textMuted, fontStyle: 'italic', paddingHorizontal: 16, marginBottom: 6, marginTop: 4 },

  // ── Shelf layout ─────────────────────────────────────────────────────────────
  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle:  { fontSize: 20, fontWeight: '800', color: C.textDark, letterSpacing: -0.5 },
  sectionMeta:   { fontSize: 11, color: C.textMuted },
  shelfTrack:    { paddingHorizontal: 16, gap: 10 },
  shelfFloor:    { marginHorizontal: 16, height: 6, backgroundColor: C.shelf, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },

  // Book card
  bookCard:           { width: COVER_W, flexDirection: 'column' },
  cover:              { width: COVER_W, height: COVER_H, borderRadius: 3, borderTopRightRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden', position: 'relative',
                        shadowColor: '#000', shadowOffset: { width: 2, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 5 },
  spine:              { position: 'absolute', left: 0, top: 0, width: 8, height: '100%', zIndex: 1 },
  coverImg:           { width: '100%', height: '100%' },
  coverPlaceholder:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderIcon: { fontSize: 28 },
  availDot:           { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.white, zIndex: 2 },
  availDotGreen:      { backgroundColor: '#4caf50' },
  availDotRed:        { backgroundColor: '#ef5350' },
  cardTitle:          { fontSize: 10, fontWeight: '700', color: C.textDark, marginTop: 6, lineHeight: 13, width: COVER_W },
  cardAuthor:         { fontSize: 9, color: C.textMuted, fontStyle: 'italic', marginTop: 2, width: COVER_W },

  // Empty / loading
  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  centerStateText: { color: C.textMuted, fontStyle: 'italic' },
  emptyState:      { alignItems: 'center', padding: 40, gap: 6 },
  emptyEmoji:      { fontSize: 40 },
  emptyTitle:      { fontSize: 17, fontWeight: '700', color: C.textMid },
  emptyBody:       { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },

  // Overlays / drawers
  drawerOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  drawerSheet:    { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82%', paddingBottom: 32 },
  drawerHandle:   { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  drawerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  drawerTitle:    { fontSize: 16, fontWeight: '700', color: C.textDark },
  drawerClearText:{ fontSize: 13, color: C.redDark },
  drawerBody:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  drawerSectionLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' },
  drawerChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drawerChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  drawerChipActive:   { backgroundColor: C.red, borderColor: C.red },
  drawerChipText:     { fontSize: 12, fontWeight: '600', color: C.textMid },
  drawerChipTextActive: { color: C.white },
  drawerNoData:   { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  drawerFooter:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  applyBtn:       { backgroundColor: C.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyBtnText:   { color: C.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  yearRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearField:  { flex: 1 },
  yearLabel:  { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  yearInput:  { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  yearDash:   { fontSize: 18, color: C.textMuted, marginTop: 16 },

  // Detail sheet
  detailSheet:        { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  detailTop:          { flexDirection: 'row', gap: 14, marginBottom: 14 },
  detailCoverWrap:    { width: 80, height: 112, borderRadius: 3, borderTopRightRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden',
                        shadowColor: '#000', shadowOffset: { width: 2, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  detailCoverImg:     { width: '100%', height: '100%' },
  detailCoverPlaceholder: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  detailMeta:         { flex: 1 },
  detailTitle:        { fontSize: 16, fontWeight: '800', color: C.textDark, lineHeight: 21, marginBottom: 3 },
  detailAuthor:       { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginBottom: 8 },
  detailTags:         { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  tag:                { backgroundColor: C.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText:            { fontSize: 10, color: C.textMuted },
  detailDesc:         { fontSize: 13, color: C.textMid, lineHeight: 19, marginBottom: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  detailActions:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  editBtn:            { flex: 1, borderWidth: 1.5, borderColor: C.red, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  editBtnText:        { fontSize: 13, fontWeight: '700', color: C.red },
  delBtn:             { flex: 1, borderWidth: 1.5, borderColor: C.redBorder, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  delBtnText:         { fontSize: 13, fontWeight: '700', color: C.redDark },
  closeBtn:           { backgroundColor: C.cream, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  closeBtnText:       { fontSize: 12, fontWeight: '600', color: C.textMuted },

  // Availability badge (used in detail sheet)
  availBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  availTrue:    { backgroundColor: C.green50, borderColor: '#86efac' },
  availFalse:   { backgroundColor: C.redLight, borderColor: C.redBorder },
  availText:    { fontSize: 10, fontWeight: '700' },

  // Add/Edit form
  fieldWrap:          { marginBottom: 14 },
  label:              { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 5 },
  input:              { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.textDark },
  textArea:           { minHeight: 90, paddingTop: 10 },
  hint:               { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 4 },
  formRow:            { flexDirection: 'row', gap: 10 },
  pickerWrap:         { borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' },
  picker:             { height: 48, color: C.textDark },
  toggleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  toggleLabel:        { fontSize: 14, color: C.textMid, fontWeight: '500' },
  coverPickerRow:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  coverPreviewBox:    { width: 68, height: 96, backgroundColor: C.cream, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverPreviewImg:    { width: '100%', height: '100%' },
  coverPickerBtn:     { flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  coverPickerBtnText: { fontSize: 13, color: C.textMid, fontWeight: '600' },

  // Delete confirm
  confirmBody:  { alignItems: 'center', paddingVertical: 16, gap: 8 },
  confirmEmoji: { fontSize: 38 },
  confirmTitle: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  confirmNote:  { fontSize: 13, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },
});