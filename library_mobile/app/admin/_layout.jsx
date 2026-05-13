//app/admin/_layout.jsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="returns" />
      <Stack.Screen name="books" />
      <Stack.Screen name="authors" />
      <Stack.Screen name="members" />
      <Stack.Screen name="loans" />
      <Stack.Screen name="categories" />    
      <Stack.Screen name="departments" /> 
      <Stack.Screen name="semesters" />  
    </Stack>
  );
}