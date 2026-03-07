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

interface Props {
  onClose: () => void;
}

export function GlobalSettingsModal({ onClose }: Props) {
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
        alert(
          "Tu teléfono tiene activada la 'Optimización de Batería' para esta app. Se abrirán los Ajustes: busca F-Chat y selecciona 'No Restringido' (Unrestricted) para evitar que se desconecte en segundo plano.",
        );
        await notifee.openBatteryOptimizationSettings();
      } else {
        alert(
          "¡Perfecto! El sistema ya no tiene permitido desconectar tu app en segundo plano.",
        );
      }
    } catch (e) {
      console.log(e);
      alert("No se pudieron abrir los ajustes de batería automáticamente.");
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
          <Text style={styles.settingsTitle}>Ajustes Globales</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#aaa" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsScroll}>
          <Text style={styles.settingsCategory}>Interfaz y Chat</Text>
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
              Enviar mensajes con la tecla Enter
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
              Mostrar Avatares en la lista izquierda
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>Tamaño de Letra (Píxeles):</Text>
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
          <Text style={styles.settingsCategory}>Notificaciones y Alertas</Text>
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
            <Text style={styles.checkboxLabel}>Reproducir sonidos</Text>
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
            <Text style={styles.checkboxLabel}>Vibrar al recibir mensajes</Text>
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
              Notificar si mencionan mi nombre (Todas las salas)
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>
            Palabras a resaltar (separadas por coma):
          </Text>
          <TextInput
            style={styles.settingsInput}
            value={draftSettings.globalHighlightWords}
            onChangeText={(t) =>
              setDraftSettings({ ...draftSettings, globalHighlightWords: t })
            }
            placeholder="ej: rol, trama, aventura"
            placeholderTextColor="#555"
          />

          <View style={styles.divider} />
          <Text style={styles.settingsCategory}>Historial e Inactividad</Text>
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
            <Text style={styles.checkboxLabel}>Guardar Historial (Logs)</Text>
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
              Guardar Ads en el Historial
            </Text>
          </TouchableOpacity>
          <Text style={styles.settingsLabel}>
            Auto-Idle Timer (Minutos | 0 para desactivar):
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
          <Text style={styles.settingsCategory}>Sistema y Batería</Text>
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
              Mantener conexión en Segundo Plano
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
              Desactivar Optimización de Batería
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
              GUARDAR CAMBIOS
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
});
