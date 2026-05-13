// app/(tabs)/profile.jsx
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator,
  Alert, StyleSheet, StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";
import { getProfile, changePassword, deleteAccount } from "../../lib/api";

// ── Design tokens (matches index.jsx) ────────────────────────────────────────
const C = {
  primary:       "#2C1810",
  secondary:     "#D4A373",
  background:    "#F5F0E1",
  surface:       "#FFFFFF",
  navBg:         "#1A0F0A",
  navBorder:     "rgba(180,83,9,0.35)",
  textPrimary:   "#2C1810",
  textSecondary: "#6B4C3A",
  textMuted:     "#9C7A5A",
  border:        "#E0D5C0",
  cream:         "#F5F0E1",
  creamDark:     "#EDE3D4",
  gold:          "#D4A373",
  goldDark:      "#B8860B",
  green50:       "#F0FDF4",
  green700:      "#15803D",
  red50:         "#FEF2F2",
  red700:        "#B91C1C",
  red300:        "#FCA5A5",
  amber:         "#D97706",
  amberLight:    "#FEF3C7",
  errorBg:       "#FDF0F0",
  error:         "#B22222",
  successBg:     "#F0FDF4",
  success:       "#15803D",
};

const FONTS = {
  logo:    "AllrounderMonumentTest-Medium",
  heading: "LibreBaskerville-SemiBold",
  body:    "LibreBaskerville-Regular",
  medium:  "LibreBaskerville-Medium",
  italic:  "LibreBaskerville-Italic",
};

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, value, placeholder, onChangeText, secureTextEntry = false, keyboardType = "default" }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[s.btnPrimary, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={s.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    "AllrounderMonumentTest-Medium": require("../../assets/fonts/AllrounderMonumentTest-Medium.ttf"),
    "LibreBaskerville-Regular":      require("../../assets/fonts/LibreBaskerville-Regular.ttf"),
    "LibreBaskerville-Medium":       require("../../assets/fonts/LibreBaskerville-Medium.ttf"),
    "LibreBaskerville-SemiBold":     require("../../assets/fonts/LibreBaskerville-SemiBold.ttf"),
    "LibreBaskerville-Italic":       require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("view"); // "view" | "edit" | "password"
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [role,     setRole]     = useState("");
  const [picUri,   setPicUri]   = useState(null);

  const [editForm, setEditForm] = useState({
    name: "", contact_number: "", address: "", birthday: "",
  });

  const [passForm, setPassForm] = useState({
    old_password: "", new_password: "", confirm_password: "",
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const userRole = (await AsyncStorage.getItem("role")) ?? "";
      setRole(userRole);
      try {
        const data = await getProfile();
        setProfile(data);
        setEditForm({
          name:           data.name           ?? "",
          contact_number: data.contact_number ?? "",
          address:        data.address        ?? "",
          birthday:       data.birthday       ?? "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Image picker ──────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
        Alert.alert("Permission required", "Camera roll access is needed to change your profile picture.");
        return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],   
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });
    if (!result.canceled) setPicUri(result.assets[0].uri);
  };

  // ── Update profile ────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    try {
      setSaving(true); setError(""); setSuccess("");
      const token    = await AsyncStorage.getItem("token");
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

      const formData = new FormData();
      formData.append("name",           editForm.name);
      formData.append("contact_number", editForm.contact_number);
      formData.append("address",        editForm.address);
      formData.append("birthday",       editForm.birthday);
      if (picUri) {
        const filename = picUri.split("/").pop() ?? "photo.jpg";
        const ext      = filename.split(".").pop() ?? "jpg";
        formData.append("profile_picture", { uri: picUri, name: filename, type: `image/${ext}` });
      }

      const res = await fetch(`${BASE_URL}/borrower/profile/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setProfile(prev => ({ ...prev, ...updated }));
      setSuccess("Profile updated successfully!");
      setTab("view");
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!passForm.old_password || !passForm.new_password || !passForm.confirm_password) {
      setError("Please fill in all password fields."); return;
    }
    if (passForm.new_password !== passForm.confirm_password) {
      setError("New passwords do not match."); return;
    }
    if (passForm.new_password.length < 8) {
      setError("New password must be at least 8 characters."); return;
    }
    try {
      setSaving(true); setError(""); setSuccess("");
      await changePassword({ old_password: passForm.old_password, new_password: passForm.new_password });
      setSuccess("Password changed successfully!");
      setPassForm({ old_password: "", new_password: "", confirm_password: "" });
      setTab("view");
    } catch {
      setError("Failed to change password. Check your current password.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteAccount(); await handleLogout(); }
          catch { setError("Failed to delete account."); }
        }},
      ]
    );
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
    router.replace("/(auth)/login");
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getRoleLabel = () => {
    if (role === "staff")      return "LIBRARY STAFF";
    if (role === "superadmin") return "SYSTEM ADMINISTRATOR";
    return "LIBRARY MEMBER";
  };

  const initials  = profile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const avatarUri = picUri ?? profile?.profile_picture ?? null;

  if (loading) return (
    <View style={s.loadingState}>
      <ActivityIndicator size="large" color={C.goldDark} />
      <Text style={s.loadingText}>Loading profile…</Text>
    </View>
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* ── Nav ── */}
      <View style={s.nav}>
        <View>
          <Text style={s.navLogo}>LIBRIUM</Text>
          <Text style={s.navPortal}>MY PROFILE</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Feather name="log-out" size={13} color={C.textMuted} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Profile hero ── */}
      <View style={s.hero}>
        <TouchableOpacity
          style={s.avatar}
          onPress={tab === "edit" ? handlePickImage : undefined}
          activeOpacity={tab === "edit" ? 0.7 : 1}
        >
          {avatarUri
            ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
            : <Text style={s.avatarInitials}>{initials}</Text>
          }
          {tab === "edit" && (
            <View style={s.avatarEditBadge}>
              <Feather name="camera" size={11} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={s.heroName}>{profile?.name || "Library User"}</Text>
        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{getRoleLabel()}</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={s.body}>

        {/* Tabs */}
        <View style={s.tabRow}>
          {[
            { key: "view",     label: "Profile",  icon: "user"     },
            { key: "edit",     label: "Edit",     icon: "edit-2"   },
            { key: "password", label: "Password", icon: "lock"     },
          ].map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[s.tabBtn, tab === key && s.tabBtnActive]}
              onPress={() => { setTab(key); setError(""); setSuccess(""); }}
            >
              <Feather name={icon} size={13} color={tab === key ? C.goldDark : C.textMuted} />
              <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alerts */}
        {!!error && (
          <View style={s.alertError}>
            <Feather name="alert-circle" size={13} color={C.error} />
            <Text style={s.alertErrorText}>{error}</Text>
          </View>
        )}
        {!!success && (
          <View style={s.alertSuccess}>
            <Feather name="check-circle" size={13} color={C.success} />
            <Text style={s.alertSuccessText}>{success}</Text>
          </View>
        )}

        {/* ── View Tab ── */}
        {tab === "view" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>PERSONAL INFORMATION</Text>
            {[
              { label: "Full Name",      value: profile?.name,           icon: "user"        },
              { label: "Email Address",  value: profile?.email,          icon: "mail"        },
              { label: "Contact Number", value: profile?.contact_number, icon: "phone"       },
              { label: "Home Address",   value: profile?.address,        icon: "map-pin"     },
              { label: "Birthday",       value: profile?.birthday,       icon: "calendar"    },
              { label: "Age",            value: profile?.age != null ? `${profile.age} years old` : null, icon: "clock" },
            ].map(({ label, value, icon }) => (
              <View key={label} style={s.detailRow}>
                <View style={s.detailIconWrap}>
                  <Feather name={icon} size={13} color={C.textMuted} />
                </View>
                <View style={s.detailContent}>
                  <Text style={s.detailLabel}>{label}</Text>
                  <Text style={[s.detailValue, !value && s.detailValueEmpty]}>
                    {value || "Not provided"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Edit Tab ── */}
        {tab === "edit" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>EDIT PROFILE</Text>

            {/* Avatar picker */}
            <View style={s.pickerRow}>
              <TouchableOpacity style={s.pickerAvatar} onPress={handlePickImage}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={s.pickerAvatarImg} />
                  : <Text style={{ fontSize: 22 }}>👤</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.pickerBtn} onPress={handlePickImage}>
                <Feather name="camera" size={14} color={C.textSecondary} />
                <Text style={s.pickerBtnText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            <Field label="FULL NAME"       value={editForm.name}           placeholder="Juan dela Cruz"
              onChangeText={v => setEditForm(p => ({ ...p, name: v }))} />
            <Field label="CONTACT NUMBER"  value={editForm.contact_number} placeholder="09XX XXX XXXX"
              keyboardType="phone-pad"
              onChangeText={v => setEditForm(p => ({ ...p, contact_number: v }))} />
            <Field label="HOME ADDRESS"    value={editForm.address}         placeholder="City, Province"
              onChangeText={v => setEditForm(p => ({ ...p, address: v }))} />
            <Field label="BIRTHDAY"        value={editForm.birthday}        placeholder="YYYY-MM-DD"
              onChangeText={v => setEditForm(p => ({ ...p, birthday: v }))} />

            <PrimaryButton label={saving ? "Saving…" : "Save Changes"} onPress={handleUpdate} disabled={saving} />
          </View>
        )}

        {/* ── Password Tab ── */}
        {tab === "password" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>CHANGE PASSWORD</Text>
            <Field label="CURRENT PASSWORD"      value={passForm.old_password}     placeholder="••••••••"
              secureTextEntry onChangeText={v => setPassForm(p => ({ ...p, old_password: v }))} />
            <Field label="NEW PASSWORD"          value={passForm.new_password}     placeholder="Min. 8 characters"
              secureTextEntry onChangeText={v => setPassForm(p => ({ ...p, new_password: v }))} />
            <Field label="CONFIRM NEW PASSWORD"  value={passForm.confirm_password} placeholder="Repeat new password"
              secureTextEntry onChangeText={v => setPassForm(p => ({ ...p, confirm_password: v }))} />
            <PrimaryButton label={saving ? "Saving…" : "Change Password"} onPress={handleChangePassword} disabled={saving} />
          </View>
        )}

        {/* ── Actions ── */}
        <View style={s.actions}>
          <TouchableOpacity style={s.btnDelete} onPress={handleDelete} activeOpacity={0.75}>
            <Feather name="trash-2" size={13} color={C.error} />
            <Text style={s.btnDeleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.cream },
  scroll: { paddingBottom: 48 },

  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.cream },
  loadingText:  { fontFamily: FONTS.italic, color: C.textMuted, fontSize: 13, marginTop: 10 },

  // Nav
  nav: {
    backgroundColor: C.navBg,
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.navBorder,
  },
  navLogo:   { fontFamily: FONTS.logo, fontSize: 20, color: C.secondary, letterSpacing: 2 },
  navPortal: { fontFamily: FONTS.body, color: "#57534e", fontSize: 8, letterSpacing: 3, marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(120,113,108,0.3)", borderRadius: 6,
  },
  logoutText: { fontFamily: FONTS.body, color: C.textMuted, fontSize: 11, marginLeft: 4 },

  // Hero
  hero: {
    backgroundColor: C.navBg,
    paddingBottom: 28, paddingTop: 8,
    alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: C.navBorder,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.primary,
    borderWidth: 3, borderColor: C.gold,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10, overflow: "hidden",
  },
  avatarImg:      { width: "100%", height: "100%" },
  avatarInitials: { fontFamily: FONTS.heading, fontSize: 28, color: C.gold },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: C.goldDark, borderRadius: 12,
    width: 24, height: 24, alignItems: "center", justifyContent: "center",
  },
  heroName: { fontFamily: FONTS.heading, fontSize: 18, color: C.surface, marginBottom: 6 },
  rolePill: {
    backgroundColor: "rgba(212,163,115,0.15)",
    borderWidth: 1, borderColor: "rgba(212,163,115,0.3)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  rolePillText: { fontFamily: FONTS.body, color: C.gold, fontSize: 10, letterSpacing: 1.5 },

  // Body
  body: { backgroundColor: C.surface, margin: 12, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Tabs
  tabRow: { flexDirection: "row", marginBottom: 20, borderRadius: 8, overflow: "hidden",
    borderWidth: 1, borderColor: C.border, backgroundColor: C.creamDark,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center",
    flexDirection: "row",
  },
  tabBtnActive:     { backgroundColor: C.surface, borderBottomWidth: 2, borderBottomColor: C.goldDark },
  tabBtnText:       { fontFamily: FONTS.body, fontSize: 11, color: C.textMuted, marginLeft: 4, letterSpacing: 0.5 },
  tabBtnTextActive: { color: C.goldDark, fontFamily: FONTS.medium },

  // Alerts
  alertError: {
    flexDirection: "row", alignItems: "center",
    padding: 10, borderRadius: 8, marginBottom: 14,
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.red300,
  },
  alertErrorText:   { fontFamily: FONTS.body, color: C.error, fontSize: 12, flex: 1, marginLeft: 8 },
  alertSuccess: {
    flexDirection: "row", alignItems: "center",
    padding: 10, borderRadius: 8, marginBottom: 14,
    backgroundColor: C.successBg, borderWidth: 1, borderColor: C.green700 + "40",
  },
  alertSuccessText: { fontFamily: FONTS.body, color: C.success, fontSize: 12, flex: 1, marginLeft: 8 },

  // Section
  section:      { marginBottom: 8 },
  sectionTitle: {
    fontFamily: FONTS.body, color: C.textMuted, fontSize: 9,
    letterSpacing: 2, marginBottom: 14, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },

  // Detail rows
  detailRow:     { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border + "80" },
  detailIconWrap:{ width: 28, paddingTop: 2 },
  detailContent: { flex: 1 },
  detailLabel:   { fontFamily: FONTS.body, color: C.textMuted, fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  detailValue:   { fontFamily: FONTS.medium, color: C.textPrimary, fontSize: 14 },
  detailValueEmpty: { fontFamily: FONTS.italic, color: C.border, fontSize: 13 },

  // Picker
  pickerRow:      { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  pickerAvatar:   { width: 52, height: 52, borderRadius: 26, overflow: "hidden", backgroundColor: C.creamDark, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center", marginRight: 14 },
  pickerAvatarImg:{ width: "100%", height: "100%" },
  pickerBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.creamDark },
  pickerBtnText:  { fontFamily: FONTS.medium, color: C.textSecondary, fontSize: 13, marginLeft: 6 },

  // Field
  fieldLabel: { fontFamily: FONTS.body, color: C.textMuted, fontSize: 9, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: FONTS.body, color: C.textPrimary, fontSize: 13,
  },

  // Buttons
  btnPrimary: {
    paddingVertical: 13, borderRadius: 8, alignItems: "center",
    backgroundColor: C.primary, marginTop: 4,
  },
  btnPrimaryText: { fontFamily: FONTS.medium, color: "#fff", fontSize: 13, letterSpacing: 0.5 },

  actions: { marginTop: 20 },
  btnDelete: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 11, borderRadius: 8,
    borderWidth: 1, borderColor: C.red300, backgroundColor: C.red50,
  },
  btnDeleteText: { fontFamily: FONTS.medium, color: C.error, fontSize: 12, marginLeft: 6 },
});