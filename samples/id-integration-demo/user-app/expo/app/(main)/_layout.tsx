import { Slot } from "expo-router";
import { View } from "react-native";

import { AppHeader } from "@/components/AppHeader";

export default function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <AppHeader />
      <Slot />
    </View>
  );
}
