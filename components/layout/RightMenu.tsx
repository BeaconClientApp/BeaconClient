import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  FlatList,
  StyleSheet,
} from "react-native";
import { useChatStore } from "@/store/useChatStore";
import { Ionicons } from "@expo/vector-icons";
import { getGenderColor, getStatusIcon } from "@/constants/theme";

export function RightMenu({ onSelect }: { onSelect: () => void }) {
  const friends = useChatStore((state) => state.friends);
  const onlineCharacters = useChatStore((state) => state.onlineCharacters);
  const globalOps = useChatStore((state) => state.globalOps);

  const apiFriends = useChatStore((state) => state.apiFriends);

  const setSelectedUserProfile = useChatStore(
    (state) => state.setSelectedUserProfile,
  );
  const activeChat = useChatStore((state) => state.activeChat);
  const joinedChannels = useChatStore((state) => state.joinedChannels);

  const isRoom = activeChat ? !!joinedChannels[activeChat] : false;
  const room = isRoom ? joinedChannels[activeChat!] : null;

  const [tab, setTab] = useState<"friends" | "members">("friends");

  useEffect(() => {
    if (isRoom) setTab("members");
    else setTab("friends");
  }, [activeChat, isRoom]);

  const sortedFriends = [...friends].sort((a, b) => a.localeCompare(b));

  const onlineAmigos = sortedFriends.filter(
    (f) => onlineCharacters[f] && apiFriends.includes(f),
  );
  const onlineBookmarks = sortedFriends.filter(
    (f) => onlineCharacters[f] && !apiFriends.includes(f),
  );
  const offlineFriends = sortedFriends.filter((f) => !onlineCharacters[f]);

  const friendSections = [];
  if (onlineAmigos.length > 0)
    friendSections.push({
      title: `🟢 Amigos (${onlineAmigos.length})`,
      data: onlineAmigos,
    });
  if (onlineBookmarks.length > 0)
    friendSections.push({
      title: `🔖 Bookmarks (${onlineBookmarks.length})`,
      data: onlineBookmarks,
    });
  if (offlineFriends.length > 0)
    friendSections.push({
      title: `⚪ Desconectados (${offlineFriends.length})`,
      data: offlineFriends,
    });

  const getRoleData = (name: string) => {
    if (globalOps.includes(name))
      return { rank: 1, icon: "diamond", color: "#00d2d3" };
    if (room?.owner === name) return { rank: 2, icon: "key", color: "#feca57" };
    if (room?.oplist?.includes(name))
      return { rank: 3, icon: "shield-half", color: "#feca57" };
    return { rank: 4, icon: null, color: null };
  };

  const roomMembers = room
    ? [...room.users].sort((a, b) => {
        const rankA = getRoleData(a).rank;
        const rankB = getRoleData(b).rank;
        if (rankA !== rankB) return rankA - rankB;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      })
    : [];

  const renderMemberRow = ({ item }: { item: string }) => {
    const charData = onlineCharacters[item];
    const roleData = getRoleData(item);
    const statusIcon = getStatusIcon(charData?.status);
    const nameColor = getGenderColor(charData?.gender);

    return (
      <TouchableOpacity onPress={() => setSelectedUserProfile(item)}>
        <View style={styles.friendItem}>
          <Ionicons
            name={statusIcon as any}
            size={14}
            color={charData ? nameColor : "#555"}
            style={{ marginRight: 6 }}
          />
          {roleData.icon && (
            <Ionicons
              name={roleData.icon as any}
              size={14}
              color={roleData.color}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={[styles.memberName, { color: nameColor }]}>{item}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isRoom ? (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === "members" && styles.activeTab]}
            onPress={() => setTab("members")}
          >
            <Ionicons
              name="people"
              size={16}
              color={tab === "members" ? "#3498db" : "#888"}
            />
            <Text
              style={[
                styles.tabText,
                tab === "members" && styles.activeTabText,
              ]}
            >
              {" "}
              Miembros ({roomMembers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "friends" && styles.activeTab]}
            onPress={() => setTab("friends")}
          >
            <Ionicons
              name="heart"
              size={16}
              color={tab === "friends" ? "#e74c3c" : "#888"}
            />
            <Text
              style={[
                styles.tabText,
                tab === "friends" && { color: "#e74c3c" },
              ]}
            >
              {" "}
              Bookmarks
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.sectionTitle}>Lista de Contactos</Text>
      )}

      {tab === "members" && isRoom && (
        <FlatList
          data={roomMembers}
          keyExtractor={(item) => item}
          renderItem={renderMemberRow}
          initialNumToRender={20}
        />
      )}

      {tab === "friends" && (
        <SectionList
          sections={friendSections}
          keyExtractor={(item) => item}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item, section }) => {
            const isOnline = !section.title.includes("Desconectados");
            const charData = onlineCharacters[item];
            const roleData = getRoleData(item);

            const statusIcon = isOnline
              ? getStatusIcon(charData?.status)
              : "close";
            const nameColor = getGenderColor(charData?.gender);

            return (
              <TouchableOpacity onPress={() => setSelectedUserProfile(item)}>
                <View style={styles.friendItem}>
                  <Ionicons
                    name={statusIcon as any}
                    size={14}
                    color={isOnline ? nameColor : "#444"}
                    style={{ marginRight: 6 }}
                  />
                  {roleData.icon && (
                    <Ionicons
                      name={roleData.icon as any}
                      size={14}
                      color={roleData.color}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.friendName,
                      { color: isOnline ? nameColor : "#666" },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#3498db", backgroundColor: "#222" },
  tabText: { color: "#888", fontWeight: "bold", fontSize: 13 },
  activeTabText: { color: "#3498db" },
  sectionTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionHeader: {
    fontSize: 13,
    color: "#aaa",
    backgroundColor: "#1e1e1e",
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginTop: 10,
    fontWeight: "bold",
  },
  friendItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
  },
  friendName: { fontSize: 15, fontWeight: "bold" },
  memberName: { fontSize: 14, fontWeight: "bold" },
});
