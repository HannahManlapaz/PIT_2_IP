import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { borrowerMyReservations, borrowerCancelReservation, borrowerGetBooks, borrowerBorrow } from "../../lib/api";

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [r, b] = await Promise.all([borrowerMyReservations(), borrowerGetBooks()]);
      setReservations(r.filter(r => r.status === "waiting" || r.status === "ready"));
      setBooks(b);
    } catch { setError("Failed to load reservations."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleCancel = async (id) => {
    try {
      await borrowerCancelReservation(id);
      setSuccess("Reservation cancelled.");
      await load();
    } catch { setError("Failed to cancel."); }
  };

  const handleBorrowNow = async (res) => {
    const book = books.find(b => b.id === res.book);
    if (!book) return;
    try {
      setBorrowing(res.id);
      await borrowerBorrow(book.id);
      setSuccess(`Borrowed "${book.title}"!`);
      await load();
    } catch (e) {
      try { setError(JSON.parse(e.message).error || "Failed."); }
      catch { setError("Failed to borrow."); }
    } finally { setBorrowing(null); }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f0e8" }}>
      <ActivityIndicator color="#ca8a04" size="large" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0e8" }}>
      <View style={{
        backgroundColor: "#0f0a06", paddingTop: 50, paddingBottom: 12,
        paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(180,83,9,0.4)"
      }}>
        <Text style={{ color: "#f59e0b", fontSize: 18, fontWeight: "700" }}>My Reservations</Text>
      </View>

      {error ? <View style={{ backgroundColor: "#fef2f2", padding: 10 }}><Text style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>⚠️ {error}</Text></View> : null}
      {success ? <View style={{ backgroundColor: "#f0fdf4", padding: 10 }}><Text style={{ color: "#16a34a", fontSize: 13, textAlign: "center" }}>✅ {success}</Text></View> : null}

      {reservations.some(r => r.status === "ready") && (
        <View style={{
          margin: 12, backgroundColor: "#fefce8", borderRadius: 8,
          borderWidth: 1, borderColor: "#fde68a", padding: 12, flexDirection: "row", alignItems: "center", gap: 10
        }}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
          <View>
            <Text style={{ color: "#92400e", fontWeight: "600", fontSize: 13 }}>A reserved book is ready for you!</Text>
            <Text style={{ color: "#b45309", fontSize: 11, marginTop: 2 }}>Tap "Borrow Now" below to claim it.</Text>
          </View>
        </View>
      )}

      {reservations.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔖</Text>
          <Text style={{ fontSize: 18, color: "#3d2f1a", marginBottom: 4 }}>No active reservations</Text>
          <Text style={{ color: "#7a6a52", fontStyle: "italic", fontSize: 13 }}>When a book is On Loan, tap Reserve to join the waitlist!</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item: res }) => (
            <View style={{
              backgroundColor: res.status === "ready" ? "#fefce8" : "#fff",
              borderRadius: 10, borderWidth: 1,
              borderColor: res.status === "ready" ? "#fde68a" : "#cfc4aa",
              padding: 14
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1209", flex: 1 }}>{res.book_title}</Text>
                <View style={{
                  backgroundColor: res.status === "ready" ? "#fef3c7" : "#fef3c7",
                  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#92400e" }}>
                    {res.status === "ready" ? "🔔 Ready!" : "⏳ Waiting"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 10, color: "#a8a29e" }}>Reserved on</Text>
                  <Text style={{ fontSize: 12, color: "#7a6a52" }}>{res.reserved_date}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: "#a8a29e" }}>Queue position</Text>
                  <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "600" }}>
                    {res.status === "ready" ? "🎉 Your turn!" : `#${res.queue_position ?? "—"} in queue`}
                  </Text>
                </View>
              </View>

              {res.status === "ready" ? (
                <Pressable
                  onPress={() => handleBorrowNow(res)}
                  disabled={borrowing === res.id}
                  style={{ backgroundColor: "#eab308", borderRadius: 6, padding: 10, alignItems: "center" }}
                >
                  {borrowing === res.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>⭐ Borrow Now</Text>
                  }
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleCancel(res.id)}
                  style={{ borderWidth: 1, borderColor: "#fca5a5", borderRadius: 6, padding: 10, alignItems: "center" }}
                >
                  <Text style={{ color: "#dc2626", fontSize: 13 }}>✕ Cancel Reservation</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}