// app/admin/members.jsx
import { useEffect, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, StyleSheet, Platform, Alert, ScrollView,
} from "react-native";
import { getMembers, createMember, updateMember, deleteMember } from "../../lib/api";

const FONT = Platform.OS === "ios" ? "Georgia" : "serif";
const today = () => new Date().toISOString().split("T")[0];
const emptyForm = () => ({ name: "", email: "", contact_number: "", join_date: today(), address: "" });

const getInitials = (name) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

// Helper to extract the id regardless of what the API calls it
const getMemberId = (m) => m?.id ?? m?.member_id ?? m?.pk;

export default function MembersScreen() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(emptyForm());

  const load = async () => {
    try {
      setLoading(true);
      const d = await getMembers();
      console.log("First member raw:", JSON.stringify(d[0])); // 👈 add this
      setMembers(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error("Load error:", e.response?.config?.url, e.response?.status);
      setError("Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditing(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (m) => {
    setForm({
      name: m.name,
      email: m.email,
      contact_number: m.contact_number ?? "",
      join_date: m.join_date ?? today(),
      address: m.address ?? "",
    });
    setEditing(m);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError("Name and email are required."); return; }

    if (editing) {
      const memberId = getMemberId(editing);
      if (!memberId) {
        setError("Member ID is missing. Cannot update.");
        console.error("editing object has no id:", JSON.stringify(editing));
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await updateMember(getMemberId(editing), form);
      } else {
        await createMember(form);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      console.error("Save error:", e.response?.status, e.response?.data);
      setError("Failed to save member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m) => Alert.alert(
    "Delete Member",
    `Delete "${m.name}"?\nTheir loan history will also be removed.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMember(getMemberId(m));
            await load();
          } catch {
            setError("Failed to delete.");
          }
        },
      },
    ]
  );

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color="#ca8a04" size="large" />
      <Text style={s.loadingText}>Loading members…</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.nav}>
        <View>
          <Text style={s.navTitle}>Members</Text>
          <Text style={s.navSub}>Manage library membership records</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Add Member</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.alertBox}>
          <Text style={s.alertText}>⚠ {error}</Text>
        </View>
      )}

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor="#a8a29e"
        />
        <Text style={s.count}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {filtered.length === 0
        ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🎓</Text>
            <Text style={s.emptyTitle}>No members found</Text>
            <Text style={s.emptySub}>Add your first library member.</Text>
          </View>
        )
        : (
          <FlatList
            data={filtered}
            keyExtractor={(m, index) => {
              const id = getMemberId(m);
              return id != null ? String(id) : String(index);
            }}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            renderItem={({ item: m }) => (
              <View style={s.card}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{getInitials(m.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{m.name}</Text>
                  <Text style={s.cardSub}>{m.email}</Text>
                  {!!m.contact_number && (
                    <Text style={s.cardSub}>📞 {m.contact_number}</Text>
                  )}
                  {!!m.join_date && (
                    <Text style={s.cardMeta}>Joined {m.join_date}</Text>
                  )}
                  {!!m.address && (
                    <Text style={s.cardMeta} numberOfLines={1}>📍 {m.address}</Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={s.btnEdit} onPress={() => openEdit(m)}>
                    <Text style={s.btnEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnDel} onPress={() => handleDelete(m)}>
                    <Text style={s.btnDelText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      }

      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView style={s.modalCard} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? "Edit Member" : "Add New Member"}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={{ fontSize: 20, color: "#7a6a52" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={s.alertBox}>
                <Text style={s.alertText}>⚠ {error}</Text>
              </View>
            )}

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Full Name *"
                  value={form.name}
                  placeholder="Full name"
                  onChangeText={v => setForm(p => ({ ...p, name: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Email *"
                  value={form.email}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  onChangeText={v => setForm(p => ({ ...p, email: v }))}
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Contact Number"
                  value={form.contact_number}
                  placeholder="+63 9XX XXX XXXX"
                  keyboardType="phone-pad"
                  onChangeText={v => setForm(p => ({ ...p, contact_number: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Join Date (YYYY-MM-DD)"
                  value={form.join_date}
                  placeholder="2024-01-01"
                  onChangeText={v => setForm(p => ({ ...p, join_date: v }))}
                />
              </View>
            </View>

            <Field
              label="Address"
              value={form.address}
              placeholder="Home address"
              onChangeText={v => setForm(p => ({ ...p, address: v }))}
            />

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.submitText}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Member"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, placeholder, onChangeText, keyboardType = "default" }) {
  return (
    <View style={{ marginBottom: 12, marginHorizontal: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6b1d2a", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1a1209", fontFamily: FONT },
  cardSub: { fontSize: 12, color: "#3d2f1a", marginTop: 1 },
  cardMeta: { fontSize: 11, color: "#7a6a52", marginTop: 1 },
  btnEdit: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#86efac", borderRadius: 6 },
  btnEditText: { color: "#15803d", fontSize: 11 },
  btnDel: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#fca5a5", borderRadius: 6 },
  btnDelText: { color: "#b91c1c", fontSize: 11 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1a1209", fontFamily: FONT },
  row: { flexDirection: "row", gap: 4 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8, paddingBottom: 24 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#cfc4aa", borderRadius: 8 },
  cancelText: { color: "#3d2f1a", fontSize: 13 },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#6b1d2a", borderRadius: 8 },
  submitText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  fieldLabel: { color: "#3d2f1a", fontSize: 11, fontWeight: "600", marginBottom: 4, fontFamily: FONT },
  input: { borderWidth: 1, borderColor: "#cfc4aa", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#fff", color: "#1a1209", fontSize: 13 },
});