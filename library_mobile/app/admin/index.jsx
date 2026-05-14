// app/admin/index.jsx
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform, Dimensions,
} from "react-native";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getBooks, getAuthors, getMembers, getLoans, logoutApi } from "../../lib/api";

const { width } = Dimensions.get("window");
const IS_WIDE = width >= 768;

// ── Design system — Brown / Parchment / Dark Academia ────────────────────────
const C = {
  // Core palette
  navBg:       "#1A0F0A",   // near-black brown (matches borrower nav)
  navBorder:   "rgba(180,83,9,0.35)",
  primary:     "#2C1810",   // deep mahogany brown
  primaryMid:  "#5C3A1E",   // mid brown
  primaryLight:"#8B5E3C",   // lighter brown
  secondary:   "#D4A373",   // warm gold/tan (matches borrower secondary)
  secondaryDark:"#B8860B",  // darker gold
  parchment:   "#F5F0E1",   // warm background (matches borrower cream)
  cream:       "#EDE3D4",   // card surface
  creamDark:   "#DDD0BC",   // borders
  surface:     "#FFFFFF",
  // Text
  textPrimary:   "#2C1810",
  textSecondary: "#6B4C3A",
  textMuted:     "#9C7A5A",
  textLight:     "#C8B49A",
  // Status
  green50:  "#F0FDF4",
  green700: "#15803D",
  green300: "#86EFAC",
  red50:    "#FEF2F2",
  red700:   "#B91C1C",
  red300:   "#FCA5A5",
  amber50:  "#FFFBEB",
  amber700: "#B45309",
  amber300: "#FCD34D",
  blue50:   "#EFF6FF",
  blue700:  "#1D4ED8",
  blue300:  "#93C5FD",
  errorBg:  "#FDF0F0",
  error:    "#B22222",
};

