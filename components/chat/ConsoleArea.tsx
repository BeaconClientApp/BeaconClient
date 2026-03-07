import React, { useRef } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useChatStore } from "@/store/useChatStore";
import { BBCodeText } from "@/components/BBCodeText";

const formatTime = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export function ConsoleArea() {
  const consoleLogs = useChatStore((state) => state.consoleLogs);
  const processCommand = useChatStore((state) => state.processCommand);
  const setSystemNotice = useChatStore((state) => state.setSystemNotice);
  const systemNotice = useChatStore((state) => state.systemNotice);

  const [inputText, setInputText] = React.useState("");
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    const textTrimmed = inputText.trim();
    if (!textTrimmed) return;

    if (!textTrimmed.startsWith("/")) {
      setSystemNotice(
        "No puedes enviar mensajes normales aquí. Usa un comando (ej. /join).",
      );
    } else {
      const isCmd = processCommand("console", inputText, false);
      if (!isCmd) {
        setSystemNotice("Comando no reconocido o inválido.");
      }
    }

    setInputText("");
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={consoleLogs}
        keyExtractor={(item) => item.id}
        inverted
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <Text style={styles.logTime}>[{formatTime(item.timestamp)}]</Text>
            <View style={styles.logMessage}>
              <BBCodeText text={item.message} />
            </View>
          </View>
        )}
      />

      {systemNotice && (
        <View style={styles.systemNoticeBanner}>
          <Text style={styles.systemNoticeText}>⚠️ {systemNotice}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.chatInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un comando (ej. /status, /join)..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSend}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() ? { opacity: 0.5 } : {},
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>EJECUTAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0c10" },
  list: { padding: 10 },
  logItem: { flexDirection: "row", marginBottom: 8, alignItems: "flex-start" },
  logTime: { color: "#888", fontSize: 12, marginRight: 8, marginTop: 2 },
  logMessage: { flex: 1 },

  inputContainer: {
    backgroundColor: "#121212",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  inputArea: { flexDirection: "row", alignItems: "center", padding: 10 },
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
    backgroundColor: "#f1c40f",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    justifyContent: "center",
  },
  sendButtonText: { color: "#0b0c10", fontWeight: "bold" },

  systemNoticeBanner: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  systemNoticeText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
