import React, { useState, useEffect, useRef } from "react";
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
import { getGenderColor, BBCODE_COLORS } from "@/constants/theme";
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

const formatCooldown = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const DEFAULT_ROOM_SETTINGS = {
  notifyAll: false,
  notifyName: true,
  highlightWords: "",
};

export function RoomChat() {
  const { t } = useTranslation();
  const activeChat = useChatStore((state) => state.activeChat!);
  const joinedChannels = useChatStore((state) => state.joinedChannels);
  const sendChannelMessage = useChatStore((state) => state.sendChannelMessage);
  const sendStaffAlert = useChatStore((state) => state.sendStaffAlert);
  const myCharacterName = useChatStore((state) => state.myCharacterName);
  const channelAdCooldowns = useChatStore((state) => state.channelAdCooldowns);
  const processCommand = useChatStore((state) => state.processCommand);
  const setSelectedUserProfile = useChatStore(
    (state) => state.setSelectedUserProfile,
  );
  const ignoredUsers = useChatStore((state) => state.ignoredUsers);
  const hiddenAdsUsers = useChatStore((state) => state.hiddenAdsUsers);
  const systemNotice = useChatStore((state) => state.systemNotice);
  const globalOps = useChatStore((state) => state.globalOps);

  const globalSettings = useSettingsStore((state) => state.globalSettings);

  const roomSettings =
    useSettingsStore((state) => state.roomSettings[activeChat]) ||
    DEFAULT_ROOM_SETTINGS;
  const setRoomSettings = useSettingsStore((state) => state.setRoomSettings);

  const room = joinedChannels[activeChat];

  const [inputText, setInputText] = useState("");
  const [filterMode, setFilterMode] = useState<"both" | "chat" | "ads">("both");
  const [inputType, setInputType] = useState<"chat" | "ad">("chat");
  const [adCooldown, setAdCooldown] = useState(0);

  const [showDesc, setShowDesc] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState("");

  const [showColors, setShowColors] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draftNotifyAll, setDraftNotifyAll] = useState(roomSettings.notifyAll);
  const [draftNotifyName, setDraftNotifyName] = useState(
    roomSettings.notifyName,
  );
  const [draftHighlightWords, setDraftHighlightWords] = useState(
    roomSettings.highlightWords,
  );

  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });

  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (room?.mode === "chat") {
      setFilterMode("chat");
      setInputType("chat");
    } else if (room?.mode === "ads") {
      setFilterMode("ads");
      setInputType("ad");
    } else if (room?.mode === "both") {
      setFilterMode("both");
    }
  }, [room?.mode, activeChat]);

  useEffect(() => {
    setDraftNotifyAll(roomSettings.notifyAll);
    setDraftNotifyName(roomSettings.notifyName);
    setDraftHighlightWords(roomSettings.highlightWords);
  }, [activeChat, roomSettings]);

  const lastAdSent = channelAdCooldowns[activeChat];

  useEffect(() => {
    if (!lastAdSent) {
      setAdCooldown(0);
      return;
    }
    const checkCooldown = () => {
      const remaining = 600000 - (Date.now() - lastAdSent);
      if (remaining > 0) setAdCooldown(remaining);
      else setAdCooldown(0);
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastAdSent, activeChat]);

  if (!room)
    return (
      <View style={styles.container}>
        <Text style={{ color: "white" }}>{t("roomChat.loadingRoom")}</Text>
      </View>
    );

  const filteredMessages = room.messages.filter((msg) => {
    if (ignoredUsers.includes(msg.from)) return false;
    if (msg.type === "ad" && hiddenAdsUsers.includes(msg.from)) return false;
    if (filterMode === "both") return true;
    if (filterMode === "chat") return msg.type !== "ad";
    if (filterMode === "ads") return msg.type === "ad";
    return true;
  });

  const reversedMessages = [...filteredMessages].reverse();
  const MAX_LENGTH = inputType === "ad" ? 50000 : 4096;
  const isAdCooldownActive = inputType === "ad" && adCooldown > 0;
  const isSendDisabled = inputText.trim().length === 0 || isAdCooldownActive;

  const handleTextChange = (text: string) => {
    if (globalSettings.sendOnEnter && text.endsWith("\n")) {
      const textToSend = text.slice(0, -1);
      if (textToSend.trim().length > 0 && !isSendDisabled) {
        const isCmd = processCommand(activeChat, textToSend, true);
        if (!isCmd) sendChannelMessage(activeChat, textToSend, inputType);
        setInputText("");
        isAtBottomRef.current = true;
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      return;
    }
    setInputText(text);
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
    if (!isSendDisabled) {
      const isCmd = processCommand(activeChat, inputText, true);
      if (!isCmd) sendChannelMessage(activeChat, inputText, inputType);
      setInputText("");
      isAtBottomRef.current = true;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleSendAlert = () => {
    if (alertText.trim()) {
      sendStaffAlert(activeChat, alertText);
      setAlertText("");
      setShowAlert(false);
    }
  };
  const handleSaveSettings = () => {
    setRoomSettings(
      activeChat,
      {
        notifyAll: draftNotifyAll,
        notifyName: draftNotifyName,
        highlightWords: draftHighlightWords,
      },
      myCharacterName || "",
    );
    setShowSettingsModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.roomToolsBar}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setShowDesc(true)}
        >
          <Ionicons name="document-text" size={14} color="#aaa" />
          <Text style={styles.toolBtnText}>{t("roomChat.tools.room")}</Text>
        </TouchableOpacity>
        <View style={styles.toolDivider} />
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setShowSettingsModal(true)}
        >
          <Ionicons name="settings" size={14} color="#aaa" />
          <Text style={styles.toolBtnText}>{t("roomChat.tools.alerts")}</Text>
        </TouchableOpacity>
        <View style={styles.toolDivider} />
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => useChatStore.getState().openLogs(activeChat)}
        >
          <Ionicons name="folder-open" size={14} color="#f1c40f" />
          <Text style={[styles.toolBtnText, { color: "#f1c40f" }]}>
            {t("roomChat.tools.logs")}
          </Text>
        </TouchableOpacity>
        <View style={styles.toolDivider} />
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setShowAlert(true)}
        >
          <Ionicons name="alert-circle" size={14} color="#ff4757" />
          <Text style={[styles.toolBtnText, { color: "#ff4757" }]}>
            {t("roomChat.tools.report")}
          </Text>
        </TouchableOpacity>
      </View>

      {room.mode === "both" && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filterMode === "both" && styles.filterBtnActive,
            ]}
            onPress={() => setFilterMode("both")}
          >
            <Text
              style={[
                styles.filterText,
                filterMode === "both" && styles.filterTextActive,
              ]}
            >
              {t("roomChat.filters.both")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filterMode === "chat" && styles.filterBtnActive,
            ]}
            onPress={() => setFilterMode("chat")}
          >
            <Text
              style={[
                styles.filterText,
                filterMode === "chat" && styles.filterTextActive,
              ]}
            >
              {t("roomChat.filters.chatOnly")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filterMode === "ads" && styles.filterBtnActive,
            ]}
            onPress={() => setFilterMode("ads")}
          >
            <Text
              style={[
                styles.filterText,
                filterMode === "ads" && styles.filterTextActive,
              ]}
            >
              {t("roomChat.filters.adsOnly")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        keyExtractor={(_, index) => index.toString()}
        extraData={room.users.length}
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
          const isMe = item.from === myCharacterName || item.from === "Yo";
          const isAd = item.type === "ad";
          let bubbleStyle: any = styles.messageBubbleThem;
          if (isMe) bubbleStyle = styles.messageBubbleMe;
          else if (isAd) bubbleStyle = styles.messageBubbleAd;

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

          const isSystem = item.from === "System";
          const senderColor = isSystem
            ? "#e74c3c"
            : getGenderColor(
                useChatStore.getState().onlineCharacters[item.from]?.gender ||
                  "none",
              );

          let roleIcon: "diamond" | "key" | "shield-half" | undefined =
            undefined;
          let roleColor: string | undefined = undefined;
          if (globalOps.includes(item.from)) {
            roleIcon = "diamond";
            roleColor = "#00d2d3";
          } else if (room.owner === item.from) {
            roleIcon = "key";
            roleColor = "#feca57";
          } else if (room.oplist?.includes(item.from)) {
            roleIcon = "shield-half";
            roleColor = "#feca57";
          }

          return (
            <View style={[styles.messageBubble, bubbleStyle]}>
              <View style={styles.bubbleHeader}>
                <TouchableOpacity
                  disabled={isSystem}
                  onPress={() => setSelectedUserProfile(item.from)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    flex: 1,
                    paddingRight: 10,
                  }}
                >
                  {roleIcon && (
                    <Ionicons
                      name={roleIcon}
                      size={14}
                      color={roleColor}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.messageSender, { color: senderColor }]}>
                    {item.from}{" "}
                    {isAd && (
                      <Text style={{ color: "#f39c12", fontSize: 10 }}>
                        [AD]
                      </Text>
                    )}
                  </Text>
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

      {systemNotice && (
        <View style={styles.systemNoticeBanner}>
          <Text style={styles.systemNoticeText}>⚠️ {systemNotice}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        {room.mode === "both" && (
          <View style={styles.inputTypeSelector}>
            <TouchableOpacity
              style={[
                styles.inputTypeBtn,
                inputType === "chat" && styles.inputTypeBtnActive,
              ]}
              onPress={() => setInputType("chat")}
            >
              <Text
                style={[
                  styles.inputTypeText,
                  inputType === "chat" && styles.inputTypeTextActive,
                ]}
              >
                {t("roomChat.inputType.chat")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.inputTypeBtn,
                inputType === "ad" && styles.inputTypeBtnActiveAd,
              ]}
              onPress={() => setInputType("ad")}
            >
              <Text
                style={[
                  styles.inputTypeText,
                  inputType === "ad" && styles.inputTypeTextActive,
                ]}
              >
                {t("roomChat.inputType.ad")}
              </Text>
            </TouchableOpacity>
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
            style={[
              styles.chatInput,
              inputType === "ad" && { borderColor: "#1e2749", borderWidth: 1 },
            ]}
            value={inputText}
            onChangeText={handleTextChange}
            selection={inputSelection}
            onSelectionChange={(e) =>
              setInputSelection(e.nativeEvent.selection)
            }
            placeholder={
              inputType === "chat"
                ? t("roomChat.placeholders.chat")
                : t("roomChat.placeholders.ad")
            }
            placeholderTextColor="#888"
            multiline
            maxLength={MAX_LENGTH}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSendDisabled
                ? { opacity: 0.5, backgroundColor: "#555" }
                : inputType === "ad"
                  ? { backgroundColor: "#1e2749" }
                  : {},
            ]}
            onPress={handleSend}
            disabled={isSendDisabled}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {isAdCooldownActive
                ? formatCooldown(adCooldown)
                : t("roomChat.sendBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSettingsModal && (
        <TouchableOpacity
          style={styles.absoluteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("roomChat.modals.settings.title")}
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={28} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setDraftNotifyAll(!draftNotifyAll)}
              >
                <Ionicons
                  name={draftNotifyAll ? "checkbox" : "square-outline"}
                  size={24}
                  color={draftNotifyAll ? "#3498db" : "#888"}
                />
                <Text style={styles.checkboxLabel}>
                  {t("roomChat.modals.settings.notifyAll")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setDraftNotifyName(!draftNotifyName)}
              >
                <Ionicons
                  name={draftNotifyName ? "checkbox" : "square-outline"}
                  size={24}
                  color={draftNotifyName ? "#3498db" : "#888"}
                />
                <Text style={styles.checkboxLabel}>
                  {t("roomChat.modals.settings.notifyName")}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: "#aaa", marginTop: 15, marginBottom: 5 }}>
                {t("roomChat.modals.settings.highlightWords")}
              </Text>
              <TextInput
                style={[styles.chatInput, { maxHeight: 80, marginBottom: 15 }]}
                value={draftHighlightWords}
                onChangeText={setDraftHighlightWords}
                placeholder={t("roomChat.modals.settings.highlightPlaceholder")}
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={styles.alertSubmitBtn}
                onPress={handleSaveSettings}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {t("roomChat.modals.settings.saveBtn")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

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
                <Text
                  style={{
                    fontSize: globalSettings.fontSize,
                    color: "#e0e0e0",
                  }}
                >
                  <BBCodeText
                    text={
                      inputText || t("chat.previewModal.empty")
                    }
                  />
                </Text>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showDesc && (
        <TouchableOpacity
          style={styles.absoluteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDesc(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("roomChat.modals.description.title")}</Text>
              <TouchableOpacity onPress={() => setShowDesc(false)}>
                <Ionicons name="close" size={28} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text
                style={{ fontSize: globalSettings.fontSize, color: "#e0e0e0" }}
              >
                {room.description ? (
                  <BBCodeText text={room.description} />
                ) : (
                  t("roomChat.modals.description.empty")
                )}
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showAlert && (
        <TouchableOpacity
          style={styles.absoluteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlert(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: "60%" }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: "#ff4757" }]}>
                {t("roomChat.modals.report.title")}
              </Text>
              <TouchableOpacity onPress={() => setShowAlert(false)}>
                <Ionicons name="close" size={28} color="#aaa" />
              </TouchableOpacity>
            </View>
            <Text style={styles.warningText}>
              {t("roomChat.modals.report.warning")}
            </Text>
            <TextInput
              style={styles.alertInput}
              placeholder={t("roomChat.modals.report.placeholder")}
              placeholderTextColor="#666"
              value={alertText}
              onChangeText={setAlertText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.alertSubmitBtn,
                !alertText.trim() && { opacity: 0.5 },
              ]}
              onPress={handleSendAlert}
              disabled={!alertText.trim()}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {t("roomChat.modals.report.submitBtn")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  roomToolsBar: {
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
    fontSize: 11,
    fontWeight: "bold",
  },
  toolDivider: { width: 1, backgroundColor: "#2d3436", marginVertical: 8 },
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
  modalContent: {
    backgroundColor: "#1e1e28",
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
  warningText: {
    color: "#ffa502",
    padding: 15,
    fontSize: 12,
    backgroundColor: "rgba(255, 165, 2, 0.1)",
    fontWeight: "bold",
  },
  alertInput: {
    backgroundColor: "#111",
    color: "white",
    padding: 15,
    margin: 15,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  alertSubmitBtn: { backgroundColor: "#3498db", padding: 15, borderRadius: 8 },
  filterBar: {
    flexDirection: "row",
    backgroundColor: "#121212",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  filterBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 4,
  },
  filterBtnActive: { backgroundColor: "#2d3436" },
  filterText: {
    color: "#888",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  filterTextActive: { color: "#00a8ff" },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: "95%",
  },
  messageBubbleMe: { backgroundColor: "#0b8263", alignSelf: "flex-end" },
  messageBubbleThem: { backgroundColor: "#2d3436", alignSelf: "flex-start" },
  messageBubbleAd: {
    backgroundColor: "#1e2749",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#273c75",
  },
  bubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  messageSender: { fontSize: 13, fontWeight: "bold" },
  messageTime: { fontSize: 10, color: "#888" },
  inputContainer: {
    backgroundColor: "#121212",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  inputTypeSelector: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  inputTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  inputTypeBtnActive: { backgroundColor: "#0b8263" },
  inputTypeBtnActiveAd: { backgroundColor: "#1e2749" },
  inputTypeText: { color: "#666", fontWeight: "bold", fontSize: 12 },
  inputTypeTextActive: { color: "white" },
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
    maxHeight: 150,
  },
  sendButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: "center",
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
    paddingRight: 5,
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
  helpText: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  helpCmd: { fontWeight: "bold", color: "#3498db" },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  checkboxLabel: { color: "#ccc", marginLeft: 10, fontSize: 14, flexShrink: 1 },
});
