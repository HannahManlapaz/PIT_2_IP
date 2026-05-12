import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { borrowerHistory, borrowerReturnRequest } from "../../lib/api";

const FEE_PER_DAY = 20;

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setHistory(await borrowerHistory());
    } catch { setError("Failed to load history."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const isLoanOpen = (l) => !(l.return_verified_date || l.return_date);
  const isOverdue = (l) => isLoanOpen(l) && (l.overdue_days ?? 0) > 0;
  const overdueFee = (l) => (l.overdue_days ?? 0) * FEE_PER_DAY;

  const totalFee = history.filter(l => isOverdue(l)).reduce((s, l) => s + overdueFee(l), 0);

  const handleReturn = async (loan) => {
    try {
      setReturning(loan.id); setError(""); setSuccess("");
      const res = await borrowerReturnRequest(loan.id);
      setSuccess(res.message || `Return request submitted for "${loan.book_title}".`);
      await load();
    } catch (e) {
      try { setError(JSON.parse(e.message).error || "Failed."); }
      catch { setError("Failed to submit return request."); }
    } finally { setReturning(null); }
  };

  const getStatusLabel = (loan) => {
    if (loan.return_verified_date || loan.return_date)
      return { label: "Returned", bg: "#dcfce7", color: "#15803d" };
    if (loan.return_status === "rejected")
      return { label: "✕ Rejected", bg: "#fee2e2", color: "#b91c1c" };
    if (loan.return_requested_date)
      return { label: "Pending", bg: "#fef3c7", color: "#92400e" };
    if (isOverdue(loan))
      return { label: `⚠️ Overdue ${loan.overdue_days}d`, bg: "#fee2e2", color: "#b91c1c" };
    return { label: "Active", bg: "#fef3c7", color: "#92400e" };
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f0e8" }}>
      <ActivityIndicator color="#ca8a04" size="large" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0e8" }}>
      {/* Header */}
      <View style={{
        backgroundColor: "#0f0a06", paddingTop: 50, paddingBottom: 12,
        paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(180,83,9,0.4)"
      }}>
        <Text style={{ color: "#f59e0b", fontSize: 18, fontWeight: "700" }}>My Borrowing History</Text>
      </View>

      {/* Alerts */}
      {error ? (
        <View style={{ backgroundColor: "#fef2f2", padding: 10 }}>
          <Text style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>⚠️ {error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={{ backgroundColor: "#f0fdf4", padding: 10 }}>
          <Text style={{ color: "#16a34a", fontSize: 13, textAlign: "center" }}>✅ {success}</Text>
        </View>
      ) : null}

      {/* Overdue fee banner */}
      {totalFee > 0 && (
        <View style={{
          margin: 12, backgroundColor: "#fef2f2", borderRadius: 8,
          borderWidth: 1, borderColor: "#fca5a5", padding: 12,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center"
        }}>
          <View>
            <Text style={{ color: "#b91c1c", fontWeight: "600", fontSize: 13 }}>⚠️ Outstanding overdue fees</Text>
            <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>Rate: ₱{FEE_PER_DAY}/day per book</Text>
          </View>
          <Text style={{ color: "#b91c1c", fontSize: 20, fontWeight: "700" }}>₱{totalFee.toLocaleString()}</Text>
        </View>
      )}

      {history.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ fontSize: 18, color: "#3d2f1a", marginBottom: 4 }}>No borrowing history yet</Text>
          <Text style={{ color: "#7a6a52", fontStyle: "italic", fontSize: 13 }}>Browse books and start borrowing!</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={l => String(l.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item: loan }) => {
            const { label, bg, color } = getStatusLabel(loan);
            const fee = overdueFee(loan);
            const isRejected = loan.return_status === "rejected";
            return (
              <View style={{
                backgroundColor: "#fff", borderRadius: 10,
                borderWidth: 1, borderColor: isOverdue(loan) ? "#fca5a5" : "#cfc4aa",
                padding: 14,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1209", flex: 1, marginRight: 8 }}>
                    {loan.book_title}
                  </Text>
                  <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color }}>{label}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: "#a8a29e" }}>Loan Date</Text>
                    <Text style={{ fontSize: 12, color: "#7a6a52" }}>{loan.loan_date}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: "#a8a29e" }}>Due Date</Text>
                    <Text style={{ fontSize: 12, color: isOverdue(loan) ? "#dc2626" : "#7a6a52", fontWeight: isOverdue(loan) ? "600" : "400" }}>
                      {loan.due_date ?? "—"}
                    </Text>
                  </View>
                  {(loan.return_verified_date || loan.return_date) && (
                    <View>
                      <Text style={{ fontSize: 10, color: "#a8a29e" }}>Returned</Text>
                      <Text style={{ fontSize: 12, color: "#7a6a52" }}>{loan.return_verified_date ?? loan.return_date}</Text>
                    </View>
                  )}
                </View>

                {isRejected && loan.notes && (
                  <Text style={{ fontSize: 11, color: "#ef4444", fontStyle: "italic", marginBottom: 8 }}>
                    "{loan.notes}"
                  </Text>
                )}

                {fee > 0 && (
                  <Text style={{ fontSize: 12, color: "#b91c1c", fontWeight: "600", marginBottom: 8 }}>
                    Overdue fee: ₱{fee.toLocaleString()} ({loan.overdue_days}d × ₱{FEE_PER_DAY})
                  </Text>
                )}

                {!loan.return_verified_date && !loan.return_date && (
                  <Pressable
                    onPress={() => handleReturn(loan)}
                    disabled={returning === loan.id || !!loan.return_requested_date}
                    style={{
                      padding: 8, borderRadius: 6, alignItems: "center",
                      borderWidth: 1,
                      borderColor: isRejected ? "#fca5a5" : "#93c5fd",
                      backgroundColor: returning === loan.id ? "#f1f5f9" : "transparent"
                    }}
                  >
                    {returning === loan.id
                      ? <ActivityIndicator size="small" color="#ca8a04" />
                      : <Text style={{ fontSize: 12, color: isRejected ? "#dc2626" : "#1d4ed8" }}>
                          {loan.return_requested_date ? "Pending verification…"
                            : isRejected ? "↩ Re-request Return"
                            : "↩ Request Return"}
                        </Text>
                    }
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}