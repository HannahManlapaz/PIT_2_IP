import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#0f0a06", borderTopColor: "rgba(180,83,9,0.4)" },
      tabBarActiveTintColor: "#f59e0b",
      tabBarInactiveTintColor: "#78716c",
    }}>
      <Tabs.Screen name="index" options={{ title: "Browse", tabBarIcon: () => <Text>📚</Text> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: () => <Text>📋</Text> }} />
      <Tabs.Screen name="reservations" options={{ title: "Reservations", tabBarIcon: () => <Text>🔖</Text> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: () => <Text>👤</Text> }} />
    </Tabs>
  );
}

import { Text } from "react-native";