//app/_layout.jsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="superadmin" />
      <Stack.Screen name="activate/[uid]/[token]" />
    </Stack>
  );
}