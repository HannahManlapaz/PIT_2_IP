import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginApi } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await loginApi(email, password);
      if (data.token || data.access) {
        await AsyncStorage.setItem("token", data.token || data.access);
        if (data.username) await AsyncStorage.setItem("username", data.username);
        if (data.role) await AsyncStorage.setItem("role", data.role);
        if (data.member_id) await AsyncStorage.setItem("member_id", String(data.member_id));
        router.replace("/(tabs)/");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: "#1c1917" }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 justify-center px-6 py-12">

        {/* Logo & Title */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(217,119,6,0.1)", borderWidth: 1, borderColor: "rgba(217,119,6,0.3)" }}>
            <Text style={{ fontSize: 36 }}>📚</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "300", letterSpacing: 1 }}>
            Librium Portal
          </Text>
          <Text style={{ color: "rgba(251,191,36,0.7)", fontSize: 13, marginTop: 4 }}>
            Library Management System
          </Text>
        </View>

        {/* Card */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          padding: 24,
        }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "300", marginBottom: 4 }}>
            Welcome back
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>
            Sign in to access your dashboard
          </Text>

          {/* Error */}
          {error ? (
            <View style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: 10,
              marginBottom: 16,
            }}>
              <Text style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 12,
              color: "#fff",
              marginBottom: 14,
            }}
            placeholder="Enter your email"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 }}>Password</Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 12,
              color: "#fff",
              marginBottom: 20,
            }}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.3)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? "rgba(217,119,6,0.5)" : "#d97706",
              borderRadius: 8,
              padding: 14,
              alignItems: "center",
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Sign In</Text>
            }
          </Pressable>

          {/* Register link */}
          <Pressable className="mt-5" onPress={() => router.push("/(auth)/register")}>
            <Text style={{ color: "rgba(251,191,36,0.7)", textAlign: "center", fontSize: 13 }}>
              Don't have an account? Register
            </Text>
          </Pressable>
        </View>

        {/* Security Badge */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(255,255,255,0.05)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}>
            <Text style={{ color: "#d97706", fontSize: 11 }}>🔒</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              Secure access • Encrypted connection
            </Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}