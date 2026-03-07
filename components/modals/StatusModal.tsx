import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/useChatStore";
import {
  getStatusIcon,
  getStatusColor,
  STATUS_OPTIONS,
  BBCODE_COLORS,
} from "@/constants/theme";

interface Props {
  onClose: () => void;
}

export function StatusModal({ onClose }: Props) {
  const changeMyStatus = useChatStore((state) => state.changeMyStatus);
  const myCharacterName = useChatStore((state) => state.myCharacterName);
  const onlineCharacters = useChatStore((state) => state.onlineCharacters);

  const myStatusData = myCharacterName
    ? onlineCharacters[myCharacterName]
    : null;
  const [draftStatus, setDraftStatus] = useState(
    myStatusData?.status || "online",
  );
  const [draftStatusMsg, setDraftStatusMsg] = useState(
    myStatusData?.statusmsg || "",
  );
  const [showColors, setShowColors] = useState(false);
  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });

  const handleSaveStatus = () => {
    changeMyStatus(draftStatus, draftStatusMsg);
    onClose();
  };

  const insertBBCode = (tag: string, value?: string) => {
    const before = draftStatusMsg.substring(0, inputSelection.start);
    const selected = draftStatusMsg.substring(
      inputSelection.start,
      inputSelection.end,
    );
    const after = draftStatusMsg.substring(inputSelection.end);
    if (tag === "url") {
      const isUrl =
        selected.startsWith("http://") || selected.startsWith("https://");
      if (isUrl) {
        setDraftStatusMsg(before + `[url=${selected}][/url]` + after);
      } else if (selected.length > 0) {
        setDraftStatusMsg(before + `[url=]${selected}[/url]` + after);
      } else {
        setDraftStatusMsg(before + `[url=][/url]` + after);
      }
      return;
    }
    const openTag = value ? `[${tag}=${value}]` : `[${tag}]`;
    const closeTag = `[/${tag}]`;
    setDraftStatusMsg(before + openTag + selected + closeTag + after);
  };

  return (
    <TouchableOpacity
      style={styles.absoluteModalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} style={styles.statusModalContent}>
        <Text style={styles.statusModalTitle}>Actualizar Estado</Text>

        <View style={styles.statusOptionsContainer}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusOptionBtn,
                draftStatus === s && {
                  borderColor: getStatusColor(s),
                  backgroundColor: "#1c1e26",
                },
              ]}
              onPress={() => setDraftStatus(s)}
            >
              <Ionicons
                name={getStatusIcon(s) as any}
                size={16}
                color={getStatusColor(s)}
              />
              <Text
                style={[
                  styles.statusOptionText,
                  draftStatus === s && { color: getStatusColor(s) },
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bbcodeToolbar}>
          <TouchableOpacity
            onPress={() => insertBBCode("b")}
            style={styles.toolbarBtn}
          >
            <Text style={[styles.toolbarText, { fontWeight: "bold" }]}>B</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => insertBBCode("i")}
            style={styles.toolbarBtn}
          >
            <Text style={[styles.toolbarText, { fontStyle: "italic" }]}>I</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => insertBBCode("u")}
            style={styles.toolbarBtn}
          >
            <Text
              style={[styles.toolbarText, { textDecorationLine: "underline" }]}
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
            onPress={() => insertBBCode("user")}
            style={styles.toolbarBtn}
          >
            <Ionicons name="person" size={14} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => insertBBCode("icon")}
            style={styles.toolbarBtn}
          >
            <Ionicons name="image" size={14} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => insertBBCode("eicon")}
            style={styles.toolbarBtn}
          >
            <Ionicons name="happy" size={14} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => insertBBCode("url")}
            style={styles.toolbarBtn}
          >
            <Ionicons name="link" size={14} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowColors(!showColors)}
            style={styles.toolbarBtn}
          >
            <Ionicons
              name="color-palette"
              size={14}
              color={showColors ? "#3498db" : "#aaa"}
            />
          </TouchableOpacity>
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

        <TextInput
          style={styles.statusMsgInput}
          placeholder="Mensaje de estado (opcional)..."
          placeholderTextColor="#666"
          value={draftStatusMsg}
          onChangeText={setDraftStatusMsg}
          maxLength={255}
          multiline
          onSelectionChange={(e) => setInputSelection(e.nativeEvent.selection)}
        />
        <Text style={styles.charCount}>{draftStatusMsg.length}/255</Text>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStatus}>
            <Text style={styles.saveBtnText}>Actualizar</Text>
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
  statusModalContent: {
    backgroundColor: "#1e1e28",
    width: "100%",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2d3436",
  },
  statusModalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  statusOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusOptionBtn: {
    width: "31%",
    backgroundColor: "#13151a",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  statusOptionText: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "bold",
  },
  bbcodeToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 5,
  },
  toolbarBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 4,
    backgroundColor: "#13151a",
    borderWidth: 1,
    borderColor: "#333",
  },
  toolbarText: { color: "#aaa", fontSize: 12 },
  colorPalette: { flexDirection: "row", paddingBottom: 10 },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  statusMsgInput: {
    backgroundColor: "#111",
    color: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 60,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#666",
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
    marginBottom: 15,
  },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  cancelBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#333",
    marginRight: 5,
  },
  cancelBtnText: { color: "white", fontWeight: "bold" },
  saveBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#3498db",
    marginLeft: 5,
  },
  saveBtnText: { color: "white", fontWeight: "bold" },
});
