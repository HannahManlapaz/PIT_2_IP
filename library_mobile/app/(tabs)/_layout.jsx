// app/(tabs)/_layout.jsx
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Tabs, usePathname } from "expo-router";

const TABS = [
  { name: "index",        title: "Browse",       icon: "📚" },
  { name: "history",      title: "History",      icon: "📋" },
  { name: "reservations", title: "Reservations", icon: "🔖" },
  { name: "profile",      title: "Profile",      icon: "👤" },
];

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={s.tabBar}>
      {/* top accent line */}
      <View style={s.topLine} />

      <View style={s.tabRow}>
        {state.routes.map((route, index) => {
          const tab = TABS.find(t => t.name === route.name) ?? TABS[index];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={s.tabItem}
            >
              {/* active indicator pill */}
              {isFocused && <View style={s.activePill} />}

              <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
                <Text style={s.icon}>{tab?.icon}</Text>
              </View>

              <Text style={[s.tabLabel, isFocused ? s.tabLabelActive : s.tabLabelInactive]}>
                {tab?.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index"        options={{ title: "Browse"       }} />
      <Tabs.Screen name="history"      options={{ title: "History"      }} />
      <Tabs.Screen name="reservations" options={{ title: "Reservations" }} />
      <Tabs.Screen name="profile"      options={{ title: "Profile"      }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0f0a06",
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    paddingTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  topLine: {
    height: 1,
    backgroundColor: "rgba(180,83,9,0.4)",
    marginBottom: 6,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    position: "relative",
  },

  // amber pill indicator at top of active tab
  activePill: {
    position: "absolute",
    top: -6,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#f59e0b",
  },

  // icon background circle — glows amber when active
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    backgroundColor: "transparent",
  },
  iconWrapActive: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  icon: {
    fontSize: 18,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#f59e0b",
  },
  tabLabelInactive: {
    color: "#57534e",
  },
});