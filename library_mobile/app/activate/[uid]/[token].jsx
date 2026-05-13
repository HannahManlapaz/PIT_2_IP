// app/activate/[uid]/[token].jsx
// Deep-link route: yourapp://activate/UID/TOKEN
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ActivateScreen() {
  const { uid, token } = useLocalSearchParams();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"

  useEffect(() => {
    const activate = async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/users/activation/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, token }),
        });

        if (res.status === 204 || res.ok) {
          setStatus("success");
          return;
        }

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        console.log("Status:", res.status);
        console.log("Response:", data);
        setStatus("error");
      } catch (err) {
        console.log("Error:", err);
        setStatus("error");
      }
    };

    if (uid && token) activate();
    else setStatus("error");
  }, [uid, token]);

  return (
    <View style={s.root}>
      {/* Dot pattern background */}
      <View style={s.dotPattern} pointerEvents="none" />

      <View style={s.card}>
        {/* Logo placeholder */}
        <View style={s.logoBox}>
          <Text style={s.logoIcon}>📚</Text>
        </View>

        {/* Loading */}
        {status === "loading" && (
          <View style={s.section}>
            <ActivityIndicator size="large" color="#f59e0b" style={{ marginBottom: 16 }} />
            <Text style={s.title}>Activating your account…</Text>
            <Text style={s.subtitle}>Please wait a moment.</Text>
          </View>
        )}

        {/* Success */}
        {status === "success" && (
          <View style={s.section}>
            <Text style={s.emoji}>✅</Text>
            <Text style={s.title}>Account Activated!</Text>
            <Text style={s.subtitle}>Your account is now active. You can log in.</Text>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.8}
            >
              <Text style={s.btnText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {status === "error" && (
          <View style={s.section}>
            <Text style={s.emoji}>❌</Text>
            <Text style={[s.title, { color: "#b91c1c" }]}>Activation Failed</Text>
            <Text style={s.subtitle}>
              The link may have expired or is invalid. Please register again.
            </Text>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => router.replace("/(auth)/register")}
              activeOpacity={0.8}
            >
              <Text style={s.btnText}>Back to Register</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const FONT = Platform.OS === "ios" ? "Georgia" : "serif";

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0c0a09",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dotPattern: {
    position: "absolute",
    inset: 0,
    opacity: 0.15,
    // RN doesn't support CSS background patterns; the dark bg + card gives the same feel
  },

  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },

  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoIcon: { fontSize: 36 },

  section: { alignItems: "center", width: "100%" },

  emoji: { fontSize: 52, marginBottom: 12 },

  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1c1917",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT,
  },
  subtitle: {
    fontSize: 14,
    color: "#78716c",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: FONT,
  },

  btnPrimary: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#d97706",
    alignItems: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: FONT,
  },
});