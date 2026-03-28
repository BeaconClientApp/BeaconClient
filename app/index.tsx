import React, { useEffect } from "react";
import {
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { MainLayout } from "@/components/layout/MainLayout";

export default function AppScreen() {
  const isWsConnected = useChatStore((state) => state.isWsConnected);
  const ws = useChatStore((state) => state.ws);

  useEffect(() => {
    useSettingsStore.getState().loadSettings();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          console.log("App volvió al primer plano");
        } else {
          console.log("App en segundo plano");
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("PIN");
          }
        }
      },
    );
    return () => subscription.remove();
  }, [ws]);

  if (!isWsConnected) return <LoginScreen />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#1a1a1a" }}
      behavior="padding"
    >
      <MainLayout />
    </KeyboardAvoidingView>
  );
}
