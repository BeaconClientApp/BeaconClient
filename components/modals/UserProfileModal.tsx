import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useChatStore } from "@/store/useChatStore";
import { BBCodeText } from "@/components/BBCodeText";
import { getGenderColor, getStatusColor } from "@/constants/theme";
import { useTranslation } from "react-i18next";

interface Props {
  user: string;
  onClose: () => void;
  closeMenus: () => void;
}

export function UserProfileModal({ user, onClose, closeMenus }: Props) {
  const { t } = useTranslation();
  const onlineCharacters = useChatStore((state) => state.onlineCharacters);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const ignoredUsers = useChatStore((state) => state.ignoredUsers);
  const hiddenAdsUsers = useChatStore((state) => state.hiddenAdsUsers);
  const toggleIgnore = useChatStore((state) => state.toggleIgnore);
  const toggleHideAds = useChatStore((state) => state.toggleHideAds);
  const fetchMemo = useChatStore((state) => state.fetchMemo);
  const saveMemo = useChatStore((state) => state.saveMemo);
  const reportUser = useChatStore((state) => state.reportUser);

  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDraft, setReportDraft] = useState("");

  const isIgnored = ignoredUsers.includes(user);
  const isAdsHidden = hiddenAdsUsers.includes(user);

  const handleSaveMemo = async () => {
    await saveMemo(user, memoDraft);
    setShowMemoModal(false);
  };
  const handleSendReport = () => {
    if (reportDraft.trim()) {
      reportUser(user, reportDraft);
      setShowReportModal(false);
      setReportDraft("");
      alert(t("userProfile.reportModal.success"));
    }
  };

  if (showMemoModal) {
    return (
      <TouchableOpacity
        style={styles.absoluteModalOverlay}
        activeOpacity={1}
        onPress={() => setShowMemoModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.profileCard, { padding: 20 }]}
        >
          <Text style={styles.profileName}>{t("userProfile.memoModal.title", { user })}</Text>
          <TextInput
            style={styles.textInputArea}
            multiline
            placeholder={t("userProfile.memoModal.placeholder")}
            placeholderTextColor="#666"
            value={memoDraft}
            onChangeText={setMemoDraft}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 15,
            }}
          >
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowMemoModal(false)}
            >
              <Text style={styles.secondaryBtnText}>{t("userProfile.memoModal.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { borderColor: "#2ecc71", backgroundColor: "#2ecc7133" },
              ]}
              onPress={handleSaveMemo}
            >
              <Text
                style={{ color: "#2ecc71", fontWeight: "bold", marginLeft: 8 }}
              >
                {t("userProfile.memoModal.save")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  if (showReportModal) {
    return (
      <TouchableOpacity
        style={styles.absoluteModalOverlay}
        activeOpacity={1}
        onPress={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.profileCard, { padding: 20 }]}
        >
          <Text style={[styles.profileName, { color: "#e67e22" }]}>
            {t("userProfile.reportModal.title", { user })}
          </Text>
          <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>
            {t("userProfile.reportModal.warning")}
          </Text>
          <TextInput
            style={styles.textInputArea}
            multiline
            placeholder={t("userProfile.reportModal.placeholder")}
            placeholderTextColor="#666"
            value={reportDraft}
            onChangeText={setReportDraft}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 15,
            }}
          >
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.secondaryBtnText}>{t("userProfile.reportModal.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { borderColor: "#e74c3c", backgroundColor: "#e74c3c33" },
              ]}
              onPress={handleSendReport}
              disabled={!reportDraft.trim()}
            >
              <Text
                style={{ color: "#e74c3c", fontWeight: "bold", marginLeft: 8 }}
              >
                {t("userProfile.reportModal.send")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.absoluteModalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri: `https://static.f-list.net/images/avatar/${user.toLowerCase()}.png`,
            }}
            style={styles.profileAvatar}
          />
          <View style={styles.profileHeaderInfo}>
            <Text
              style={[
                styles.profileName,
                { color: getGenderColor(onlineCharacters[user]?.gender) },
              ]}
            >
              {user}
            </Text>
            <Text
              style={[
                styles.profileStatus,
                {
                  color: getStatusColor(
                    onlineCharacters[user]?.status || "offline",
                  ),
                },
              ]}
            >
              {onlineCharacters[user]?.status 
                ? t(`statusModal.statuses.${onlineCharacters[user].status}`, { defaultValue: onlineCharacters[user].status.toUpperCase() })
                : t("userProfile.offline")}
            </Text>
          </View>
        </View>
        {onlineCharacters[user]?.statusmsg ? (
          <ScrollView style={styles.statusMsgBox}>
            <BBCodeText text={onlineCharacters[user]?.statusmsg} />
          </ScrollView>
        ) : null}

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => {
              setActiveChat(user);
              onClose();
              closeMenus();
            }}
          >
            <Ionicons name="chatbubbles" size={24} color="#3498db" />
            <Text style={styles.gridBtnText}>{t("userProfile.actions.message")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => {
              Linking.openURL(
                `https://www.f-list.net/c/${encodeURIComponent(user)}`,
              ).catch(() => {});
            }}
          >
            <Ionicons name="globe" size={24} color="#2ecc71" />
            <Text style={styles.gridBtnText}>{t("userProfile.actions.webProfile")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={async () => {
              setShowMemoModal(true);
              setMemoDraft(t("userProfile.memoModal.loading"));
              const serverNote = await fetchMemo(user);
              setMemoDraft(serverNote);
            }}
          >
            <Ionicons name="document-text" size={24} color="#f1c40f" />
            <Text style={styles.gridBtnText}>{t("userProfile.actions.memo")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gridBtn, isAdsHidden && styles.gridBtnActive]}
            onPress={() => toggleHideAds(user)}
          >
            <Ionicons
              name={isAdsHidden ? "megaphone-outline" : "megaphone"}
              size={24}
              color={isAdsHidden ? "#e74c3c" : "#aaa"}
            />
            <Text
              style={[styles.gridBtnText, isAdsHidden && { color: "#e74c3c" }]}
            >
              {t("userProfile.actions.hideAds")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gridBtn, isIgnored && styles.gridBtnActive]}
            onPress={() => toggleIgnore(user)}
          >
            <Ionicons
              name={isIgnored ? "ban" : "ban-outline"}
              size={24}
              color={isIgnored ? "#e74c3c" : "#aaa"}
            />
            <Text
              style={[styles.gridBtnText, isIgnored && { color: "#e74c3c" }]}
            >
              {t("userProfile.actions.ignore")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => {
              setReportDraft("");
              setShowReportModal(true);
            }}
          >
            <Ionicons name="warning" size={24} color="#e67e22" />
            <Text style={styles.gridBtnText}>{t("userProfile.actions.report")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  absoluteModalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  profileCard: {
    width: "100%",
    backgroundColor: "#1e1e28",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2d3436",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
    backgroundColor: "#181822",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  profileHeaderInfo: { marginLeft: 15, flex: 1 },
  profileName: { color: "white", fontSize: 20, fontWeight: "bold" },
  profileStatus: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  statusMsgBox: { padding: 15, maxHeight: 150, backgroundColor: "#1a1a24" },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#181822",
    borderTopWidth: 1,
    borderTopColor: "#2d3436",
  },
  gridBtn: {
    width: "33.3%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  gridBtnActive: { backgroundColor: "#e74c3c22" },
  gridBtnText: {
    color: "#ddd",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 5,
  },
  textInputArea: {
    backgroundColor: "#111",
    color: "white",
    padding: 15,
    borderRadius: 8,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#333",
  },
  secondaryBtn: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  secondaryBtnText: { color: "#aaa", fontWeight: "bold", fontSize: 14 },
});