const FONTS = {
  logo:    "AllrounderMonumentTest-Medium",
  heading: "LibreBaskerville-SemiBold",
  body:    "LibreBaskerville-Regular",
  medium:  "LibreBaskerville-Medium",
  italic:  "LibreBaskerville-Italic",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad2    = (n) => String(n).padStart(2, "0");
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const fmtDate = (d) => {
  const dt = new Date(d);
  return `${pad2(dt.getDate())} ${MONTHS3[dt.getMonth()]} ${dt.getFullYear()}`;
};

// ── Ornamental divider ────────────────────────────────────────────────────────
const OrnamentalDivider = ({ color = C.secondary, style }) => (
  <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
    <View style={{ flex: 1, height: 1, backgroundColor: color + "50" }} />
    <Text style={{ color, fontSize: 10, letterSpacing: 2 }}>✦</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: color + "50" }} />
  </View>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ emoji, label, value, accent, loading, onPress }) => (
  <TouchableOpacity
    style={[s.statCard, { borderTopColor: accent }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={s.statEmoji}>{emoji}</Text>
    {loading
      ? <ActivityIndicator color={C.secondary} style={{ marginVertical: 6 }} />
      : <Text style={[s.statValue, { color: accent }]}>{value}</Text>
    }
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Action tile ───────────────────────────────────────────────────────────────
const ActionTile = ({ emoji, label, route, badge }) => (
  <TouchableOpacity style={s.actionTile} onPress={() => router.push(route)} activeOpacity={0.7}>
    <View style={s.actionTileIconWrap}>
      <Text style={s.actionTileEmoji}>{emoji}</Text>
      {badge > 0 && (
        <View style={s.actionBadge}>
          <Text style={s.actionBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={s.actionTileLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [fontsLoaded] = useFonts({
    "AllrounderMonumentTest-Medium": require("../../assets/fonts/AllrounderMonumentTest-Medium.ttf"),
    "LibreBaskerville-Regular":      require("../../assets/fonts/LibreBaskerville-Regular.ttf"),
    "LibreBaskerville-Medium":       require("../../assets/fonts/LibreBaskerville-Medium.ttf"),
    "LibreBaskerville-SemiBold":     require("../../assets/fonts/LibreBaskerville-SemiBold.ttf"),
    "LibreBaskerville-Italic":       require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  const [books,    setBooks]    = useState([]);
  const [authors,  setAuthors]  = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loans,    setLoans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [username, setUsername] = useState("");
  const [time,     setTime]     = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [b, a, m, l] = await Promise.all([
        getBooks(), getAuthors(), getMembers(), getLoans(),
      ]);
      setBooks(Array.isArray(b) ? b : []);
      setAuthors(Array.isArray(a) ? a : []);
      setMembers(Array.isArray(m) ? m : []);
      setLoans(Array.isArray(l) ? l : []);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("username").then(u => setUsername(u || "Librarian"));
    loadDashboard();
  }, []);

  useFocusEffect(useCallback(() => { loadDashboard(true); }, []));

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
    router.replace("/(auth)/login");
  };

  // Derived
  const isLoanOpen  = (l) => !(l.return_verified_date || l.return_date);
  const isOverdue   = (l) => isLoanOpen(l) && (l.overdue_days ?? 0) > 0;
  const isPending   = (l) => !!l.return_requested_date && !l.return_verified_date && l.return_status === "pending";
  const activeLoans  = loans.filter(isLoanOpen);
  const overdueLoans = loans.filter(isOverdue);
  const pendingLoans = loans.filter(isPending);
  const recentLoans  = [...loans]
    .sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date))
    .slice(0, IS_WIDE ? 8 : 5);

  const hour = time.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { emoji: "📚", label: "Total Books",     value: books.length,        accent: C.secondaryDark, route: "/admin/books"   },
    { emoji: "✍️",  label: "Total Authors",   value: authors.length,      accent: C.primaryLight,  route: "/admin/authors" },
    { emoji: "👥", label: "Total Members",   value: members.length,      accent: C.secondaryDark, route: "/admin/members" },
    { emoji: "📋", label: "Active Loans",    value: activeLoans.length,  accent: C.primaryLight,  route: "/admin/loans"   },
    { emoji: "⚠️", label: "Overdue",         value: overdueLoans.length, accent: C.error,         route: "/admin/loans"   },
    { emoji: "⏳", label: "Pending Returns", value: pendingLoans.length, accent: C.amber700,      route: "/admin/returns" },
  ];

  const quickActions = [
    { emoji: "📚", label: "Books",       route: "/admin/books",       badge: 0 },
    { emoji: "✍️",  label: "Authors",     route: "/admin/authors",     badge: 0 },
    { emoji: "👥", label: "Members",     route: "/admin/members",     badge: 0 },
    { emoji: "📋", label: "Loans",       route: "/admin/loans",       badge: activeLoans.length },
    { emoji: "↩️", label: "Returns",     route: "/admin/returns",     badge: pendingLoans.length },
    { emoji: "📂", label: "Categories",  route: "/admin/categories",  badge: 0 },
    { emoji: "🏫", label: "Departments", route: "/admin/departments", badge: 0 },
    { emoji: "🗓️", label: "Semesters",   route: "/admin/semesters",  badge: 0 },
  ];

  return (
    <View style={s.root}>

      {/* ── Navigation bar — matches borrower nav ── */}
      <View style={s.nav}>
        <View style={s.navLeft}>
          <Text style={s.navLogo}>LIBRIUM</Text>
          <Text style={s.navPortal}>STAFF PORTAL</Text>
        </View>
        <View style={s.navRight}>
          {IS_WIDE && (
            <View style={s.navClockWrap}>
              <Text style={s.navClockDay}>{DAYS[time.getDay()]}</Text>
              <Text style={s.navClockDate}>
                {pad2(time.getDate())} {MONTHS[time.getMonth()]} {time.getFullYear()}
              </Text>
            </View>
          )}
          <View style={s.navUserWrap}>
            <View style={s.navAvatar}>
              <Text style={s.navAvatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
            {IS_WIDE && (
              <View>
                <Text style={s.navUserName}>{username}</Text>
                <Text style={s.navUserRole}>Library Staff</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.signOutBtn}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          IS_WIDE && { maxWidth: 1100, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={[s.heroCorner, s.heroCornerTL]} />
          <View style={[s.heroCorner, s.heroCornerTR]} />
          <View style={[s.heroCorner, s.heroCornerBL]} />
          <View style={[s.heroCorner, s.heroCornerBR]} />

          <Text style={s.heroEyebrow}>UNIVERSITY LIBRARY SYSTEM</Text>
          <OrnamentalDivider
            color={C.secondary}
            style={{ marginVertical: 10, width: IS_WIDE ? "40%" : "70%" }}
          />
          <Text style={s.heroTitle}>Library Management</Text>
          <Text style={s.heroTitle}>Dashboard</Text>
          <OrnamentalDivider
            color={C.secondary}
            style={{ marginVertical: 10, width: IS_WIDE ? "30%" : "50%" }}
          />
          <Text style={s.heroSub}>
            {greeting},{" "}
            <Text style={s.heroSubName}>{username}</Text>.{"  "}
            {overdueLoans.length > 0
              ? `${overdueLoans.length} overdue loan${overdueLoans.length > 1 ? "s require" : " requires"} your attention.`
              : "All loans are in good standing."}
          </Text>
        </View>

        {/* ── Error ── */}
        {!!error && (
          <View style={s.alertError}>
            <Text style={s.alertIcon}>❌</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>Failed to load dashboard data</Text>
              <Text style={s.alertBody}>{error}</Text>
            </View>
          </View>
        )}

        {/* ── Overdue warning ── */}
        {!loading && overdueLoans.length > 0 && (
          <TouchableOpacity style={s.alertWarn} onPress={() => router.push("/admin/loans")} activeOpacity={0.8}>
            <View style={s.alertWarnBar} />
            <Text style={s.alertWarnIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertWarnTitle}>
                {overdueLoans.length} loan{overdueLoans.length > 1 ? "s are" : " is"} overdue
              </Text>
              <Text style={s.alertWarnBody}>Immediate follow-up required. Tap to view.</Text>
            </View>
            <Text style={s.alertWarnArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Pending warning ── */}
        {!loading && pendingLoans.length > 0 && (
          <TouchableOpacity style={s.alertPending} onPress={() => router.push("/admin/returns")} activeOpacity={0.8}>
            <View style={[s.alertWarnBar, { backgroundColor: C.amber700 }]} />
            <Text style={s.alertWarnIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertWarnTitle, { color: C.amber700 }]}>
                {pendingLoans.length} return{pendingLoans.length > 1 ? "s" : ""} awaiting verification
              </Text>
              <Text style={s.alertWarnBody}>Tap to review and verify pending returns.</Text>
            </View>
            <Text style={[s.alertWarnArrow, { color: C.amber700 }]}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Stats ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionTitle}>SYSTEM OVERVIEW</Text>
          </View>
          <View style={s.statsGrid}>
            {stats.map(({ emoji, label, value, accent, route }) => (
              <StatCard
                key={label}
                emoji={emoji} label={label} value={value}
                accent={accent} loading={loading}
                onPress={() => router.push(route)}
              />
            ))}
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionTitle}>QUICK NAVIGATION</Text>
          </View>
          <View style={s.actionsGrid}>
            {quickActions.map(({ emoji, label, route, badge }) => (
              <ActionTile key={label} emoji={emoji} label={label} route={route} badge={badge} />
            ))}
          </View>
        </View>

        {/* ── Recent Loans ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionHeader}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionTitle}>RECENT LOAN ACTIVITY</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/admin/loans")}>
              <Text style={s.viewAllLink}>View all loans →</Text>
            </TouchableOpacity>
          </View>

          <OrnamentalDivider style={{ marginVertical: 12 }} />

          {loading ? (
            <View style={s.tableLoading}>
              <ActivityIndicator color={C.secondary} size="large" />
              <Text style={s.tableLoadingText}>Retrieving loan records…</Text>
            </View>
          ) : recentLoans.length === 0 ? (
            <View style={s.tableEmpty}>
              <Text style={s.tableEmptyIcon}>📭</Text>
              <Text style={s.tableEmptyTitle}>No loan records found</Text>
              <Text style={s.tableEmptyBody}>Create a new loan to get started.</Text>
            </View>
          ) : (
            <View style={s.table}>
              {/* Header */}
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, { flex: 2.5 }]}>TITLE</Text>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>BORROWER</Text>
                {IS_WIDE && <Text style={[s.tableHeadCell, { flex: 1.5 }]}>LOANED</Text>}
                <Text style={[s.tableHeadCell, { flex: 1.5 }]}>DUE DATE</Text>
                <Text style={[s.tableHeadCell, { flex: 1.5 }]}>STATUS</Text>
              </View>

              {recentLoans.map((loan, i) => {
                const overdue  = isOverdue(loan);
                const pending  = isPending(loan);
                const returned = !!(loan.return_verified_date || loan.return_date);
                const rowBg    = overdue  ? C.red50
                               : pending  ? C.amber50
                               : i % 2 === 0 ? C.surface : "#FDFAF4";

                return (
                  <View
                    key={loan.id}
                    style={[
                      s.tableRow,
                      { backgroundColor: rowBg },
                      overdue && s.tableRowOverdue,
                    ]}
                  >
                    <Text style={[s.tableCellBook, { flex: 2.5 }]} numberOfLines={2}>
                      {loan.book_title}
                    </Text>
                    <Text style={[s.tableCellMember, { flex: 2 }]} numberOfLines={1}>
                      {loan.member_name}
                    </Text>
                    {IS_WIDE && (
                      <Text style={[s.tableCellDate, { flex: 1.5 }]}>
                        {loan.loan_date ? fmtDate(loan.loan_date) : "—"}
                      </Text>
                    )}
                    <Text style={[
                      s.tableCellDate,
                      { flex: 1.5 },
                      overdue && { color: C.error, fontFamily: FONTS.medium },
                    ]}>
                      {loan.due_date ? fmtDate(loan.due_date) : "—"}
                    </Text>
                    <View style={{ flex: 1.5, justifyContent: "center" }}>
                      {returned ? (
                        <View style={s.badgeReturned}>
                          <Text style={s.badgeReturnedText}>Returned</Text>
                        </View>
                      ) : pending ? (
                        <View style={s.badgePending}>
                          <Text style={s.badgePendingText}>Pending</Text>
                        </View>
                      ) : overdue ? (
                        <View style={s.badgeOverdue}>
                          <Text style={s.badgeOverdueText}>⚠ {loan.overdue_days}d</Text>
                        </View>
                      ) : (
                        <View style={s.badgeActive}>
                          <Text style={s.badgeActiveText}>Active</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <OrnamentalDivider style={{ marginTop: 8, marginBottom: 12 }} />
        <Text style={s.footer}>LIBRIUM — University Library Management System</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const statW   = IS_WIDE ? "31%" : "47%";
const actionW = IS_WIDE ? "22%" : "47%";

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.parchment },
  scroll: { flex: 1 },
  scrollContent: { padding: IS_WIDE ? 24 : 16 },

  // ── Nav — identical structure to borrower ──
  nav: {
    backgroundColor: C.navBg,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: IS_WIDE ? 32 : 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.navBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  navLeft:   {},
  navLogo:   { fontFamily: FONTS.logo, fontSize: IS_WIDE ? 22 : 20, color: C.secondary, letterSpacing: 2 },
  navPortal: { fontFamily: FONTS.body, color: "#57534e", fontSize: 8, letterSpacing: 3, marginTop: 1 },

  navRight:     { flexDirection: "row", alignItems: "center", gap: IS_WIDE ? 16 : 10 },
  navClockWrap: { alignItems: "flex-end" },
  navClockDay:  { fontFamily: FONTS.medium, fontSize: 11, color: C.secondary, letterSpacing: 0.5 },
  navClockDate: { fontFamily: FONTS.body, fontSize: 10, color: "#78716c" },

  navUserWrap:   { flexDirection: "row", alignItems: "center", gap: 8 },
  navAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primaryMid,
    borderWidth: 2, borderColor: C.secondary,
    alignItems: "center", justifyContent: "center",
  },
  navAvatarText: { fontFamily: FONTS.heading, fontSize: 14, color: C.secondary },
  navUserName:   { fontFamily: FONTS.medium, fontSize: 13, color: "#d6d3d1" },
  navUserRole:   { fontFamily: FONTS.body, fontSize: 10, color: "#78716c", letterSpacing: 0.3 },

  signOutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(120,113,108,0.3)",
    borderRadius: 6,
  },
  signOutText: { fontFamily: FONTS.body, fontSize: 11, color: "#78716c" },

  // ── Hero ──
  hero: {
    backgroundColor: C.navBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.navBorder,
    padding: IS_WIDE ? 44 : 28,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
    overflow: "hidden",
    position: "relative",
  },
  heroCorner:   { position: "absolute", width: 24, height: 24, borderColor: C.secondary + "60" },
  heroCornerTL: { top: 12, left: 12, borderTopWidth: 1, borderLeftWidth: 1 },
  heroCornerTR: { top: 12, right: 12, borderTopWidth: 1, borderRightWidth: 1 },
  heroCornerBL: { bottom: 12, left: 12, borderBottomWidth: 1, borderLeftWidth: 1 },
  heroCornerBR: { bottom: 12, right: 12, borderBottomWidth: 1, borderRightWidth: 1 },

  heroEyebrow: {
    fontFamily: FONTS.body,
    fontSize: 9, letterSpacing: 4,
    color: C.secondary, marginBottom: 4,
  },
  heroTitle: {
    fontFamily: FONTS.logo,
    fontSize: IS_WIDE ? 38 : 26,
    color: C.secondary,
    letterSpacing: IS_WIDE ? 2 : 1,
    textAlign: "center",
    lineHeight: IS_WIDE ? 48 : 34,
  },
  heroSub: {
    fontFamily: FONTS.italic,
    fontSize: IS_WIDE ? 14 : 12,
    color: "#78716c",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
    maxWidth: 480,
    marginTop: 4,
  },
  heroSubName: { color: C.secondary, fontFamily: FONTS.medium, fontStyle: "normal" },

  // ── Alerts ──
  alertError: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: C.red50,
    borderWidth: 1, borderColor: C.red300,
    borderRadius: 10, padding: 14, marginBottom: 12, gap: 10,
  },
  alertIcon:  { fontSize: 18 },
  alertTitle: { fontFamily: FONTS.heading, fontSize: 13, color: C.error, marginBottom: 2 },
  alertBody:  { fontFamily: FONTS.italic, fontSize: 12, color: C.error },

  alertWarn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.red50, borderWidth: 1, borderColor: C.red300,
    borderRadius: 10, padding: 14, marginBottom: 10, gap: 10, overflow: "hidden",
  },
  alertPending: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber300,
    borderRadius: 10, padding: 14, marginBottom: 14, gap: 10, overflow: "hidden",
  },
  alertWarnBar:   { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.error },
  alertWarnIcon:  { fontSize: 18, marginLeft: 4 },
  alertWarnTitle: { fontFamily: FONTS.heading, fontSize: 13, color: C.error, marginBottom: 2 },
  alertWarnBody:  { fontFamily: FONTS.italic, fontSize: 11, color: C.textMuted },
  alertWarnArrow: { fontFamily: FONTS.heading, fontSize: 18, color: C.error },

  // ── Sections ──
  section:          { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  sectionHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionAccent:    { width: 4, height: 18, backgroundColor: C.secondary, borderRadius: 2, marginRight: 10 },
  sectionTitle: {
    fontFamily: FONTS.body,
    fontSize: 10, letterSpacing: 2.5,
    color: C.textMuted,
  },
  viewAllLink: {
    fontFamily: FONTS.italic,
    fontSize: 12, color: C.primaryLight, fontStyle: "italic",
  },

  // ── Stats ──
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: statW, flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.creamDark,
    borderTopWidth: 3,
    padding: IS_WIDE ? 20 : 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statEmoji: { fontSize: IS_WIDE ? 28 : 22, marginBottom: 6 },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: IS_WIDE ? 34 : 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: 9, color: C.textMuted,
    letterSpacing: 0.8, textAlign: "center",
  },

  // ── Actions ──
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: actionW, flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.creamDark,
    paddingVertical: IS_WIDE ? 20 : 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionTileIconWrap: { position: "relative" },
  actionTileEmoji:    { fontSize: IS_WIDE ? 28 : 24 },
  actionBadge: {
    position: "absolute", top: -6, right: -10,
    backgroundColor: C.error,
    borderRadius: 999, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionBadgeText: { fontFamily: FONTS.medium, fontSize: 9, color: "#fff" },
  actionTileLabel: {
    fontFamily: FONTS.medium,
    fontSize: IS_WIDE ? 12 : 11,
    color: C.textSecondary,
    textAlign: "center",
  },

  // ── Table ──
  table: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.creamDark,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.navBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tableHeadCell: {
    fontFamily: FONTS.body,
    fontSize: 9, color: C.secondary,
    letterSpacing: 1.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cream,
    alignItems: "center",
  },
  tableRowOverdue: { borderLeftWidth: 3, borderLeftColor: C.error },

  tableCellBook: {
    fontFamily: FONTS.medium,
    fontSize: IS_WIDE ? 13 : 11,
    color: C.textPrimary,
    lineHeight: 16,
    paddingRight: 8,
  },
  tableCellMember: {
    fontFamily: FONTS.body,
    fontSize: IS_WIDE ? 12 : 11,
    color: C.textSecondary,
    paddingRight: 8,
  },
  tableCellDate: {
    fontFamily: FONTS.body,
    fontSize: IS_WIDE ? 11 : 10,
    color: C.textMuted,
  },

  // Status badges
  badgeReturned: {
    backgroundColor: C.green50, borderRadius: 4,
    borderWidth: 1, borderColor: C.green300,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  badgeReturnedText: { fontFamily: FONTS.medium, fontSize: 9, color: C.green700 },

  badgePending: {
    backgroundColor: C.amber50, borderRadius: 4,
    borderWidth: 1, borderColor: C.amber300,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  badgePendingText: { fontFamily: FONTS.medium, fontSize: 9, color: C.amber700 },

  badgeOverdue: {
    backgroundColor: C.red50, borderRadius: 4,
    borderWidth: 1, borderColor: C.red300,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  badgeOverdueText: { fontFamily: FONTS.medium, fontSize: 9, color: C.error },

  badgeActive: {
    backgroundColor: C.blue50, borderRadius: 4,
    borderWidth: 1, borderColor: C.blue300,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  badgeActiveText: { fontFamily: FONTS.medium, fontSize: 9, color: C.blue700 },

  tableLoading: {
    padding: 40, alignItems: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.creamDark,
  },
  tableLoadingText: { fontFamily: FONTS.italic, fontSize: 12, color: C.textMuted },

  tableEmpty: {
    padding: IS_WIDE ? 48 : 36, alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.creamDark,
  },
  tableEmptyIcon:  { fontSize: 36 },
  tableEmptyTitle: { fontFamily: FONTS.heading, fontSize: 15, color: C.textSecondary },
  tableEmptyBody:  { fontFamily: FONTS.italic, fontSize: 12, color: C.textMuted },

  // ── Footer ──
  footer: {
    fontFamily: FONTS.body,
    fontSize: 9, color: C.textLight,
    letterSpacing: 2, textAlign: "center", marginBottom: 8,
  },
});