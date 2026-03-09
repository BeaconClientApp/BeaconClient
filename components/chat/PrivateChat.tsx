import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/useChatStore";
import { BBCodeText } from "@/components/BBCodeText";
import { useSettingsStore } from "@/store/useSettingsStore";
import { BBCODE_COLORS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const formatTime = (ts?: number) => {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return isToday ? timeStr : `${date.toLocaleDateString()} ${timeStr}`;
};

export function PrivateChat() {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");

  const activeChat = useChatStore((state) => state.activeChat!);
  const sendPrivateMessage = useChatStore((state) => state.sendPrivateMessage);
  const privateMessages = useChatStore((state) => state.privateMessages);
  const sendTyping = useChatStore((state) => state.sendTyping);
  const typingStatuses = useChatStore((state) => state.typingStatuses);
  const processCommand = useChatStore((state) => state.processCommand);
  const setSelectedUserProfile = useChatStore(
    (state) => state.setSelectedUserProfile,
  );
  const systemNotice = useChatStore((state) => state.systemNotice);

  const globalSettings = useSettingsStore((state) => state.globalSettings);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);

  const [showColors, setShowColors] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });

  const messages = privateMessages[activeChat] || [];
  const reversedMessages = [...messages].reverse();
  const partnerTypingStatus = typingStatuses[activeChat];
  const MAX_LENGTH = 50000;

  const handleTextChange = (text: string) => {
    if (globalSettings.sendOnEnter && text.endsWith("\n")) {
      const textToSend = text.slice(0, -1);
      if (textToSend.trim().length > 0) {
        const isCmd = processCommand(activeChat, textToSend, false);
        if (!isCmd) sendPrivateMessage(activeChat, textToSend);
        setInputText("");
        sendTyping(activeChat, "clear");
        isTypingRef.current = false;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isAtBottomRef.current = true;
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      return;
    }

    setInputText(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.length === 0) {
      sendTyping(activeChat, "clear");
      isTypingRef.current = false;
    } else {
      if (!isTypingRef.current) {
        sendTyping(activeChat, "typing");
        isTypingRef.current = true;
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeChat, "paused");
        isTypingRef.current = false;
      }, 3000);
    }
  };

  const insertBBCode = (tag: string, value?: string) => {
    const before = inputText.substring(0, inputSelection.start);
    const selected = inputText.substring(
      inputSelection.start,
      inputSelection.end,
    );
    const after = inputText.substring(inputSelection.end);

    if (tag === "url") {
      const isUrl =
        selected.startsWith("http://") || selected.startsWith("https://");
      if (isUrl) {
        handleTextChange(before + `[url=${selected}][/url]` + after);
      } else if (selected.length > 0) {
        handleTextChange(before + `[url=]${selected}[/url]` + after);
      } else {
        handleTextChange(before + `[url=][/url]` + after);
      }
      return;
    }

    const openTag = value ? `[${tag}=${value}]` : `[${tag}]`;
    const closeTag = `[/${tag}]`;
    handleTextChange(before + openTag + selected + closeTag + after);
  };

  const handleSend = () => {
    if (inputText.trim()) {
      const isCmd = processCommand(activeChat, inputText, false);
      if (!isCmd) sendPrivateMessage(activeChat, inputText);
      setInputText("");
      sendTyping(activeChat, "clear");
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isAtBottomRef.current = true;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeChat]);

  return (
    <View style={styles.container}>
      <View style={styles.chatToolsBar}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => useChatStore.getState().openLogs(activeChat)}
        >
          <Ionicons name="folder-open" size={16} color="#f1c40f" />
          <Text style={[styles.toolBtnText, { color: "#f1c40f" }]}>
            {t("chat.viewLogs")}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        keyExtractor={(_, index) => index.toString()}
        inverted
        style={{ padding: 10 }}
        onScroll={(e) => {
          isAtBottomRef.current = e.nativeEvent.contentOffset.y <= 50;
        }}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (isAtBottomRef.current && flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }}
        renderItem={({ item }) => {
          const myCharacterName = useChatStore.getState().myCharacterName;
          const isMe = item.from === myCharacterName || item.from === "Yo";
          const lowerMsg = item.message.toLowerCase();
          let isAction = false;
          let actionDisplay = item.message;
          if (lowerMsg.startsWith("/me ")) {
            isAction = true;
            actionDisplay = item.message.substring(4);
          } else if (lowerMsg.startsWith("/me&apos;s ")) {
            isAction = true;
            actionDisplay = item.message.substring(3);
          }

          return (
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
              ]}
            >
              <View style={styles.bubbleHeader}>
                <TouchableOpacity
                  onPress={() => setSelectedUserProfile(item.from)}
                >
                  <Text style={styles.messageSender}>{item.from}</Text>
                </TouchableOpacity>
                <Text style={styles.messageTime}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
              <BBCodeText
                text={isAction ? actionDisplay : item.message}
                isAction={isAction}
              />
            </View>
          );
        }}
      />

      {partnerTypingStatus && partnerTypingStatus !== "clear" && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {partnerTypingStatus === "typing"
              ? t("chat.isTyping", { name: activeChat })
              : t("chat.typedSomething", { name: activeChat })}
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        {systemNotice && (
          <View style={styles.systemNoticeBanner}>
            <Text style={styles.systemNoticeText}>⚠️ {systemNotice}</Text>
          </View>
        )}

        <View style={styles.toolbarContainer}>
          <View style={styles.bbcodeToolbar}>
            <TouchableOpacity
              onPress={() => insertBBCode("b")}
              style={styles.toolbarBtn}
            >
              <Text style={[styles.toolbarText, { fontWeight: "bold" }]}>
                B
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("i")}
              style={styles.toolbarBtn}
            >
              <Text style={[styles.toolbarText, { fontStyle: "italic" }]}>
                I
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("u")}
              style={styles.toolbarBtn}
            >
              <Text
                style={[
                  styles.toolbarText,
                  { textDecorationLine: "underline" },
                ]}
              >
                U
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("s")}
              style={styles.toolbarBtn}
            >
              <Text
                style={[
                  styles.toolbarText,
                  { textDecorationLine: "line-through" },
                ]}
              >
                S
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("sup")}
              style={styles.toolbarBtn}
            >
              <Text style={styles.toolbarText}>x²</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("sub")}
              style={styles.toolbarBtn}
            >
              <Text style={styles.toolbarText}>x₂</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("user")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="person" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("icon")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="image" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("eicon")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="happy" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("spoiler")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="eye-off" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("noparse")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="code-slash" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => insertBBCode("url")}
              style={styles.toolbarBtn}
            >
              <Ionicons name="link" size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowColors(!showColors)}
              style={styles.toolbarBtn}
            >
              <Ionicons
                name="color-palette"
                size={16}
                color={showColors ? "#3498db" : "#aaa"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPreviewModal(true)}
              style={styles.toolbarBtn}
            >
              <Ionicons name="eye" size={16} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowHelpModal(true)}
              style={styles.toolbarBtn}
            >
              <Ionicons name="help-circle" size={16} color="#eccc68" />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.charCounter,
              inputText.length >= MAX_LENGTH ? { color: "#ff4757" } : {},
            ]}
          >
            {inputText.length}/{MAX_LENGTH}
          </Text>
        </View>

        {showColors && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorPalette}
          >
            {BBCODE_COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.colorDot, { backgroundColor: c.hex }]}
                onPress={() => {
                  insertBBCode("color", c.name);
                  setShowColors(false);
                }}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.chatInput}
            value={inputText}
            onChangeText={handleTextChange}
            selection={inputSelection}
            onSelectionChange={(e) =>
              setInputSelection(e.nativeEvent.selection)
            }
            placeholder={t("chat.inputPlaceholder")}
            placeholderTextColor="#888"
            multiline
            maxLength={MAX_LENGTH}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length === 0 ? { opacity: 0.5 } : {},
            ]}
            onPress={handleSend}
            disabled={inputText.trim().length === 0}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              {t("chat.sendBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showHelpModal && (
        <TouchableOpacity
          style={styles.absoluteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelpModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("chat.helpModal.title")}</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={28} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.helpText}>
                <Text style={{ color: "#f39c12", fontWeight: "bold" }}>
                  {t("chat.helpModal.general")}
                </Text>
                {"\n"}
                <Text style={styles.helpCmd}>/clear</Text>{" "}
                {t("chat.helpModal.clear")}
                {"\n"}
                <Text style={styles.helpCmd}>/clearall</Text>{" "}
                {t("chat.helpModal.clearall")}
                {"\n"}
                <Text style={styles.helpCmd}>/uptime</Text>{" "}
                {t("chat.helpModal.uptime")}
                {"\n"}
                <Text style={styles.helpCmd}>/ignore [nombre]</Text>{" "}
                {t("chat.helpModal.ignore")}
                {"\n"}
                <Text style={styles.helpCmd}>/unignore [nombre]</Text>{" "}
                {t("chat.helpModal.unignore")}
                {"\n"}
                <Text style={styles.helpCmd}>/ignorelist</Text>{" "}
                {t("chat.helpModal.ignorelist")}
                {"\n"}
                <Text style={styles.helpCmd}>/status [estado] [msj]</Text>{" "}
                {t("chat.helpModal.status")}
                {"\n"}
                <Text style={styles.helpCmd}>/reward [nombre]</Text>{" "}
                {t("chat.helpModal.reward")}
                {"\n\n"}
                <Text style={{ color: "#3498db", fontWeight: "bold" }}>
                  {t("chat.helpModal.navigation")}
                </Text>
                {"\n"}
                <Text style={styles.helpCmd}>/join [sala]</Text>{" "}
                {t("chat.helpModal.join")}
                {"\n"}
                <Text style={styles.helpCmd}>/leave</Text>{" "}
                {t("chat.helpModal.leave")}{" "}
                <Text style={styles.helpCmd}>/close</Text>{" "}
                {t("chat.helpModal.leaveDesc")}
                {"\n"}
                <Text style={styles.helpCmd}>/priv [nombre]</Text>{" "}
                {t("chat.helpModal.priv")}
                {"\n"}
                <Text style={styles.helpCmd}>/channels</Text>{" "}
                {t("chat.helpModal.channels")}
                {"\n"}
                <Text style={styles.helpCmd}>/prooms</Text>{" "}
                {t("chat.helpModal.prooms")}
                {"\n\n"}
                <Text style={{ color: "#2ecc71", fontWeight: "bold" }}>
                  {t("chat.helpModal.interaction")}
                </Text>
                {"\n"}
                <Text style={styles.helpCmd}>/me [acción]</Text>{" "}
                {t("chat.helpModal.me")}
                {"\n"}
                <Text style={styles.helpCmd}>/ad [mensaje]</Text>{" "}
                {t("chat.helpModal.ad")}
                {"\n"}
                <Text style={styles.helpCmd}>/roll [dados]</Text>{" "}
                {t("chat.helpModal.roll")}
                {"\n"}
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showPreviewModal && (
        <TouchableOpacity
          style={styles.absoluteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPreviewModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: "60%" }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("chat.previewModal.title")}</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={28} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.modalScroll, { backgroundColor: "#1a1a1a" }]}
            >
              <View
                style={[
                  styles.messageBubble,
                  styles.messageBubbleMe,
                  { maxWidth: "100%" },
                ]}
              >
                <BBCodeText
                  text={inputText || t("chat.previewModal.empty")}
                />
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  chatToolsBar: {
    flexDirection: "row",
    backgroundColor: "#1c1e26",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  toolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  toolBtnText: {
    color: "#aaa",
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "bold",
  },
  absoluteModalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: "85%",
  },
  messageBubbleMe: { backgroundColor: "#0b8263", alignSelf: "flex-end" },
  messageBubbleThem: { backgroundColor: "#2d3436", alignSelf: "flex-start" },
  bubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "bold",
    marginRight: 10,
  },
  messageTime: { fontSize: 10, color: "#888" },
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#1a1a1a",
  },
  typingText: { color: "#00a8ff", fontSize: 12, fontStyle: "italic" },
  inputContainer: {
    backgroundColor: "#121212",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingTop: 0,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#222",
    color: "white",
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: "#0b8263",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  toolbarContainer: { paddingHorizontal: 10, paddingTop: 8 },
  bbcodeToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 5,
    marginBottom: 5,
    borderRadius: 4,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#333",
  },
  toolbarText: { color: "#aaa", fontSize: 14 },
  charCounter: {
    textAlign: "right",
    color: "#666",
    fontSize: 11,
    paddingRight: 10,
    paddingBottom: 5,
  },
  colorPalette: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    width: "100%",
    maxHeight: "80%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#252525",
  },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  modalScroll: { padding: 15 },
  helpText: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  helpCmd: { fontWeight: "bold", color: "#3498db" },
  systemNoticeBanner: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  systemNoticeText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
