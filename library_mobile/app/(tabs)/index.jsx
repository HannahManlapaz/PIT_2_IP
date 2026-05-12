import {
  View, Text, TextInput, FlatList,
  Pressable, ActivityIndicator, Modal, ScrollView
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  borrowerGetBooks, borrowerBorrow, borrowerReserve,
  borrowerCancelReservation, borrowerMyReservations, logoutApi
} from "../../lib/api";

export default function BrowseScreen() {
  const [books, setBooks] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [borrowing, setBorrowing] = useState(null);
  const [reserving, setReserving] = useState(null);
  const [username, setUsername] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [b, r] = await Promise.all([borrowerGetBooks(), borrowerMyReservations()]);
      setBooks(b); setReservations(r);
    } catch { setError("Failed to load books."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    AsyncStorage.getItem("username").then(u => setUsername(u || ""));
  }, []);

  // Auto-clear alerts
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleBorrow = async (book) => {
    try {
      setBorrowing(book.id); setError(""); setSuccess("");
      await borrowerBorrow(book.id);
      setSuccess(`Borrowed "${book.title}"! Due in 14 days.`);
      setSelectedBook(null);
      await load();
    } catch (e) {
      try { setError(JSON.parse(e.message).error || "Failed to borrow."); }
      catch { setError("Failed to borrow book."); }
    } finally { setBorrowing(null); }
  };

  const handleReserve = async (book) => {
    try {
      setReserving(book.id); setError(""); setSuccess("");
      await borrowerReserve(book.id);
      setSuccess(`"${book.title}" reserved! We'll notify you when available.`);
      setSelectedBook(null);
      await load();
    } catch (e) {
      try { setError(JSON.parse(e.message).error || "Failed to reserve."); }
      catch { setError("Failed to reserve book."); }
    } finally { setReserving(null); }
  };

  const handleCancelReservation = async (reservationId) => {
    try {
      await borrowerCancelReservation(reservationId);
      setSuccess("Reservation cancelled.");
      await load();
    } catch { setError("Failed to cancel reservation."); }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
    router.replace("/(auth)/login");
  };

  const myReservation = (bookId) =>
    reservations.find(r => r.book === bookId && (r.status === "waiting" || r.status === "ready"));

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const availableCount = books.filter(b => b.available).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0e8" }}>

      {/* Nav */}
      <View style={{
        backgroundColor: "#0f0a06", paddingTop: 50, paddingBottom: 12,
        paddingHorizontal: 16, flexDirection: "row",
        alignItems: "center", justifyContent: "space-between",
        borderBottomWidth: 1, borderBottomColor: "rgba(180,83,9,0.4)"
      }}>
        <View>
          <Text style={{ color: "#f59e0b", fontSize: 18, fontWeight: "700" }}>Librium</Text>
          <Text style={{ color: "#57534e", fontSize: 9, letterSpacing: 3 }}>BORROWER PORTAL</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#78716c", fontSize: 12 }}>
            Welcome, <Text style={{ color: "#d6d3d1", fontWeight: "600" }}>{username}</Text>
          </Text>
          <Pressable onPress={handleLogout} style={{
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: "rgba(120,113,108,0.3)",
            borderRadius: 6,
          }}>
            <Text style={{ color: "#78716c", fontSize: 11 }}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Alerts */}
      {error ? (
        <View style={{ backgroundColor: "#fef2f2", borderBottomWidth: 1, borderBottomColor: "#fecaca", padding: 10 }}>
          <Text style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>⚠️ {error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={{ backgroundColor: "#f0fdf4", borderBottomWidth: 1, borderBottomColor: "#bbf7d0", padding: 10 }}>
          <Text style={{ color: "#16a34a", fontSize: 13, textAlign: "center" }}>✅ {success}</Text>
        </View>
      ) : null}

      {/* Stats */}
      <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
        {[
          { label: "Available", value: availableCount, color: "#ca8a04" },
          { label: "Total Books", value: books.length, color: "#ca8a04" },
          { label: "Reservations", value: reservations.filter(r => r.status === "waiting" || r.status === "ready").length, color: "#ca8a04" },
        ].map(({ label, value, color }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: "#fff", borderRadius: 8,
            borderWidth: 1, borderColor: "#cfc4aa",
            padding: 10, alignItems: "center"
          }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color }}>{value}</Text>
            <Text style={{ fontSize: 10, color: "#7a6a52", marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <TextInput
          style={{
            backgroundColor: "#fff", borderWidth: 1, borderColor: "#cfc4aa",
            borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13
          }}
          placeholder="Search by title or author…"
          placeholderTextColor="#a8a29e"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Book Grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ca8a04" size="large" />
          <Text style={{ color: "#7a6a52", marginTop: 8, fontStyle: "italic" }}>Loading books…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={b => String(b.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item: book }) => {
            const res = myReservation(book.id);
            return (
              <Pressable
                onPress={() => setSelectedBook(book)}
                style={{
                  flex: 1, backgroundColor: "#fff", borderRadius: 10,
                  borderWidth: 1, borderColor: "#cfc4aa", overflow: "hidden"
                }}
              >
                {/* Cover */}
                <View style={{ aspectRatio: 2/3, backgroundColor: "#f0ebe0" }}>
                  {book.cover_image_url
                    ? <Image source={{ uri: book.cover_image_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 32 }}>📖</Text>
                      </View>
                  }
                  {/* Status badge */}
                  <View style={{
                    position: "absolute", top: 6, right: 6,
                    backgroundColor: book.available ? "#dcfce7" : "#fee2e2",
                    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
                    borderWidth: 1, borderColor: book.available ? "#86efac" : "#fca5a5"
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: "600", color: book.available ? "#15803d" : "#b91c1c" }}>
                      {book.available ? "Available" : "On Loan"}
                    </Text>
                  </View>
                  {/* Ready ribbon */}
                  {res?.status === "ready" && (
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#eab308", padding: 3 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700", textAlign: "center" }}>🔔 Ready for you!</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{ padding: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#1a1209", marginBottom: 2 }} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#7a6a52", fontStyle: "italic" }} numberOfLines={1}>
                    {book.author_name}
                  </Text>
                  {res?.status === "waiting" && (
                    <Text style={{ fontSize: 9, color: "#d97706", marginTop: 2 }}>📋 Queue #{res.queue_position}</Text>
                  )}

                  {/* Action button */}
                  <Pressable
                    onPress={() => book.available
                      ? handleBorrow(book)
                      : res?.status === "ready"
                        ? handleBorrow(book)
                        : res?.status === "waiting"
                          ? handleCancelReservation(res.id)
                          : handleReserve(book)
                    }
                    style={{
                      marginTop: 6, borderRadius: 5, padding: 6, alignItems: "center",
                      backgroundColor: book.available
                        ? "#6b1d2a"
                        : res?.status === "ready" ? "#eab308"
                        : res?.status === "waiting" ? "transparent"
                        : "#f59e0b",
                      borderWidth: res?.status === "waiting" ? 1 : 0,
                      borderColor: "#fca5a5",
                    }}
                  >
                    {(borrowing === book.id || reserving === book.id)
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{
                          fontSize: 10, fontWeight: "600",
                          color: res?.status === "waiting" ? "#dc2626" : "#fff"
                        }}>
                          {book.available ? "Borrow"
                            : res?.status === "ready" ? "⭐ Borrow Now"
                            : res?.status === "waiting" ? "✕ Cancel"
                            : "🔖 Reserve"}
                        </Text>
                    }
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Book Detail Modal */}
      <Modal visible={!!selectedBook} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "70%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedBook && (
                <>
                  <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                    <View style={{ width: 80, height: 120, backgroundColor: "#f0ebe0", borderRadius: 8, overflow: "hidden" }}>
                      {selectedBook.cover_image_url
                        ? <Image source={{ uri: selectedBook.cover_image_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                        : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 28 }}>📖</Text></View>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1209", marginBottom: 4 }}>{selectedBook.title}</Text>
                      <Text style={{ fontSize: 13, color: "#7a6a52", fontStyle: "italic", marginBottom: 4 }}>{selectedBook.author_name}</Text>
                      <Text style={{ fontSize: 12, color: "#cfc4aa" }}>{selectedBook.publication_year}</Text>
                      <View style={{
                        marginTop: 8, alignSelf: "flex-start",
                        backgroundColor: selectedBook.available ? "#dcfce7" : "#fee2e2",
                        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3
                      }}>
                        <Text style={{ fontSize: 11, color: selectedBook.available ? "#15803d" : "#b91c1c", fontWeight: "600" }}>
                          {selectedBook.available ? "Available" : "On Loan"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: "#555", lineHeight: 18, marginBottom: 20 }}>
                    {selectedBook.description || "No description available for this book."}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable onPress={() => setSelectedBook(null)} style={{
                      flex: 1, padding: 12, borderRadius: 8,
                      borderWidth: 1, borderColor: "#cfc4aa", alignItems: "center"
                    }}>
                      <Text style={{ color: "#7a6a52", fontSize: 13 }}>Close</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => selectedBook.available
                        ? handleBorrow(selectedBook)
                        : handleReserve(selectedBook)
                      }
                      style={{
                        flex: 2, padding: 12, borderRadius: 8, alignItems: "center",
                        backgroundColor: selectedBook.available ? "#6b1d2a" : "#f59e0b"
                      }}
                    >
                      {(borrowing === selectedBook?.id || reserving === selectedBook?.id)
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                            {selectedBook.available ? "Borrow" : "🔖 Reserve"}
                          </Text>
                      }
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}