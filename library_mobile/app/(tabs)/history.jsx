// app/(tabs)/history.jsx
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  StyleSheet, StatusBar, TouchableOpacity,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";
import { borrowerHistory, borrowerReturnRequest } from "../../lib/api";

const FEE_PER_DAY = 20;

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
  green300:      "#86EFAC",
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

export default function HistoryScreen() {
  const [fontsLoaded] = useFonts({
    "AllrounderMonumentTest-Medium": require("../../assets/fonts/AllrounderMonumentTest-Medium.ttf"),
    "LibreBaskerville-Regular":      require("../../assets/fonts/LibreBaskerville-Regular.ttf"),
    "LibreBaskerville-Medium":       require("../../assets/fonts/LibreBaskerville-Medium.ttf"),
    "LibreBaskerville-SemiBold":     require("../../assets/fonts/LibreBaskerville-SemiBold.ttf"),
    "LibreBaskerville-Italic":       require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [returning, setReturning] = useState(null);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); // ✅ only show spinner on first load
      const data = await borrowerHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch { setError("Failed to load history."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [])

  useFocusEffect(
    useCallback(() => {
      load(true); 
    }, [])
  );

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const isLoanOpen = (l) => !(l.return_verified_date || l.return_date);
  const isOverdue  = (l) => isLoanOpen(l) && (l.overdue_days ?? 0) > 0;
  const overdueFee = (l) => (l.overdue_days ?? 0) * FEE_PER_DAY;
  const totalFee   = history.filter(isOverdue).reduce((s, l) => s + overdueFee(l), 0);

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

  const getStatusInfo = (loan) => {
    if (loan.return_verified_date || loan.return_date)
      return { label: "Returned", bg: C.green50, color: C.green700, icon: "check-circle" };
    if (loan.return_status === "rejected")
      return { label: "Rejected", bg: C.red50, color: C.red700, icon: "x-circle" };
    if (loan.return_requested_date)
      return { label: "Pending", bg: C.amberLight, color: C.amber, icon: "clock" };
    if (isOverdue(loan))
      return { label: `Overdue ${loan.overdue_days}d`, bg: C.red50, color: C.red700, icon: "alert-circle" };
    return { label: "Active", bg: C.amberLight, color: C.amber, icon: "book-open" };
  };

  if (loading) return (
    <View style={s.loadingState}>
      <ActivityIndicator color={C.goldDark} size="large" />
      <Text style={s.loadingText}>Loading history…</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* Nav */}
      <View style={s.nav}>
        <View>
          <Text style={s.navLogo}>LIBRIUM</Text>
          <Text style={s.navPortal}>BORROWING HISTORY</Text>
        </View>
        {totalFee > 0 && (
          <View style={s.feeChip}>
            <Feather name="alert-circle" size={11} color={C.error} />
            <Text style={s.feeChipText}>₱{totalFee.toLocaleString()} due</Text>
          </View>
        )}
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

      {/* Overdue fee banner */}
      {totalFee > 0 && (
        <View style={s.feeBanner}>
          <View style={s.feeBannerLeft}>
            <Text style={s.feeBannerTitle}>⚠️ Outstanding overdue fees</Text>
            <Text style={s.feeBannerSub}>Rate: ₱{FEE_PER_DAY}/day per book</Text>
          </View>
          <Text style={s.feeBannerAmount}>₱{totalFee.toLocaleString()}</Text>
        </View>
      )}

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: "Total Loans",  value: history.length },
          { label: "Active",       value: history.filter(isLoanOpen).length },
          { label: "Overdue",      value: history.filter(isOverdue).length },
        ].map(({ label, value }) => (
          <View key={label} style={s.statCard}>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {history.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTitle}>No borrowing history yet</Text>
          <Text style={s.emptyBody}>Browse books and start borrowing!</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={l => String(l.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: loan }) => {
            const { label, bg, color, icon } = getStatusInfo(loan);
            const fee        = overdueFee(loan);
            const isRejected = loan.return_status === "rejected";
            const isReturned = !!(loan.return_verified_date || loan.return_date);
            const isPending  = !!loan.return_requested_date && !isReturned;

            return (
              <View style={[s.card, isOverdue(loan) && s.cardOverdue]}>
                {/* Title row */}
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={2}>{loan.book_title}</Text>
                  <View style={[s.badge, { backgroundColor: bg }]}>
                    <Feather name={icon} size={9} color={color} style={{ marginRight: 3 }} />
                    <Text style={[s.badgeText, { color }]}>{label}</Text>
                  </View>
                </View>

                {/* Dates */}
                <View style={s.datesRow}>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>Loan Date</Text>
                    <Text style={s.dateValue}>{loan.loan_date}</Text>
                  </View>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>Due Date</Text>
                    <Text style={[s.dateValue, isOverdue(loan) && { color: C.error, fontFamily: FONTS.medium }]}>
                      {loan.due_date ?? "—"}
                    </Text>
                  </View>
                  {(loan.return_verified_date || loan.return_date) && (
                    <View style={s.dateItem}>
                      <Text style={s.dateLabel}>Returned</Text>
                      <Text style={[s.dateValue, { color: C.green700 }]}>
                        {loan.return_verified_date ?? loan.return_date}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Rejection note */}
                {isRejected && loan.notes && (
                  <View style={s.rejectionNote}>
                    <Feather name="message-circle" size={11} color={C.error} />
                    <Text style={s.rejectionText}>"{loan.notes}"</Text>
                  </View>
                )}

                {/* Overdue fee */}
                {fee > 0 && (
                  <View style={s.feeRow}>
                    <Feather name="dollar-sign" size={11} color={C.error} />
                    <Text style={s.feeText}>
                      Overdue fee: ₱{fee.toLocaleString()} ({loan.overdue_days}d × ₱{FEE_PER_DAY})
                    </Text>
                  </View>
                )}

                {/* Return action */}
                {!isReturned && (
                  <Pressable
                    onPress={() => handleReturn(loan)}
                    disabled={returning === loan.id || isPending}
                    style={[
                      s.returnBtn,
                      isPending   && s.returnBtnPending,
                      isRejected  && s.returnBtnRejected,
                      (!isPending && !isRejected) && s.returnBtnDefault,
                    ]}
                  >
                    {returning === loan.id
                      ? <ActivityIndicator size="small" color={C.goldDark} />
                      : <>
                          <Feather
                            name={isPending ? "clock" : "corner-down-left"}
                            size={12}
                            color={isPending ? C.amber : isRejected ? C.error : C.primary}
                          />
                          <Text style={[
                            s.returnBtnText,
                            { color: isPending ? C.amber : isRejected ? C.error : C.primary }
                          ]}>
                            {isPending    ? "Pending verification…"
                             : isRejected ? "Re-request Return"
                             : "Request Return"}
                          </Text>
                        </>
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

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.cream },

  nav: {
    backgroundColor: C.navBg,
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.navBorder,
  },
  navLogo:   { fontFamily: FONTS.logo, fontSize: 20, color: C.secondary, letterSpacing: 2 },
  navPortal: { fontFamily: FONTS.body, color: "#57534e", fontSize: 8, letterSpacing: 3, marginTop: 1 },

  feeChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.red300,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  feeChipText: { fontFamily: FONTS.medium, color: C.error, fontSize: 11, marginLeft: 4 },

  alertError: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.errorBg, borderBottomWidth: 1, borderBottomColor: "#FECACA",
    paddingHorizontal: 16, paddingVertical: 9,
  },
  alertErrorText:   { fontFamily: FONTS.body, color: C.error, fontSize: 12, flex: 1, marginLeft: 8 },
  alertSuccess: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.successBg, borderBottomWidth: 1, borderBottomColor: "#BBF7D0",
    paddingHorizontal: 16, paddingVertical: 9,
  },
  alertSuccessText: { fontFamily: FONTS.body, color: C.success, fontSize: 12, flex: 1, marginLeft: 8 },

  feeBanner: {
    margin: 12, backgroundColor: C.red50, borderRadius: 8,
    borderWidth: 1, borderColor: C.red300, padding: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  feeBannerLeft:   {},
  feeBannerTitle:  { fontFamily: FONTS.medium, color: C.red700, fontSize: 13 },
  feeBannerSub:    { fontFamily: FONTS.body, color: C.error, fontSize: 11, marginTop: 2 },
  feeBannerAmount: { fontFamily: FONTS.heading, color: C.red700, fontSize: 22 },

  statsRow: {
    flexDirection: "row", paddingHorizontal: 12,
    paddingTop: 12, paddingBottom: 8,
  },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, alignItems: "center", marginHorizontal: 4,
  },
  statValue: { fontFamily: FONTS.heading, fontSize: 20, color: C.goldDark },
  statLabel: { fontFamily: FONTS.body, fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: 0.3 },

  listContent: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardOverdue: { borderColor: C.red300, backgroundColor: "#FFFAFA" },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTitle:  { fontFamily: FONTS.medium, fontSize: 14, color: C.textPrimary, flex: 1, marginRight: 8, lineHeight: 20 },

  badge: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontFamily: FONTS.medium, fontSize: 9 },

  datesRow: { flexDirection: "row", marginBottom: 10 },
  dateItem:  { marginRight: 20 },
  dateLabel: { fontFamily: FONTS.body, fontSize: 9, color: C.textMuted, marginBottom: 2 },
  dateValue: { fontFamily: FONTS.body, fontSize: 12, color: C.textSecondary },

  rejectionNote: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  rejectionText: { fontFamily: FONTS.italic, fontSize: 11, color: C.error, flex: 1, marginLeft: 5 },

  feeRow:  { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  feeText: { fontFamily: FONTS.medium, fontSize: 11, color: C.error, marginLeft: 4 },

  returnBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 6, paddingVertical: 9, borderWidth: 1,
  },
  returnBtnDefault:  { borderColor: C.border, backgroundColor: C.creamDark },
  returnBtnPending:  { borderColor: "#FDE68A", backgroundColor: C.amberLight },
  returnBtnRejected: { borderColor: C.red300, backgroundColor: C.red50 },
  returnBtnText: { fontFamily: FONTS.medium, fontSize: 12, marginLeft: 6 },

  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.cream },
  loadingText:  { fontFamily: FONTS.italic, color: C.textMuted, fontSize: 13, marginTop: 10 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 16, color: C.textSecondary, marginBottom: 4 },
  emptyBody:  { fontFamily: FONTS.italic, fontSize: 12, color: C.textMuted },
});