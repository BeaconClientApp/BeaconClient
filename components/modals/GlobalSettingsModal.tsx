import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import notifee from "@notifee/react-native";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTranslation } from "react-i18next";

interface Props {
  onClose: () => void;
}

export function GlobalSettingsModal({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const changeLanguage = (lang: "en" | "es") => {
    i18n.changeLanguage(lang);
  };
  const globalSettings = useSettingsStore((state) => state.globalSettings);
  const updateGlobalSettings = useSettingsStore(
    (state) => state.updateGlobalSettings,
  );
  const [draftSettings, setDraftSettings] = useState(globalSettings);

  useEffect(() => {
    setDraftSettings(globalSettings);
  }, [globalSettings]);

  const handleSaveSettings = () => {
    updateGlobalSettings(draftSettings);
    onClose();
  };

  const handleBatteryCheck = async () => {
    try {
      const isOptimized = await notifee.isBatteryOptimizationEnabled();
      if (isOptimized) {
        alert(t("settings.alerts.batteryOptEnabled"));
        await notifee.openBatteryOptimizationSettings();
      } else {
        alert(t("settings.alerts.batteryOptDisabled"));
      }
    } catch (e) {
      console.log(e);
      alert(t("settings.alerts.batteryOptError"));
    }
  };

  return (
    <TouchableOpacity
      style={styles.absoluteModalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} style={styles.settingsModalContent}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>{t("settings.title")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#aaa" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsScroll}>
          <Text style={styles.settingsCategory}>
            {t("settings.categories.interface")}
          </Text>
          <Text style={styles.settingsLabel}>{t("settings.language")}:</Text>
          <View style={styles.languageSelectorContainer}>
            {[
              { code: "en", label: "English" },
              { code: "es", label: "Español" },
            ].map((lang) => {
              const isActive = i18n.language?.startsWith(lang.code);
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageBtn,
                    isActive && styles.languageBtnActive,
                  ]}
                  onPress={() => changeLanguage(lang.code as "en" | "es")}
                >
                  <Text
                    style={[
                      styles.languageBtnText,
                      isActive && styles.languageBtnTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                sendOnEnter: !draftSettings.sendOnEnter,
              })
            }
          >
            <Ionicons
              name={draftSettings.sendOnEnter ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.sendOnEnter ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.sendOnEnter")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                showAvatarsInPM: !draftSettings.showAvatarsInPM,
              })
            }
          >
            <Ionicons
              name={
                draftSettings.showAvatarsInPM ? "checkbox" : "square-outline"
              }
              size={24}
              color={draftSettings.showAvatarsInPM ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.showAvatars")}
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>
            {t("settings.labels.fontSize")}
          </Text>
          <TextInput
            style={styles.settingsInput}
            keyboardType="numeric"
            value={String(draftSettings.fontSize)}
            onChangeText={(t) =>
              setDraftSettings({
                ...draftSettings,
                fontSize: parseInt(t) || 14,
              })
            }
          />

          <View style={styles.divider} />
          <Text style={styles.settingsCategory}>
            {t("settings.categories.notifications")}
          </Text>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                playSounds: !draftSettings.playSounds,
              })
            }
          >
            <Ionicons
              name={draftSettings.playSounds ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.playSounds ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.playSounds")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                vibrate: !draftSettings.vibrate,
              })
            }
          >
            <Ionicons
              name={draftSettings.vibrate ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.vibrate ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.vibrate")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                notifyOnName: !draftSettings.notifyOnName,
              })
            }
          >
            <Ionicons
              name={draftSettings.notifyOnName ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.notifyOnName ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.notifyOnName")}
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>
            {t("settings.labels.highlightWords")}
          </Text>
          <TextInput
            style={styles.settingsInput}
            value={draftSettings.globalHighlightWords}
            onChangeText={(t) =>
              setDraftSettings({ ...draftSettings, globalHighlightWords: t })
            }
            placeholder={t("settings.labels.highlightPlaceholder")}
            placeholderTextColor="#555"
          />

          <View style={styles.divider} />
          <Text style={styles.settingsCategory}>
            {t("settings.categories.history")}
          </Text>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                logMessages: !draftSettings.logMessages,
              })
            }
          >
            <Ionicons
              name={draftSettings.logMessages ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.logMessages ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.logMessages")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                logAds: !draftSettings.logAds,
              })
            }
          >
            <Ionicons
              name={draftSettings.logAds ? "checkbox" : "square-outline"}
              size={24}
              color={draftSettings.logAds ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.logAds")}
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>
            {t("settings.labels.idleTimer")}
          </Text>
          <TextInput
            style={styles.settingsInput}
            keyboardType="numeric"
            value={String(draftSettings.idleTimer)}
            onChangeText={(t) =>
              setDraftSettings({
                ...draftSettings,
                idleTimer: parseInt(t) || 0,
              })
            }
          />

          <View style={styles.divider} />
          <Text style={styles.settingsCategory}>
            {t("settings.categories.system")}
          </Text>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              setDraftSettings({
                ...draftSettings,
                keepSocketAlive: !draftSettings.keepSocketAlive,
              })
            }
          >
            <Ionicons
              name={
                draftSettings.keepSocketAlive ? "checkbox" : "square-outline"
              }
              size={24}
              color={draftSettings.keepSocketAlive ? "#3498db" : "#888"}
            />
            <Text style={styles.checkboxLabel}>
              {t("settings.labels.keepAlive")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderColor: "#e74c3c", marginTop: 5 },
            ]}
            onPress={handleBatteryCheck}
          >
            <Ionicons name="battery-dead" size={20} color="#e74c3c" />
            <Text
              style={[
                styles.secondaryBtnText,
                { marginLeft: 8, color: "#e74c3c", flexShrink: 1 },
              ]}
            >
              {t("settings.labels.disableBatteryOpt")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveSettingsBtn}
            onPress={handleSaveSettings}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {t("settings.saveBtn")}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
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
  settingsModalContent: {
    backgroundColor: "#1e1e28",
    width: "100%",
    maxHeight: "85%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2d3436",
    overflow: "hidden",
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#181822",
  },
  settingsTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  settingsScroll: { padding: 20 },
  settingsCategory: {
    color: "#3498db",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 15,
    textTransform: "uppercase",
  },
  settingsLabel: { color: "#aaa", marginBottom: 5, fontSize: 14 },
  settingsInput: {
    backgroundColor: "#111",
    color: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
  },
  saveSettingsBtn: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  checkboxLabel: { color: "#ccc", marginLeft: 10, fontSize: 14, flexShrink: 1 },
  divider: { height: 1, backgroundColor: "#2d3436", marginVertical: 15 },
  secondaryBtn: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: "bold", fontSize: 14 },
  languageSelectorContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
    marginTop: 5,
  },
  languageBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
    alignItems: "center",
  },
  languageBtnActive: {
    borderColor: "#3498db",
    backgroundColor: "rgba(52, 152, 219, 0.15)",
  },
  languageBtnText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  languageBtnTextActive: {
    color: "#3498db",
    fontWeight: "bold",
  },
});
