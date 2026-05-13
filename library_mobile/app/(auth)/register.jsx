import {
  View, Text, TextInput, Pressable,
  ActivityIndicator, ScrollView, Image
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { registerApi } from "../../lib/api";

export default function Register() {
  const [form, setForm] = useState({
    username: "", password: "", re_password: "",
    name: "", email: "", contact_number: "", address: "",
  });
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.IMAGE, // ✅ fixed deprecated API
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setProfilePic(result.assets[0]);
  };

  const handleRegister = async () => {
    const { username, password, re_password, name, email, contact_number, address } = form;
    if (!username || !password || !re_password || !name || !email || !contact_number || !address) {
      setError("Please fill in all fields."); return;
    }
    if (password !== re_password) {
      setError("Passwords do not match."); return;
    }
    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("re_password", re_password);
      formData.append("name", name);
      formData.append("contact_number", contact_number);
      formData.append("address", address);
      if (profilePic) {
        formData.append("profile_picture", {
          uri: profilePic.uri,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      // uses registerApi from lib/api.js which hits /register/
      const data = await registerApi(formData);

      if (data && !data.error && !data.username && !data.email && !data.password) {
        setSuccess("Account created! You can now log in.");
      } else {
        const errs = Object.values(data).flat().join(" ");
        setError(errs || "Registration failed.");
      }
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch = form.re_password !== "" && form.password === form.re_password;
  const passwordMismatch = form.re_password !== "" && form.password !== form.re_password;

  if (success) return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#1c1917" }}>
      <View style={{
        backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 28, alignItems: "center"
      }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📧</Text>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "300", marginBottom: 8 }}>
          Account Created
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
          {success}
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{ backgroundColor: "#d97706", borderRadius: 8, padding: 14, width: "100%", alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Go to Login</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: "#1c1917" }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 24, paddingVertical: 48 }}>

        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            backgroundColor: "rgba(217,119,6,0.1)", borderRadius: 16,
            borderWidth: 1, borderColor: "rgba(217,119,6,0.3)",
            padding: 16, marginBottom: 12
          }}>
            <Text style={{ fontSize: 32 }}>📚</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "300" }}>Become a Member</Text>
          <Text style={{ color: "rgba(251,191,36,0.7)", fontSize: 13, marginTop: 4 }}>
            Join our library community
          </Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24 }}>
          <Text style={{ color: "#1c1917", fontSize: 20, fontWeight: "300", marginBottom: 4 }}>
            Create your account
          </Text>
          <Text style={{ color: "#78716c", fontSize: 13, marginBottom: 20 }}>
            Fill in your details to get started
          </Text>

          {/* Error */}
          {error ? (
            <View style={{
              backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca",
              borderRadius: 8, padding: 10, marginBottom: 16
            }}>
              <Text style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>{error}</Text>
            </View>
          ) : null}

          {/* Profile Picture */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Pressable onPress={pickImage}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                borderWidth: 2, borderColor: "#e7e5e4",
                backgroundColor: "#f5f5f4", overflow: "hidden",
                alignItems: "center", justifyContent: "center"
              }}>
                {profilePic
                  ? <Image source={{ uri: profilePic.uri }} style={{ width: 72, height: 72 }} />
                  : <Text style={{ fontSize: 28 }}>👤</Text>
                }
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#44403c", fontSize: 13, fontWeight: "500", marginBottom: 4 }}>
                Profile Picture (optional)
              </Text>
              <Pressable onPress={pickImage} style={{
                backgroundColor: "#fef3c7", borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start"
              }}>
                <Text style={{ color: "#b45309", fontSize: 13, fontWeight: "500" }}>Choose Photo</Text>
              </Pressable>
            </View>
          </View>

          {/* Fields */}
          {[
            { label: "Full Name *", key: "name", placeholder: "Juan dela Cruz" },
            { label: "Username *", key: "username", placeholder: "juandelacruz" },
            { label: "Email Address *", key: "email", placeholder: "juan@email.com", keyboard: "email-address" },
            { label: "Contact Number *", key: "contact_number", placeholder: "09XX XXX XXXX", keyboard: "phone-pad" },
            { label: "Address *", key: "address", placeholder: "City, Province" },
          ].map(({ label, key, placeholder, keyboard }) => (
            <View key={key} style={{ marginBottom: 14 }}>
              <Text style={{ color: "#44403c", fontSize: 13, fontWeight: "500", marginBottom: 6 }}>{label}</Text>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 8,
                  padding: 12, color: "#1c1917", backgroundColor: "rgba(255,255,255,0.8)"
                }}
                placeholder={placeholder}
                placeholderTextColor="#a8a29e"
                keyboardType={keyboard || "default"}
                autoCapitalize="none"
                value={form[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })}
              />
            </View>
          ))}

          {/* Password */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: "#44403c", fontSize: 13, fontWeight: "500", marginBottom: 6 }}>Password *</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 8, padding: 12, color: "#1c1917" }}
              placeholder="Create a strong password"
              placeholderTextColor="#a8a29e"
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#44403c", fontSize: 13, fontWeight: "500", marginBottom: 6 }}>
              Confirm Password *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: passwordMatch ? "#4ade80" : passwordMismatch ? "#f87171" : "#e7e5e4",
                borderRadius: 8, padding: 12, color: "#1c1917"
              }}
              placeholder="Re-enter your password"
              placeholderTextColor="#a8a29e"
              secureTextEntry
              value={form.re_password}
              onChangeText={(v) => setForm({ ...form, re_password: v })}
            />
            {passwordMatch && (
              <Text style={{ color: "#16a34a", fontSize: 12, marginTop: 4 }}>✓ Passwords match</Text>
            )}
            {passwordMismatch && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>✗ Passwords do not match</Text>
            )}
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: loading ? "rgba(217,119,6,0.5)" : "#d97706",
              borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Create Account</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={{ color: "#78716c", fontSize: 13, textAlign: "center" }}>
              Already have an account?{" "}
              <Text style={{ color: "#d97706", fontWeight: "600" }}>Sign in here</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}