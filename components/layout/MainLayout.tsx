import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { useChatStore } from "@/store/useChatStore";

import { LeftMenu } from "./LeftMenu";
import { RightMenu } from "./RightMenu";
import { ConsoleArea } from "@/components/chat/ConsoleArea";
import { PrivateChat } from "@/components/chat/PrivateChat";
import { ChannelList } from "@/components/chat/ChannelList";
import { RoomChat } from "@/components/chat/RoomChat";
import { LogsViewer } from "@/components/chat/LogsViewer";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { GlobalSettingsModal } from "@/components/modals/GlobalSettingsModal";
import { StatusModal } from "@/components/modals/StatusModal";
import { UserProfileModal } from "@/components/modals/UserProfileModal";
import { getGenderColor, getStatusIcon } from "@/constants/theme";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  console.log("Notificaciones desactivadas en Expo Go");
}

export function MainLayout() {
  const [isLeftMenuOpen, setLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setRightMenuOpen] = useState(false);

  const activeChat = useChatStore((state) => state.activeChat);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const activeTab = useChatStore((state) => state.activeTab);
  const joinedChannels = useChatStore((state) => state.joinedChannels);
  const onlineCharacters = useChatStore((state) => state.onlineCharacters);

  const selectedUserProfile = useChatStore(
    (state) => state.selectedUserProfile,
  );
  const setSelectedUserProfile = useChatStore(
    (state) => state.setSelectedUserProfile,
  );
  const isGlobalSettingsModalOpen = useChatStore(
    (state) => state.isGlobalSettingsModalOpen,
  );
  const setGlobalSettingsModalOpen = useChatStore(
    (state) => state.setGlobalSettingsModalOpen,
  );
  const isStatusModalOpen = useChatStore((state) => state.isStatusModalOpen);
  const setStatusModalOpen = useChatStore((state) => state.setStatusModalOpen);

  const isWsConnected = useChatStore((state) => state.isWsConnected);
  const myCharacterName = useChatStore((state) => state.myCharacterName);
  const updateActivity = useChatStore((state) => state.updateActivity);

  const totalUnreads = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const initApp = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") console.log("Permisos denegados.");

      await notifee.createChannel({
        id: "socket-service",
        name: "Conexión Permanente",
        importance: AndroidImportance.LOW,
      });
    };
    initApp();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const state = useChatStore.getState();
        const { globalSettings } = useSettingsStore.getState();

        if (
          appStateRef.current === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          if (
            globalSettings.keepSocketAlive &&
            state.isWsConnected &&
            state.myCharacterName
          ) {
            await notifee.displayNotification({
              title: "F-Chat (Segundo Plano)",
              body: `Conectado como ${state.myCharacterName}...`,
              android: {
                channelId: "socket-service",
                asForegroundService: true,
                color: "#3498db",
                ongoing: true,
              },
            });
          }
        } else if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          await notifee.stopForegroundService();

          if (typeof (global as any).killForegroundService === "function") {
            (global as any).killForegroundService();
          }

          const { account } = useAuthStore.getState();

          if (!state.isWsConnected && state.myCharacterName && account) {
            state.connectToChat(state.myCharacterName);
          } else if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send("PIN");
          }
        }
        appStateRef.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const closeMenus = () => {
    setLeftMenuOpen(false);
    setRightMenuOpen(false);
  };
  const topBarTitle = activeChat
    ? joinedChannels[activeChat]?.title || activeChat
    : activeTab === "channels"
      ? "Canales Públicos"
      : "Consola";
  const isRoom = activeChat ? !!joinedChannels[activeChat] : false;

  return (
    <View style={styles.container} onTouchStart={() => updateActivity()}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            setLeftMenuOpen(!isLeftMenuOpen);
            setRightMenuOpen(false);
          }}
          style={styles.iconButton}
        >
          <Ionicons name="menu" size={28} color="white" />
          {totalUnreads > 0 && <View style={styles.globalBadge} />}
        </TouchableOpacity>

        {activeChat && !isRoom ? (
          <TouchableOpacity
            style={styles.privateChatHeader}
            onPress={() => setSelectedUserProfile(activeChat)}
          >
            <Image
              source={{
                uri: `https://static.f-list.net/images/avatar/${activeChat.toLowerCase()}.png`,
              }}
              style={styles.headerAvatar}
            />
            <Ionicons
              name={
                onlineCharacters[activeChat]
                  ? (getStatusIcon(onlineCharacters[activeChat].status) as any)
                  : "close"
              }
              size={14}
              color={
                onlineCharacters[activeChat]
                  ? getGenderColor(onlineCharacters[activeChat].gender)
                  : "#555"
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                flexShrink: 1,
                color: onlineCharacters[activeChat]
                  ? getGenderColor(onlineCharacters[activeChat].gender)
                  : "#aaa",
              }}
              numberOfLines={1}
            >
              {activeChat}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {topBarTitle}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => {
            setRightMenuOpen(!isRightMenuOpen);
            setLeftMenuOpen(false);
          }}
          style={styles.iconButton}
        >
          <Ionicons name="people" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {!isWsConnected && myCharacterName && (
        <View style={styles.reconnectBar}>
          <Text style={styles.reconnectText}>Reconectando al chat...</Text>
        </View>
      )}

      <View style={styles.centerArea}>
        {activeChat ? (
          isRoom ? (
            <RoomChat />
          ) : (
            <PrivateChat />
          )
        ) : (
          <>
            {activeTab === "console" && <ConsoleArea />}
            {activeTab === "channels" && <ChannelList />}
          </>
        )}
      </View>

      {isLeftMenuOpen && (
        <View style={[styles.sidebar, styles.sidebarLeft]}>
          <LeftMenu onClose={closeMenus} />
        </View>
      )}
      {isRightMenuOpen && (
        <View style={[styles.sidebar, styles.sidebarRight]}>
          <RightMenu onSelect={closeMenus} />
        </View>
      )}
      {(isLeftMenuOpen || isRightMenuOpen) && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenus}
        />
      )}

      <LogsViewer />

      {isGlobalSettingsModalOpen && (
        <GlobalSettingsModal
          onClose={() => setGlobalSettingsModalOpen(false)}
        />
      )}
      {isStatusModalOpen && (
        <StatusModal onClose={() => setStatusModalOpen(false)} />
      )}
      {selectedUserProfile && (
        <UserProfileModal
          user={selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
          closeMenus={closeMenus}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0c10" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1c1e26",
    paddingVertical: 10,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  topBarTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  privateChatHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  iconButton: { padding: 5, position: "relative" },
  globalBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f39c12",
    borderWidth: 2,
    borderColor: "#1c1e26",
  },
  reconnectBar: {
    backgroundColor: "#e67e22",
    paddingVertical: 4,
    alignItems: "center",
  },
  reconnectText: { color: "white", fontSize: 12, fontWeight: "bold" },
  centerArea: { flex: 1, position: "relative" },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "75%",
    backgroundColor: "#13151a",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  sidebarLeft: { left: 0, borderRightWidth: 1, borderRightColor: "#2d3436" },
  sidebarRight: { right: 0, borderLeftWidth: 1, borderLeftColor: "#2d3436" },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 5,
  },
});
