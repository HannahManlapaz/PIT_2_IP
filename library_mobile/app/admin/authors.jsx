// app/admin/authors.jsx
import { useEffect, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, StyleSheet, Platform, Alert, ScrollView,
} from "react-native";
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from "../../lib/api";

const FONT = Platform.OS === "ios" ? "Georgia" : "serif";
const emptyForm = () => ({ name: "", biography: "", nationality: "" });

export default function AuthorsScreen() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(emptyForm());

  const load = async () => {
    try { setLoading(true); const d = await getAuthors(); setAuthors(Array.isArray(d) ? d : []); }
    catch { setError("Failed to load authors."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setError(""); setShowForm(true); };
  const openEdit = (a) => { setForm({ name: a.name, biography: a.biography ?? "", nationality: a.nationality ?? "" }); setEditing(a); setError(""); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { setError("Name is required."); return; }
    try {
      setSaving(true); setError("");
      if (editing) await updateAuthor(editing.id, form); else await createAuthor(form);
      setShowForm(false); await load();
    } catch { setError("Failed to save author."); } finally { setSaving(false); }
  };

  const handleDelete = (a) => Alert.alert("Delete Author", `Delete "${a.name}"?\nThis also affects linked books.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { try { await deleteAuthor(a.id); await load(); } catch { setError("Failed to delete."); } } },
  ]);

  const filtered = authors.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.nationality ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator color="#ca8a04" size="large" /><Text style={s.loadingText}>Loading authors…</Text></View>;

  return (
    <View style={s.root}>
      <View style={s.nav}>
        <View><Text style={s.navTitle}>Authors</Text><Text style={s.navSub}>Manage author records</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}><Text style={s.addBtnText}>＋ Add</Text></TouchableOpacity>
      </View>

      {!!error && <View style={s.alertBox}><Text style={s.alertText}>{error}</Text></View>}

      <View style={s.searchRow}>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name or nationality…" placeholderTextColor="#a8a29e" />
        <Text style={s.count}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {filtered.length === 0
        ? <View style={s.empty}><Text style={{ fontSize: 48 }}>✒️</Text><Text style={s.emptyTitle}>No authors found</Text><Text style={s.emptySub}>Add your first author to get started.</Text></View>
        : <FlatList data={filtered} keyExtractor={a => String(a.id)} contentContainerStyle={{ padding: 12, gap: 8 }}
            renderItem={({ item: a }) => (
              <View style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{a.name}</Text>
                  <Text style={s.cardSub}>{a.nationality || "—"}</Text>
                  {!!a.biography && <Text style={s.cardBio} numberOfLines={2}>{a.biography}</Text>}
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={s.btnEdit} onPress={() => openEdit(a)}><Text style={s.btnEditText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={s.btnDel} onPress={() => handleDelete(a)}><Text style={s.btnDelText}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            )} />
      }

      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>{editing ? "Edit Author" : "Add New Author"}</Text>
            {!!error && <View style={s.alertBox}><Text style={s.alertText}>{error}</Text></View>}
            <Field label="Name *" value={form.name} placeholder="Author full name" onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <Field label="Nationality" value={form.nationality} placeholder="e.g. Filipino, American…" onChangeText={v => setForm(p => ({ ...p, nationality: v }))} />
            <Field label="Biography" value={form.biography} placeholder="Short biography…" multiline onChangeText={v => setForm(p => ({ ...p, biography: v }))} />
            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={s.submitText}>{saving ? "Saving…" : editing ? "Save Changes" : "Add Author"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, placeholder, onChangeText, multiline = false }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={[s.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value} placeholder={placeholder} placeholderTextColor="#a8a29e"
        onChangeText={onChangeText} multiline={multiline} autoCapitalize="words" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f0e8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f5f0e8" },
  loadingText: { color: "#7a6a52", fontStyle: "italic" },
  nav: { backgroundColor: "#0f0a06", paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(180,83,9,0.4)" },
  navTitle: { color: "#f59e0b", fontSize: 18, fontWeight: "700", fontFamily: FONT },
  navSub: { color: "#57534e", fontSize: 10, fontStyle: "italic" },
  addBtn: { backgroundColor: "#6b1d2a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  alertBox: { margin: 12, padding: 12, backgroundColor: "#fef2f2", borderRadius: 8, borderWidth: 1, borderColor: "#fca5a5" },
  alertText: { color: "#b91c1c", fontSize: 13 },
  searchRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cfc4aa", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  count: { color: "#7a6a52", fontSize: 12, fontStyle: "italic" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  emptyTitle: { fontSize: 17, color: "#3d2f1a", fontFamily: FONT },
  emptySub: { fontSize: 13, color: "#7a6a52", fontStyle: "italic" },
  card: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#cfc4aa", padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1a1209", fontFamily: FONT },
  cardSub: { fontSize: 12, color: "#7a6a52", marginTop: 2 },
  cardBio: { fontSize: 11, color: "#3d2f1a", marginTop: 4, fontStyle: "italic" },
  btnEdit: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac", borderRadius: 6 },
  btnEditText: { color: "#15803d", fontSize: 11 },
  btnDel: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#fca5a5", borderRadius: 6 },
  btnDelText: { color: "#b91c1c", fontSize: 11 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "85%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1a1209", fontFamily: FONT, marginBottom: 16 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8, paddingBottom: 24 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#cfc4aa", borderRadius: 8 },
  cancelText: { color: "#3d2f1a", fontSize: 13 },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#6b1d2a", borderRadius: 8 },
  submitText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  fieldLabel: { color: "#3d2f1a", fontSize: 11, fontWeight: "600", marginBottom: 4, fontFamily: FONT },
  input: { borderWidth: 1, borderColor: "#cfc4aa", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#fff", color: "#1a1209", fontSize: 13 },
});