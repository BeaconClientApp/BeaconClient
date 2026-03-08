import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore, LogManager, ChatMessage } from "@/store/useChatStore";
import { BBCodeText } from "@/components/BBCodeText";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getGenderColor } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const formatTime = (ts?: number) => {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const normalizeString = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function LogsViewer() {
  const { t } = useTranslation();
  const isLogsModalOpen = useChatStore((s) => s.isLogsModalOpen);
  const setLogsModalOpen = useChatStore((s) => s.setLogsModalOpen);
  const myCharacterName = useChatStore((s) => s.myCharacterName);
  const publicChannels = useChatStore((s) => s.publicChannels);
  const knownRoomTitles = useChatStore((s) => s.knownRoomTitles);
  const logsPreselectedTarget = useChatStore((s) => s.logsPreselectedTarget);
  const onlineCharacters = useChatStore((s) => s.onlineCharacters);
  const setSelectedUserProfile = useChatStore((s) => s.setSelectedUserProfile);
  const globalSettings = useSettingsStore((s) => s.globalSettings);

  const [targets, setTargets] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const [fullLogs, setFullLogs] = useState<ChatMessage[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>("All");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (isLogsModalOpen && myCharacterName) {
      LogManager.getAvailableTargets(myCharacterName).then((t) => {
        const sorted = t.sort();
        setTargets(sorted);
        if (logsPreselectedTarget && sorted.includes(logsPreselectedTarget)) {
          setSelectedTarget(logsPreselectedTarget);
          setSelectedDate("All");
        }
      });
    } else {
      setSelectedTarget(null);
      setSearchText("");
      setSelectedDate("All");
    }
  }, [isLogsModalOpen, myCharacterName, logsPreselectedTarget]);

  useEffect(() => {
    if (selectedTarget && myCharacterName) {
      setIsLoadingLogs(true);
      LogManager.loadFull(myCharacterName, selectedTarget).then((logs) => {
        setFullLogs(logs);
        setIsLoadingLogs(false);
      });
    } else {
      setFullLogs([]);
    }
  }, [selectedTarget, myCharacterName]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    fullLogs.forEach((log) => {
      if (log.timestamp)
        dates.add(new Date(log.timestamp).toLocaleDateString());
    });
    return [
      "All",
      ...Array.from(dates).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    ];
  }, [fullLogs]);

  const filteredLogs = useMemo(() => {
    return fullLogs.filter((log) => {
      if (
        selectedDate !== "All" &&
        log.timestamp &&
        new Date(log.timestamp).toLocaleDateString() !== selectedDate
      )
        return false;
      if (searchText) {
        const search = normalizeString(searchText);
        const msg = normalizeString(log.message);
        const from = normalizeString(log.from);
        if (!msg.includes(search) && !from.includes(search)) return false;
      }
      return true;
    });
  }, [fullLogs, selectedDate, searchText]);

  const formatTargetName = (t: string) => {
    if (knownRoomTitles[t]) return `#${knownRoomTitles[t]}`;
    if (t.toLowerCase().startsWith("adh-")) return `#${t}`;
    const isPublic = publicChannels.some(
      (c) => c.name.toLowerCase() === t.toLowerCase(),
    );
    if (isPublic) return `#${t}`;
    return t;
  };

  if (!isLogsModalOpen) return null;

  return (
    <View style={styles.absoluteContainer}>
      <View style={styles.header}>
        <Ionicons name="folder-open" size={24} color="#3498db" />
        <Text style={styles.title}>{t("logsViewer.title")}</Text>
        <TouchableOpacity onPress={() => setLogsModalOpen(false)}>
          <Ionicons name="close" size={28} color="#aaa" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setShowTargetPicker(true)}
        >
          <Text style={styles.pickerText} numberOfLines={1}>
            {selectedTarget
              ? formatTargetName(selectedTarget)
              : t("logsViewer.selectChat")}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#aaa" />
        </TouchableOpacity>

        {selectedTarget && availableDates.length > 1 && (
          <View style={styles.dateScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
            >
              {availableDates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.datePill,
                    selectedDate === date && styles.datePillActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      selectedDate === date && { color: "white" },
                    ]}
                  >
                    {date === "All" ? t("logsViewer.allDates") : date}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedTarget && (
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color="#888"
              style={{ marginLeft: 10 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("logsViewer.searchPlaceholder")}
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#888"
                  style={{ marginRight: 10 }}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
        {isLoadingLogs ? (
          <ActivityIndicator
            size="large"
            color="#3498db"
            style={{ marginTop: 50 }}
          />
        ) : !selectedTarget ? (
          <Text style={styles.emptyText}>
            {t("logsViewer.emptyNoTarget")}
          </Text>
        ) : filteredLogs.length === 0 ? (
          <Text style={styles.emptyText}>{t("logsViewer.emptyNoResults")}</Text>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => {
              const lowerMsg = item.message.toLowerCase();
              let isAction = false;
              let actionDisplay = item.message;
              if (lowerMsg.startsWith("/me ")) {
                isAction = true;
                actionDisplay = item.message.substring(4);
              } else if (lowerMsg.startsWith("/me's ")) {
                isAction = true;
                actionDisplay = item.message.substring(3);
              }

              const isSystem = item.from === "System";
              const senderColor = isSystem
                ? "#e74c3c"
                : onlineCharacters[item.from]
                  ? getGenderColor(onlineCharacters[item.from]?.gender)
                  : "#3498db";

              return (
                <View style={styles.logMessage}>
                  <View style={styles.logHeader}>
                    <TouchableOpacity
                      disabled={isSystem}
                      onPress={() => setSelectedUserProfile(item.from)}
                    >
                      <Text style={[styles.logSender, { color: senderColor }]}>
                        {item.from}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.logTime}>
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleDateString()
                        : ""}{" "}
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: globalSettings.fontSize,
                      color: "#e0e0e0",
                    }}
                  >
                    <BBCodeText
                      text={isAction ? actionDisplay : item.message}
                      isAction={isAction}
                    />
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <Modal
        visible={showTargetPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTargetPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("logsViewer.modalTitle")}</Text>
            <FlatList
              data={targets}
              keyExtractor={(t) => t}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.targetItem}
                  onPress={() => {
                    setSelectedTarget(item);
                    setSelectedDate("All");
                    setShowTargetPicker(false);
                  }}
                >
                  <Text style={styles.targetItemText}>
                    {formatTargetName(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowTargetPicker(false)}
            >
              <Text style={styles.closeModalText}>{t("logsViewer.cancelBtn")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0b0c10",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    zIndex: 999,
    elevation: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
    backgroundColor: "#1c1e26",
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  filtersContainer: {
    backgroundColor: "#13151a",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e1e28",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  pickerText: { color: "white", fontSize: 15, fontWeight: "bold", flex: 1 },
  dateScrollWrapper: { marginTop: 15, marginBottom: 5 },
  dateScroll: { flexDirection: "row" },
  datePill: {
    backgroundColor: "#1e1e28",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  datePillActive: { backgroundColor: "#3498db", borderColor: "#2980b9" },
  datePillText: { color: "#aaa", fontSize: 13, fontWeight: "bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e28",
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, color: "white", padding: 10, fontSize: 14 },
  listContainer: { flex: 1 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
  logMessage: {
    backgroundColor: "#1e1e28",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2d3436",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  logSender: { fontWeight: "bold", fontSize: 13 },
  logTime: { color: "#888", fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e28",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  targetItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  targetItemText: { color: "#e0e0e0", fontSize: 16 },
  closeModalBtn: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  closeModalText: { color: "white", fontWeight: "bold" },
});
