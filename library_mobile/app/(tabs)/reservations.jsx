// app/(tabs)/reservations.jsx
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  StyleSheet, StatusBar,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";
import {
  borrowerMyReservations, borrowerCancelReservation,
  borrowerGetBooksFiltered, borrowerBorrow,
} from "../../lib/api";

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

export default function ReservationsScreen() {
  const [fontsLoaded] = useFonts({
    "AllrounderMonumentTest-Medium": require("../../assets/fonts/AllrounderMonumentTest-Medium.ttf"),
    "LibreBaskerville-Regular":      require("../../assets/fonts/LibreBaskerville-Regular.ttf"),
    "LibreBaskerville-Medium":       require("../../assets/fonts/LibreBaskerville-Medium.ttf"),
    "LibreBaskerville-SemiBold":     require("../../assets/fonts/LibreBaskerville-SemiBold.ttf"),
    "LibreBaskerville-Italic":       require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  const [reservations, setReservations] = useState([]);
  const [books,        setBooks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [borrowing,    setBorrowing]    = useState(null);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [r, b] = await Promise.all([borrowerMyReservations(), borrowerGetBooksFiltered()]);
      const resArr = Array.isArray(r) ? r : [];
      const bkArr  = Array.isArray(b) ? b : [];
      setReservations(resArr.filter(r => r.status === "waiting" || r.status === "ready"));
      setBooks(bkArr);
    } catch { setError("Failed to load reservations."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

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

  const readyCount   = reservations.filter(r => r.status === "ready").length;
  const waitingCount = reservations.filter(r => r.status === "waiting").length;

  if (loading) return (
    <View style={s.loadingState}>
      <ActivityIndicator color={C.goldDark} size="large" />
      <Text style={s.loadingText}>Loading reservations…</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* Nav */}
      <View style={s.nav}>
        <View>
          <Text style={s.navLogo}>LIBRIUM</Text>
          <Text style={s.navPortal}>MY RESERVATIONS</Text>
        </View>
        {readyCount > 0 && (
          <View style={s.readyChip}>
            <Feather name="bell" size={11} color={C.goldDark} />
            <Text style={s.readyChipText}>{readyCount} ready</Text>
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

      {/* Ready banner */}
      {readyCount > 0 && (
        <View style={s.readyBanner}>
          <Text style={s.readyBannerIcon}>🔔</Text>
          <View style={s.readyBannerBody}>
            <Text style={s.readyBannerTitle}>
              {readyCount} reserved book{readyCount > 1 ? "s are" : " is"} ready for you!
            </Text>
            <Text style={s.readyBannerSub}>Tap "Borrow Now" below to claim it.</Text>
          </View>
        </View>
      )}

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: "Total",   value: reservations.length },
          { label: "Waiting", value: waitingCount },
          { label: "Ready",   value: readyCount },
        ].map(({ label, value }) => (
          <View key={label} style={s.statCard}>
            <Text style={[s.statValue, label === "Ready" && readyCount > 0 && { color: C.goldDark }]}>
              {value}
            </Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {reservations.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🔖</Text>
          <Text style={s.emptyTitle}>No active reservations</Text>
          <Text style={s.emptyBody}>When a book is On Loan, tap Reserve to join the waitlist!</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: res }) => {
            const isReady = res.status === "ready";
            return (
              <View style={[s.card, isReady && s.cardReady]}>
                {/* Title row */}
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={2}>{res.book_title}</Text>
                  <View style={[s.badge, isReady ? s.badgeReady : s.badgeWaiting]}>
                    <Feather
                      name={isReady ? "bell" : "clock"}
                      size={9}
                      color={isReady ? C.goldDark : C.amber}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[s.badgeText, { color: isReady ? C.goldDark : C.amber }]}>
                      {isReady ? "Ready!" : "Waiting"}
                    </Text>
                  </View>
                </View>

                {/* Dates */}
                <View style={s.datesRow}>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>Reserved on</Text>
                    <Text style={s.dateValue}>{res.reserved_date}</Text>
                  </View>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>Queue position</Text>
                    <Text style={[s.dateValue, { color: isReady ? C.goldDark : C.amber, fontFamily: FONTS.medium }]}>
                      {isReady ? "🎉 Your turn!" : `#${res.queue_position ?? "—"} in queue`}
                    </Text>
                  </View>
                </View>

                {/* Action */}
                {isReady ? (
                  <Pressable
                    onPress={() => handleBorrowNow(res)}
                    disabled={borrowing === res.id}
                    style={s.borrowNowBtn}
                  >
                    {borrowing === res.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Feather name="star" size={13} color="#fff" />
                          <Text style={s.borrowNowText}>Borrow Now</Text>
                        </>
                    }
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleCancel(res.id)}
                    style={s.cancelBtn}
                  >
                    <Feather name="x" size={12} color={C.error} />
                    <Text style={s.cancelBtnText}>Cancel Reservation</Text>
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
  container: { flex: 1, backgroundColor: C.cream },

  nav: {
    backgroundColor: C.navBg,
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.navBorder,
  },
  navLogo:   { fontFamily: FONTS.logo, fontSize: 20, color: C.secondary, letterSpacing: 2 },
  navPortal: { fontFamily: FONTS.body, color: "#57534e", fontSize: 8, letterSpacing: 3, marginTop: 1 },

  readyChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.amberLight, borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  readyChipText: { fontFamily: FONTS.medium, color: C.goldDark, fontSize: 11, marginLeft: 4 },

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

  readyBanner: {
    margin: 12, backgroundColor: C.amberLight, borderRadius: 8,
    borderWidth: 1, borderColor: "#FDE68A",
    padding: 12, flexDirection: "row", alignItems: "center",
  },
  readyBannerIcon:  { fontSize: 22, marginRight: 10 },
  readyBannerBody:  { flex: 1 },
  readyBannerTitle: { fontFamily: FONTS.medium, color: "#92400e", fontSize: 13 },
  readyBannerSub:   { fontFamily: FONTS.body, color: "#b45309", fontSize: 11, marginTop: 2 },

  statsRow: {
    flexDirection: "row", paddingHorizontal: 12,
    paddingTop: 12, paddingBottom: 8,
  },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, alignItems: "center", marginHorizontal: 4,
  },
  statValue: { fontFamily: FONTS.heading, fontSize: 20, color: C.primary },
  statLabel: { fontFamily: FONTS.body, fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: 0.3 },

  listContent: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardReady: { borderColor: "#FDE68A", backgroundColor: "#FFFDF5" },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTitle:  { fontFamily: FONTS.medium, fontSize: 14, color: C.textPrimary, flex: 1, marginRight: 8, lineHeight: 20 },

  badge:        { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  badgeReady:   { backgroundColor: C.amberLight },
  badgeWaiting: { backgroundColor: C.amberLight },
  badgeText:    { fontFamily: FONTS.medium, fontSize: 9 },

  datesRow: { flexDirection: "row", marginBottom: 12 },
  dateItem:  { marginRight: 20 },
  dateLabel: { fontFamily: FONTS.body, fontSize: 9, color: C.textMuted, marginBottom: 2 },
  dateValue: { fontFamily: FONTS.body, fontSize: 12, color: C.textSecondary },

  borrowNowBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.goldDark, borderRadius: 6, paddingVertical: 10,
  },
  borrowNowText: { fontFamily: FONTS.heading, color: "#fff", fontSize: 13, marginLeft: 6, letterSpacing: 0.3 },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.red300, borderRadius: 6, paddingVertical: 9,
    backgroundColor: C.red50,
  },
  cancelBtnText: { fontFamily: FONTS.medium, color: C.error, fontSize: 12, marginLeft: 6 },

  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.cream },
  loadingText:  { fontFamily: FONTS.italic, color: C.textMuted, fontSize: 13, marginTop: 10 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 16, color: C.textSecondary, marginBottom: 4 },
  emptyBody:  { fontFamily: FONTS.italic, fontSize: 12, color: C.textMuted, textAlign: "center", paddingHorizontal: 32 },
});