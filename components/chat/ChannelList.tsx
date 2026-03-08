import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore, ChannelInfo } from "@/store/useChatStore";
import { useTranslation } from "react-i18next";

type ListType = "official" | "open";

export function ChannelList() {
  const { t } = useTranslation();
  const publicChannels = useChatStore((state) => state.publicChannels);
  const openRooms = useChatStore((state) => state.openRooms);

  const requestChannels = useChatStore((state) => state.requestChannels);
  const requestOpenRooms = useChatStore((state) => state.requestOpenRooms);
  const joinChannel = useChatStore((state) => state.joinChannel);

  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listType, setListType] = useState<ListType>("official");

  useEffect(() => {
    if (listType === "official" && publicChannels.length === 0) {
      requestChannels();
    } else if (listType === "open" && openRooms.length === 0) {
      requestOpenRooms();
    }
  }, [
    listType,
    publicChannels.length,
    openRooms.length,
    requestChannels,
    requestOpenRooms,
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (listType === "official") requestChannels();
    else requestOpenRooms();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const activeList = listType === "official" ? publicChannels : openRooms;
  const filteredChannels = activeList.filter((c) => {
    const displayName = c.title || c.name;
    return displayName.toLowerCase().includes(search.toLowerCase());
  });

  const renderItem = ({ item }: { item: ChannelInfo }) => {
    const displayName = item.title || item.name;
    const isOfficial = listType === "official";

    return (
      <View style={styles.channelItem}>
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{displayName}</Text>
          <Text style={styles.channelMeta}>
            <Ionicons name="people" size={12} color="#888" /> {item.characters}{" "}
            {t("channelList.users")}
            {isOfficial && item.mode
              ? t("channelList.mode", { mode: item.mode })
              : t("channelList.openPrivateRoom")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => joinChannel(item.name)}
        >
          <Text style={styles.joinButtonText}>{t("channelList.joinBtn")}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("channelList.searchPlaceholder")}
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, listType === "official" && styles.activeTab]}
          onPress={() => setListType("official")}
        >
          <Text
            style={[
              styles.tabText,
              listType === "official" && styles.activeTabText,
            ]}
          >
            {t("channelList.tabOfficial")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, listType === "open" && styles.activeTab]}
          onPress={() => setListType("open")}
        >
          <Text
            style={[
              styles.tabText,
              listType === "open" && styles.activeTabText,
            ]}
          >
            {t("channelList.tabCustom")}
          </Text>
        </TouchableOpacity>
      </View>

      {activeList.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00a8ff" />
          <Text style={{ color: "#888", marginTop: 10 }}>
            Cargando{" "}
            {listType === "official"
              ? t("channelList.loadingOfficial")
              : t("channelList.loadingCustom")}
            ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChannels}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t("channelList.noResults")}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#222",
    color: "white",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  refreshBtn: { padding: 5, minWidth: 30, alignItems: "center" },

  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    backgroundColor: "#1a1a1a",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#3498db" },
  tabText: { color: "#888", fontWeight: "bold" },
  activeTabText: { color: "#3498db" },

  channelItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  channelInfo: { flex: 1, paddingRight: 10 },
  channelName: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  channelMeta: { color: "#888", fontSize: 12 },
  joinButton: {
    backgroundColor: "#3498db",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  joinButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#666", textAlign: "center", marginTop: 20 },
});
