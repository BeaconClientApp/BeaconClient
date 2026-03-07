import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  getGenderColor,
  getStatusIcon,
  getStatusColor,
} from "@/constants/theme";

export function LeftMenu({ onClose }: { onClose: () => void }) {
  const disconnectChat = useChatStore((state) => state.disconnectChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const myCharacterName = useChatStore((state) => state.myCharacterName);
  const activeChat = useChatStore((state) => state.activeChat);
  const openChats = useChatStore((state) => state.openChats);
  const pinnedChats = useChatStore((state) => state.pinnedChats);
  const closeChat = useChatStore((state) => state.closeChat);
  const togglePinChat = useChatStore((state) => state.togglePinChat);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const activeTab = useChatStore((state) => state.activeTab);
  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const onlineCharacters = useChatStore((state) => state.onlineCharacters);
  const joinedChannels = useChatStore((state) => state.joinedChannels);
  const leaveChannel = useChatStore((state) => state.leaveChannel);
  const pinnedRooms = useChatStore((state) => state.pinnedRooms);
  const togglePinRoom = useChatStore((state) => state.togglePinRoom);
  const roomUnreadActivity = useChatStore((s) => s.roomUnreadActivity);
  const globalSettings = useSettingsStore((state) => state.globalSettings);

  const joinedRoomsList = Object.values(joinedChannels).filter(
    (room) => pinnedRooms.includes(room.id) || room.users.length > 0,
  );
  const myStatusData = myCharacterName
    ? onlineCharacters[myCharacterName]
    : null;
  const currentStatus = myStatusData?.status || "online";
  const currentStatusMsg = myStatusData?.statusmsg || "";

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            useChatStore.getState().setStatusModalOpen(true);
            onClose();
          }}
        >
          {myCharacterName ? (
            <Image
              source={{
                uri: `https://static.f-list.net/images/avatar/${myCharacterName.toLowerCase()}.png`,
              }}
              style={styles.avatar}
            />
          ) : (
            <Ionicons name="person-circle" size={50} color="#ccc" />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerText}>
              {myCharacterName || "Mi Personaje"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons
                name={getStatusIcon(currentStatus) as any}
                size={12}
                color={getStatusColor(currentStatus)}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: getStatusColor(currentStatus),
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                {currentStatus.toUpperCase()}
              </Text>
            </View>
            {currentStatusMsg ? (
              <Text style={styles.headerStatusMsg} numberOfLines={2}>
                {currentStatusMsg}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            !activeChat && activeTab === "console" && styles.pmItemActive,
          ]}
          onPress={() => {
            setActiveTab("console");
            onClose();
          }}
        >
          <Ionicons name="terminal" size={20} color="#aaa" />
          <Text style={styles.menuItemText}>Consola</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            !activeChat && activeTab === "channels" && styles.pmItemActive,
          ]}
          onPress={() => {
            setActiveTab("channels");
            onClose();
          }}
        >
          <Ionicons name="list" size={20} color="#aaa" />
          <Text style={styles.menuItemText}>Canales Públicos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            useChatStore.getState().openLogs();
            onClose();
          }}
        >
          <Ionicons name="folder-open" size={20} color="#f1c40f" />
          <Text style={styles.menuItemText}>Historial (Logs)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            useChatStore.getState().setGlobalSettingsModalOpen(true);
            onClose();
          }}
        >
          <Ionicons name="settings" size={20} color="#aaa" />
          <Text style={styles.menuItemText}>Ajustes Globales</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Mensajes Privados</Text>

        {openChats.length === 0 ? (
          <Text style={styles.emptyText}>No hay PMs activos</Text>
        ) : (
          openChats.map((item) => {
            const isPinned = pinnedChats.includes(item);
            const isActive = activeChat === item;
            const unreads = unreadCounts[item] || 0;
            const charData = onlineCharacters[item];
            const isOnline = !!charData;
            const statusIcon = isOnline
              ? getStatusIcon(charData?.status)
              : "close";
            const iconColor = isOnline
              ? getGenderColor(charData?.gender)
              : "#444";

            return (
              <TouchableOpacity
                key={`pm-${item}`}
                style={[
                  styles.pmItem,
                  isActive && styles.pmItemActive,
                  unreads > 0 && styles.pmItemUnread,
                ]}
                onPress={() => {
                  setActiveChat(item);
                  onClose();
                }}
              >
                <View style={styles.pmInfo}>
                  {globalSettings.showAvatarsInPM && (
                    <Image
                      source={{
                        uri: `https://static.f-list.net/images/avatar/${item.toLowerCase()}.png`,
                      }}
                      style={styles.pmAvatar}
                    />
                  )}
                  <Ionicons
                    name={statusIcon as any}
                    size={12}
                    color={iconColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.pmItemText,
                      unreads > 0 && { color: "#f39c12" },
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                </View>
                <View style={styles.pmActions}>
                  {unreads > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreads > 99 ? "99+" : unreads}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => togglePinChat(item)}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name={isPinned ? "pin" : "pin-outline"}
                      size={20}
                      color={isPinned ? "#3498db" : "#888"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => closeChat(item)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="close" size={22} color="#888" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>
          Salas ({joinedRoomsList.length})
        </Text>

        {joinedRoomsList.length === 0 ? (
          <Text style={styles.emptyText}>No estás en ninguna sala</Text>
        ) : (
          joinedRoomsList.map((room) => {
            const isPinned = pinnedRooms.includes(room.id);
            const isActive = activeChat === room.id;
            const unreads = unreadCounts[room.id] || 0;
            const hasActivity = roomUnreadActivity[room.id];
            const textColor =
              unreads > 0 ? "#f39c12" : hasActivity ? "#7f8c8d" : "#e0e0e0";
            const iconColor = isActive
              ? "#3498db"
              : unreads > 0
                ? "#f39c12"
                : hasActivity
                  ? "#7f8c8d"
                  : "#666";

            return (
              <TouchableOpacity
                key={`room-${room.id}`}
                style={[
                  styles.pmItem,
                  isActive && styles.pmItemActive,
                  unreads > 0 && styles.pmItemUnread,
                ]}
                onPress={() => {
                  setActiveChat(room.id);
                  onClose();
                }}
              >
                <View style={styles.pmInfo}>
                  <Ionicons
                    name="chatbubbles"
                    size={24}
                    color={iconColor}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[styles.pmItemText, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {room.title}
                  </Text>
                </View>
                <View style={styles.pmActions}>
                  {unreads > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreads > 99 ? "99+" : unreads}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => togglePinRoom(room.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name={isPinned ? "pin" : "pin-outline"}
                      size={20}
                      color={isPinned ? "#3498db" : "#888"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => leaveChannel(room.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="close" size={22} color="#ff4757" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.divider} />
        <TouchableOpacity style={styles.menuItem} onPress={disconnectChat}>
          <Ionicons name="log-out" size={20} color="#ff4757" />
          <Text style={[styles.menuItemText, { color: "#ff4757" }]}>
            Desconectar
          </Text>
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#1c1e26",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  headerInfo: { flex: 1, marginLeft: 15 },
  headerText: { color: "white", fontWeight: "bold", fontSize: 16 },
  headerStatusMsg: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 15 },
  menuItemText: {
    color: "#e0e0e0",
    fontSize: 16,
    marginLeft: 15,
    fontWeight: "500",
  },
  sectionTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  pmItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  pmItemActive: { backgroundColor: "#1a1a2e" },
  pmItemUnread: { backgroundColor: "rgba(243, 156, 18, 0.1)" },
  pmInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  pmAvatar: { width: 32, height: 32, borderRadius: 4, marginRight: 10 },
  pmItemText: {
    color: "#e0e0e0",
    fontWeight: "bold",
    fontSize: 15,
    flexShrink: 1,
  },
  pmActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { padding: 5, marginLeft: 5 },
  badge: {
    backgroundColor: "#f39c12",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 5,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { color: "#0b0c10", fontSize: 10, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#2d3436", marginVertical: 5 },
  emptyText: {
    color: "#666",
    padding: 15,
    textAlign: "center",
    fontStyle: "italic",
  },
});
