// app/(tabs)/index.jsx
import {
  View, Text, TextInput, FlatList, Pressable,
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  StatusBar, TouchableOpacity, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect, useCallback } from "react";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  borrowerGetBooks, borrowerBorrow, borrowerReserve,
  borrowerCancelReservation, borrowerMyReservations, logoutApi,
} from "../../lib/api";

const { width } = Dimensions.get("window");

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:       "#2C1810",
  primaryLight:  "#8B7355",
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

// ── Main component ────────────────────────────────────────────────────────────
export default function BrowseScreen() {
  const [fontsLoaded] = useFonts({
    "AllrounderMonumentTest-Medium": require("../../assets/fonts/AllrounderMonumentTest-Medium.ttf"),
    "LibreBaskerville-Regular":      require("../../assets/fonts/LibreBaskerville-Regular.ttf"),
    "LibreBaskerville-Medium":       require("../../assets/fonts/LibreBaskerville-Medium.ttf"),
    "LibreBaskerville-SemiBold":     require("../../assets/fonts/LibreBaskerville-SemiBold.ttf"),
    "LibreBaskerville-Italic":       require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  const [books,        setBooks]        = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [borrowing,    setBorrowing]    = useState(null);
  const [reserving,    setReserving]    = useState(null);
  const [username,     setUsername]     = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [b, r] = await Promise.all([borrowerGetBooks(), borrowerMyReservations()]);
      setBooks(b);
      setReservations(r);
    } catch { setError("Failed to load books."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    AsyncStorage.getItem("username").then(u => setUsername(u || ""));
  }, []);

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

  const activeReservations = reservations.filter(r => r.status === "waiting" || r.status === "ready");

  const filtered = books
    .filter(b => {
      if (activeFilter === "available") return b.available;
      if (activeFilter === "reserved")  return !!myReservation(b.id);
      return true;
    })
    .filter(b =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author_name ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const renderBook = ({ item: book }) => {
    const res = myReservation(book.id);
    const isBusy = borrowing === book.id || reserving === book.id;

    const actionLabel = book.available          ? "Borrow"
      : res?.status === "ready"                 ? "⭐ Borrow Now"
      : res?.status === "waiting"               ? "✕ Cancel"
      : "Reserve";

    const actionBg = book.available             ? C.primary
      : res?.status === "ready"                 ? C.goldDark
      : res?.status === "waiting"               ? "transparent"
      : C.amber;

    const actionBorder    = res?.status === "waiting" ? C.red300 : "transparent";
    const actionTextColor = res?.status === "waiting" ? C.error  : "#fff";

    return (
      <Pressable onPress={() => setSelectedBook(book)} style={s.bookCard}>
        <View style={s.bookCover}>
          {book.cover_image_url
            ? <Image source={{ uri: book.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <View style={s.bookCoverPlaceholder}><Text style={s.bookCoverIcon}>📖</Text></View>
          }
          <View style={[s.availBadge, book.available ? s.availBadgeTrue : s.availBadgeFalse]}>
            <Text style={[s.availBadgeText, { color: book.available ? C.green700 : C.red700 }]}>
              {book.available ? "Available" : "On Loan"}
            </Text>
          </View>
          {res?.status === "ready" && (
            <View style={s.readyRibbon}>
              <Text style={s.readyRibbonText}>🔔 Ready for you!</Text>
            </View>
          )}
        </View>

        <View style={s.bookInfo}>
          <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={s.bookAuthor} numberOfLines={1}>{book.author_name}</Text>
          {res?.status === "waiting" && (
            <Text style={s.queueText}>Queue #{res.queue_position}</Text>
          )}
          <Pressable
            onPress={() => book.available
              ? handleBorrow(book)
              : res?.status === "ready"   ? handleBorrow(book)
              : res?.status === "waiting" ? handleCancelReservation(res.id)
              : handleReserve(book)
            }
            style={[s.actionBtn, {
              backgroundColor: actionBg,
              borderWidth: res?.status === "waiting" ? 1 : 0,
              borderColor: actionBorder,
            }]}
          >
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[s.actionBtnText, { color: actionTextColor }]}>{actionLabel}</Text>
            }
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navBg} />

      {/* ── Nav ── */}
      <View style={s.nav}>
        <View>
          <Text style={s.navLogo}>LIBRIUM</Text>
          <Text style={s.navPortal}>BORROWER PORTAL</Text>
        </View>
        <View style={s.navRight}>
          <Text style={s.navWelcome}>
            Welcome, <Text style={s.navUsername}>{username}</Text>
          </Text>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Feather name="log-out" size={13} color="#78716c" />
            <Text style={s.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Alerts ── */}
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

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { label: "Available",   value: books.filter(b => b.available).length },
          { label: "Total Books", value: books.length },
          { label: "My Reserves", value: activeReservations.length },
        ].map(({ label, value }) => (
          <View key={label} style={s.statCard}>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Feather name="search" size={14} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by title or author…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter tabs ── */}
      <View style={s.filterRow}>
        {[
          { key: "all",       label: "All Books" },
          { key: "available", label: "Available" },
          { key: "reserved",  label: "My Reserves" },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.filterTab, activeFilter === key && s.filterTabActive]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[s.filterTabText, activeFilter === key && s.filterTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.filterCount}>{filtered.length} book{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* ── Book grid ── */}
      {loading ? (
        <View style={s.loadingState}>
          <ActivityIndicator color={C.goldDark} size="large" />
          <Text style={s.loadingText}>Loading books…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTitle}>No books found</Text>
          <Text style={s.emptyBody}>Try a different search or filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={b => String(b.id)}
          numColumns={2}
          contentContainerStyle={s.gridContent}
          columnWrapperStyle={s.gridRow}
          renderItem={renderBook}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Book detail modal ── */}
      <Modal visible={!!selectedBook} transparent animationType="slide" onRequestClose={() => setSelectedBook(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedBook(null)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalBody}>
              {selectedBook && (
                <>
                  <View style={s.modalBookHeader}>
                    <View style={s.modalCover}>
                      {selectedBook.cover_image_url
                        ? <Image source={{ uri: selectedBook.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        : <View style={s.modalCoverPlaceholder}><Text style={{ fontSize: 32 }}>📖</Text></View>
                      }
                    </View>
                    <View style={s.modalBookMeta}>
                      <Text style={s.modalBookTitle}>{selectedBook.title}</Text>
                      <Text style={s.modalBookAuthor}>{selectedBook.author_name}</Text>
                      <Text style={s.modalBookYear}>{selectedBook.publication_year}</Text>
                      <View style={[
                        s.modalAvailBadge,
                        { backgroundColor: selectedBook.available ? C.green50 : C.red50 }
                      ]}>
                        <Text style={[
                          s.modalAvailText,
                          { color: selectedBook.available ? C.green700 : C.red700 }
                        ]}>
                          {selectedBook.available ? "Available" : "Currently On Loan"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.modalDivider} />

                  <Text style={s.modalSectionLabel}>About this book</Text>
                  <Text style={s.modalDescription}>
                    {selectedBook.description || "No description available for this book."}
                  </Text>

                  <View style={s.modalActions}>
                    <TouchableOpacity style={s.modalCancelBtn} onPress={() => setSelectedBook(null)}>
                      <Text style={s.modalCancelText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalActionBtn, { backgroundColor: selectedBook.available ? C.primary : C.amber }]}
                      onPress={() => selectedBook.available ? handleBorrow(selectedBook) : handleReserve(selectedBook)}
                    >
                      {(borrowing === selectedBook?.id || reserving === selectedBook?.id)
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.modalActionText}>
                            {selectedBook.available ? "Borrow Book" : "🔖 Reserve"}
                          </Text>
                      }
                    </TouchableOpacity>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  // Nav
  nav: {
    backgroundColor: C.navBg,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.navBorder,
  },
  navLogo: {
    fontFamily: FONTS.logo,
    fontSize: 20,
    color: C.secondary,
    letterSpacing: 2,
  },
  navPortal: {
    fontFamily: FONTS.body,
    color: "#57534e",
    fontSize: 8,
    letterSpacing: 3,
    marginTop: 1,
  },
  navRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  navWelcome: {
    fontFamily: FONTS.body,
    color: "#78716c",
    fontSize: 12,
  },
  navUsername: {
    fontFamily: FONTS.medium,
    color: "#d6d3d1",
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(120,113,108,0.3)",
    borderRadius: 6,
  },
  logoutText: {
    fontFamily: FONTS.body,
    color: "#78716c",
    fontSize: 11,
  },

  // Alerts
  alertError: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.errorBg,
    borderBottomWidth: 1, borderBottomColor: "#FECACA",
    paddingHorizontal: 16, paddingVertical: 9,
  },
  alertErrorText: { fontFamily: FONTS.body, color: C.error, fontSize: 12, flex: 1 },
  alertSuccess: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.successBg,
    borderBottomWidth: 1, borderBottomColor: "#BBF7D0",
    paddingHorizontal: 16, paddingVertical: 9,
  },
  alertSuccessText: { fontFamily: FONTS.body, color: C.success, fontSize: 12, flex: 1 },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, alignItems: "center",
  },
  statValue: { fontFamily: FONTS.heading, fontSize: 20, color: C.goldDark },
  statLabel: { fontFamily: FONTS.body, fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: 0.3 },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, marginHorizontal: 12, marginBottom: 8,
    paddingHorizontal: 10, height: 40, gap: 8,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: C.textPrimary, paddingVertical: 0 },

  // Filter tabs
  filterRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, marginBottom: 8, gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  filterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterTabText:   { fontFamily: FONTS.medium, fontSize: 11, color: C.textSecondary },
  filterTabTextActive: { color: "#fff" },
  filterCount: { fontFamily: FONTS.italic, fontSize: 11, color: C.textMuted, marginLeft: "auto" },

  // Loading / empty
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText:  { fontFamily: FONTS.italic, color: C.textMuted, fontSize: 13 },
  emptyState:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 40 },
  emptyEmoji:   { fontSize: 40 },
  emptyTitle:   { fontFamily: FONTS.heading, fontSize: 16, color: C.textSecondary },
  emptyBody:    { fontFamily: FONTS.italic, fontSize: 12, color: C.textMuted },

  // Grid
  gridContent: { padding: 12, paddingBottom: 32, gap: 12 },
  gridRow:     { gap: 12 },

  // Book card
  bookCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  bookCover:            { aspectRatio: 2 / 3, backgroundColor: C.creamDark },
  bookCoverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  bookCoverIcon:        { fontSize: 32 },
  availBadge: {
    position: "absolute", top: 6, right: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1,
  },
  availBadgeTrue:  { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  availBadgeFalse: { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
  availBadgeText:  { fontFamily: FONTS.medium, fontSize: 8 },
  readyRibbon: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.goldDark, paddingVertical: 3,
  },
  readyRibbonText: { fontFamily: FONTS.medium, color: "#fff", fontSize: 8, textAlign: "center" },
  bookInfo:   { padding: 8 },
  bookTitle:  { fontFamily: FONTS.medium, fontSize: 11, color: C.textPrimary, marginBottom: 2, lineHeight: 15 },
  bookAuthor: { fontFamily: FONTS.italic, fontSize: 10, color: C.textMuted, marginBottom: 4 },
  queueText:  { fontFamily: FONTS.body, fontSize: 9, color: C.amber, marginBottom: 4 },
  actionBtn:  { borderRadius: 4, paddingVertical: 6, alignItems: "center", marginTop: 2 },
  actionBtnText: { fontFamily: FONTS.medium, fontSize: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "78%", paddingBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  modalBody:        { padding: 20, paddingTop: 12 },
  modalBookHeader:  { flexDirection: "row", gap: 14, marginBottom: 16 },
  modalCover: {
    width: 76, height: 112, borderRadius: 6,
    backgroundColor: C.creamDark, overflow: "hidden", flexShrink: 0,
  },
  modalCoverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalBookMeta:   { flex: 1, gap: 3 },
  modalBookTitle:  { fontFamily: FONTS.heading, fontSize: 15, color: C.textPrimary, lineHeight: 21 },
  modalBookAuthor: { fontFamily: FONTS.italic, fontSize: 13, color: C.textMuted },
  modalBookYear:   { fontFamily: FONTS.body, fontSize: 11, color: C.border },
  modalAvailBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  modalAvailText:  { fontFamily: FONTS.medium, fontSize: 11 },
  modalDivider:    { height: 1, backgroundColor: C.border, marginBottom: 14 },
  modalSectionLabel: {
    fontFamily: FONTS.heading, fontSize: 12, color: C.textSecondary,
    letterSpacing: 0.8, marginBottom: 6, textTransform: "uppercase",
  },
  modalDescription: { fontFamily: FONTS.body, fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 20 },
  modalActions:     { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6,
    borderWidth: 1, borderColor: C.border, alignItems: "center",
  },
  modalCancelText:  { fontFamily: FONTS.medium, color: C.textMuted, fontSize: 13 },
  modalActionBtn:   { flex: 2, paddingVertical: 12, borderRadius: 6, alignItems: "center" },
  modalActionText:  { fontFamily: FONTS.heading, color: "#fff", fontSize: 13, letterSpacing: 0.5 },
});