// app/admin/index.jsx
import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getBooks, getAuthors, getMembers, getLoans, logoutApi } from "../../lib/api";

const FONT = Platform.OS === "ios" ? "Georgia" : "serif";

export default function StaffDashboard() {
  const [books,    setBooks]    = useState([]);
  const [authors,  setAuthors]  = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loans,    setLoans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [username, setUsername] = useState("");
  

  useEffect(() => {
    AsyncStorage.getItem("username").then(u => setUsername(u || "Librarian"));
    Promise.all([getBooks(), getAuthors(), getMembers(), getLoans()])
      .then(([b, a, m, l]) => {
        setBooks(Array.isArray(b) ? b : []);
        setAuthors(Array.isArray(a) ? a : []);
        setMembers(Array.isArray(m) ? m : []);
        setLoans(Array.isArray(l) ? l : []);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        setError(err?.message || "Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    await AsyncStorage.multiRemove(["token", "username", "role", "member_id"]);
    router.replace("/(auth)/login");
  };

  const isLoanOpen   = (l) => !(l.return_verified_date || l.return_date);
  const isOverdue    = (l) => isLoanOpen(l) && (l.overdue_days ?? 0) > 0;
  const activeLoans  = loans.filter(isLoanOpen);
  const overdueLoans = loans.filter(isOverdue);
  const recentLoans  = [...loans]
    .sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date))
    .slice(0, 5);

  const stats = [
    { emoji: "📚", label: "Total Books",   value: books.length,       valueColor: "#ca8a04" },
    { emoji: "✍️",  label: "Total Authors", value: authors.length,     valueColor: "#ca8a04" },
    { emoji: "👥", label: "Total Members", value: members.length,     valueColor: "#ca8a04" },
    { emoji: "📋", label: "Active Loans",  value: activeLoans.length, valueColor: "#dc2626" },
  ];

  const quickActions = [
    { emoji: "📚", label: "Books",   route: "/admin/books"   },
    { emoji: "✍️",  label: "Authors", route: "/admin/authors" },
    { emoji: "👥", label: "Members", route: "/admin/members" },
    { emoji: "📋", label: "Loans",   route: "/admin/loans"   },
    { emoji: "↩️", label: "Returns", route: "/admin/returns" },
    { emoji: "📂", label: "Categories", route: "/admin/categories"  }, 
    { emoji: "🏫", label: "Departments",route: "/admin/departments" },
    { emoji: "🗓️", label: "Semesters", route: "/admin/semesters" },
  ];

  return (
    <View style={s.root}>

      {/* Nav */}
      <View style={s.nav}>
        <View>
          <Text style={s.navTitle}>Librium</Text>
          <Text style={s.navSub}>STAFF PORTAL</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[s.navUser, { marginRight: 8 }]}>
            Welcome, <Text style={{ color: "#d6d3d1", fontWeight: "600" }}>{username}</Text>
          </Text>
          <TouchableOpacity onPress={handleLogout} style={s.signOutBtn}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Hero banner */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>📖</Text>
          <Text style={s.heroTitle}>Library Management System</Text>
          <Text style={s.heroSub}>Welcome, {username}. Manage your library below.</Text>
        </View>

        {/* Error alert */}
        {!!error && (
          <View style={s.alertError}>
            <Text style={s.alertIcon}>❌</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>Failed to load dashboard</Text>
              <Text style={s.alertSub}>{error}</Text>
            </View>
          </View>
        )}

        {/* Overdue warning */}
        {!loading && overdueLoans.length > 0 && (
          <View style={s.alertWarn}>
            <Text style={s.alertIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertWarnTitle}>
                {overdueLoans.length} loan{overdueLoans.length > 1 ? "s are" : " is"} overdue!
              </Text>
              <Text style={s.alertSub}>Please follow up with borrowers immediately.</Text>
            </View>
            <TouchableOpacity style={s.warnBtn} onPress={() => router.push("/admin/loans")}>
              <Text style={s.warnBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <Text style={s.sectionTitle}>Overview</Text>
        <View style={s.statsGrid}>
          {stats.map(({ emoji, label, value, valueColor }) => (
            <View key={label} style={s.statCard}>
              <Text style={s.statEmoji}>{emoji}</Text>
              {loading
                ? <ActivityIndicator color="#ca8a04" style={{ marginVertical: 4 }} />
                : <Text style={[s.statValue, { color: valueColor }]}>{value}</Text>
              }
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {quickActions.map(({ emoji, label, route }) => (
            <TouchableOpacity
              key={label}
              style={s.actionBtn}
              onPress={() => router.push(route)}
              activeOpacity={0.75}
            >
              <Text style={s.actionEmoji}>{emoji}</Text>
              <Text style={s.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Loans */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Loans</Text>
          <TouchableOpacity onPress={() => router.push("/admin/loans")}>
            <Text style={s.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.tableEmpty}>
            <ActivityIndicator color="#ca8a04" />
          </View>
        ) : recentLoans.length === 0 ? (
          <View style={s.tableEmpty}>
            <Text style={s.tableEmptyText}>No loans recorded yet.</Text>
          </View>
        ) : (
          <View style={s.table}>
            {/* Table header */}
            <View style={[s.tableRow, s.tableHead]}>
              <Text style={[s.tableCell, s.tableHeadText, { flex: 2 }]}>Book</Text>
              <Text style={[s.tableCell, s.tableHeadText, { flex: 2 }]}>Member</Text>
              <Text style={[s.tableCell, s.tableHeadText, { flex: 1.5 }]}>Due Date</Text>
              <Text style={[s.tableCell, s.tableHeadText, { flex: 1.5 }]}>Status</Text>
            </View>

            {recentLoans.map((loan, i) => {
              const overdue  = isOverdue(loan);
              const returned = !!(loan.return_verified_date || loan.return_date);
              const rowBg    = overdue ? "#fef2f2" : i % 2 === 0 ? "#fff" : "#fdf9f4";

              return (
                <View key={loan.id} style={[s.tableRow, { backgroundColor: rowBg }]}>
                  <Text style={[s.tableCell, s.cellText, { flex: 2 }]} numberOfLines={2}>
                    {loan.book_title}
                  </Text>
                  <Text style={[s.tableCell, s.cellText, { flex: 2 }]} numberOfLines={1}>
                    {loan.member_name}
                  </Text>
                  <Text style={[s.tableCell, { flex: 1.5, color: overdue ? "#dc2626" : "#7a6a52", fontSize: 11 }]}>
                    {loan.due_date ?? "—"}
                  </Text>
                  <View style={[s.tableCell, { flex: 1.5 }]}>
                    {returned ? (
                      <View style={s.badgeGreen}>
                        <Text style={s.badgeGreenText}>Returned</Text>
                      </View>
                    ) : overdue ? (
                      <View style={s.badgeRed}>
                        <Text style={s.badgeRedText}>⚠️ {loan.overdue_days}d</Text>
                      </View>
                    ) : (
                      <View style={s.badgeYellow}>
                        <Text style={s.badgeYellowText}>Active</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f0e8" },

  // Nav
  nav: {
    backgroundColor: "#0f0a06",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,83,9,0.4)",
  },
  navTitle:   { color: "#f59e0b", fontSize: 18, fontWeight: "700" },
  navSub:     { color: "#57534e", fontSize: 9, letterSpacing: 3 },
  navUser:    { color: "#78716c", fontSize: 12 },
  signOutBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(120,113,108,0.3)", borderRadius: 6,
  },
  signOutText: { color: "#78716c", fontSize: 11 },

  scroll: { padding: 16 },

  // Hero
  hero: {
    backgroundColor: "#1a1209", borderRadius: 12,
    borderWidth: 1, borderColor: "#ca8a04",
    padding: 28, alignItems: "center", marginBottom: 16,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { color: "#f59e0b", fontSize: 20, fontWeight: "700", textAlign: "center", fontFamily: FONT, marginBottom: 6 },
  heroSub:   { color: "#a89880", fontSize: 13, fontStyle: "italic", textAlign: "center", fontFamily: FONT },

  // Alerts
  alertError: {
    flexDirection: "row", alignItems: "center",
    padding: 14, backgroundColor: "#fef2f2",
    borderWidth: 1, borderColor: "#fca5a5", borderRadius: 10, marginBottom: 16,
  },
  alertWarn: {
    flexDirection: "row", alignItems: "center",
    padding: 14, backgroundColor: "#fefce8",
    borderWidth: 1, borderColor: "#fde68a", borderRadius: 10, marginBottom: 16,
  },
  alertIcon:      { fontSize: 20, marginRight: 10 },
  alertTitle:     { color: "#b91c1c", fontWeight: "600", fontSize: 13 },
  alertWarnTitle: { color: "#92400e", fontWeight: "600", fontSize: 13 },
  alertSub:       { fontSize: 11, fontStyle: "italic", color: "#b45309" },
  warnBtn: {
    backgroundColor: "#b91c1c", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8,
  },
  warnBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // Section
  sectionTitle: {
    fontSize: 16, fontWeight: "600", color: "#1a1209",
    fontFamily: FONT, marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 8,
  },
  viewAll: { fontSize: 12, color: "#6b1d2a", fontStyle: "italic" },

  // Stats grid (2x2)
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  statCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#cfc4aa",
    padding: 16, alignItems: "center",
    margin: "1.5%",
  },
  statEmoji: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#7a6a52", fontStyle: "italic" },

  // Quick actions grid
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  actionBtn: {
    width: "47%", backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#cfc4aa",
    paddingVertical: 14, alignItems: "center",
    flexDirection: "row", justifyContent: "center",
    margin: "1.5%",
  },
  actionEmoji: { fontSize: 20, marginRight: 8 },
  actionLabel: { color: "#3d2f1a", fontWeight: "600", fontSize: 13, fontFamily: FONT },

  // Table
  table: {
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#cfc4aa",
    overflow: "hidden", marginBottom: 8,
  },
  tableHead:     { backgroundColor: "#ede5d0", borderBottomWidth: 2, borderBottomColor: "#ca8a04" },
  tableHeadText: { color: "#3d2f1a", fontWeight: "600", fontSize: 11 },
  tableRow:      { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ede5d0" },
  tableCell:     { padding: 10, justifyContent: "center" },
  cellText:      { color: "#1a1209", fontSize: 12 },
  tableEmpty: {
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#cfc4aa",
    padding: 32, alignItems: "center", marginBottom: 8,
  },
  tableEmptyText: { color: "#7a6a52", fontStyle: "italic" },

  // Badges
  badgeGreen:      { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  badgeGreenText:  { color: "#15803d", fontSize: 10, fontWeight: "600" },
  badgeRed:        { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  badgeRedText:    { color: "#b91c1c", fontSize: 10, fontWeight: "600" },
  badgeYellow:     { backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  badgeYellowText: { color: "#854d0e", fontSize: 10, fontWeight: "600" },
});