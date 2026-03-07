import React, { useState, useEffect } from "react";
import {
  Text,
  Linking,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Ionicons } from "@expo/vector-icons";
import { getGenderColor } from "@/constants/theme";

interface BBCodeTextProps {
  text: string;
  isAction?: boolean;
}

const parseBBCode = (
  text: string,
  isAction: boolean = false,
  globalFontSize: number,
) => {
  if (!text) return null;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  const regex =
    /\[(\/?)(b|i|u|s|sup|sub|color|url|user|icon|eicon|spoiler|session|noparse)(?:=([^\]]+))?\]/gi;
  let match;

  const stack: { tag: string; value?: string; start: number }[] = [];

  let currentStyle: any = { fontSize: globalFontSize, color: "#e0e0e0" };
  if (isAction) {
    currentStyle.fontStyle = "italic";
  }

  let isNoparse = false;

  const pushText = (str: string, style: any) => {
    if (str) {
      elements.push(
        <Text key={`text-${elements.length}`} style={{ ...style }}>
          {str}
        </Text>,
      );
    }
  };

  while ((match = regex.exec(text)) !== null) {
    const isClosing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const value = match[3];
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (isNoparse && tag !== "noparse") {
      continue;
    }

    if (tag === "noparse") {
      if (isClosing) {
        if (isNoparse) {
          pushText(text.substring(lastIndex, matchStart), currentStyle);
          isNoparse = false;
          lastIndex = matchEnd;
        }
      } else {
        if (!isNoparse) {
          pushText(text.substring(lastIndex, matchStart), currentStyle);
          isNoparse = true;
          lastIndex = matchEnd;
        }
      }
      continue;
    }

    pushText(text.substring(lastIndex, matchStart), currentStyle);

    if (tag === "icon" || tag === "eicon") {
      const iconEndTag = `[/${tag}]`;
      const iconEndIndex = text.toLowerCase().indexOf(iconEndTag, matchEnd);

      if (iconEndIndex !== -1) {
        const iconName = text.substring(matchEnd, iconEndIndex);

        if (tag === "icon") {
          elements.push(
            <TouchableOpacity
              key={`icon-${elements.length}`}
              onPress={() =>
                useChatStore.getState().setSelectedUserProfile(iconName)
              }
            >
              <Image
                source={{
                  uri: `https://static.f-list.net/images/avatar/${iconName.toLowerCase()}.png`,
                }}
                style={{
                  width: globalFontSize * 2.5,
                  height: globalFontSize * 2.5,
                  borderRadius: 4,
                  marginRight: 2,
                  marginBottom: -globalFontSize * 0.4,
                }}
                contentFit="cover"
              />
            </TouchableOpacity>,
          );
        } else {
          elements.push(
            <Image
              key={`eicon-${elements.length}`}
              source={{
                uri: `https://static.f-list.net/images/eicon/${iconName.toLowerCase()}.gif`,
              }}
              style={{
                width: globalFontSize * 2.5,
                height: globalFontSize * 2.5,
                marginRight: 2,
                marginBottom: -globalFontSize * 0.4,
              }}
              contentFit="contain"
            />,
          );
        }
        regex.lastIndex = iconEndIndex + iconEndTag.length;
        lastIndex = regex.lastIndex;
        continue;
      }
    }

    if (tag === "user") {
      if (!isClosing) {
        const userEndTag = "[/user]";
        const userEndIndex = text.toLowerCase().indexOf(userEndTag, matchEnd);

        if (userEndIndex !== -1) {
          const userName = text.substring(matchEnd, userEndIndex);

          const onlineChars = useChatStore.getState().onlineCharacters;
          const charData = onlineChars[userName];
          const userColor = charData
            ? getGenderColor(charData.gender)
            : "#7676bb";

          elements.push(
            <TouchableOpacity
              key={`user-${elements.length}`}
              onPress={() =>
                useChatStore.getState().setSelectedUserProfile(userName)
              }
            >
              <Text
                style={{
                  ...currentStyle,
                  fontWeight: "bold",
                  color: userColor,
                }}
              >
                {userName}
              </Text>
            </TouchableOpacity>,
          );
          regex.lastIndex = userEndIndex + userEndTag.length;
          lastIndex = regex.lastIndex;
          continue;
        }
      }
    }

    if (tag === "url") {
      if (!isClosing) {
        const urlEndTag = "[/url]";
        const urlEndIndex = text.toLowerCase().indexOf(urlEndTag, matchEnd);

        if (urlEndIndex !== -1) {
          const linkText = text.substring(matchEnd, urlEndIndex);
          const actualUrl = value ? value : linkText;

          let domain = "";
          try {
            const urlObj = new URL(
              actualUrl.startsWith("http") ? actualUrl : `https://${actualUrl}`,
            );
            domain = urlObj.hostname.replace("www.", "");
          } catch {
            domain = actualUrl;
          }

          elements.push(
            <Text key={`url-${elements.length}`}>
              <Text
                style={{
                  ...currentStyle,
                  color: "#3498db",
                  textDecorationLine: "underline",
                }}
                onPress={() =>
                  Linking.openURL(
                    actualUrl.startsWith("http")
                      ? actualUrl
                      : `https://${actualUrl}`,
                  ).catch(() => {})
                }
              >
                {linkText}
              </Text>
              <Text
                style={{
                  ...currentStyle,
                  fontSize: globalFontSize * 0.8,
                  color: "#888",
                }}
              >
                {" "}
                ({domain})
              </Text>
            </Text>,
          );

          regex.lastIndex = urlEndIndex + urlEndTag.length;
          lastIndex = regex.lastIndex;
          continue;
        }
      }
    }

    if (tag === "session") {
      if (!isClosing) {
        const sessionEndTag = "[/session]";
        const sessionEndIndex = text
          .toLowerCase()
          .indexOf(sessionEndTag, matchEnd);
        if (sessionEndIndex !== -1) {
          const sessionName = value || "Sala Privada";
          let channelId = text.substring(matchEnd, sessionEndIndex);

          if (channelId.toLowerCase().startsWith("adh-")) {
            channelId = "ADH-" + channelId.substring(4).toLowerCase();
          }

          elements.push(
            <SessionLink
              key={`session-${elements.length}`}
              title={sessionName}
              channelId={channelId}
              globalFontSize={globalFontSize}
            />,
          );

          regex.lastIndex = sessionEndIndex + sessionEndTag.length;
          lastIndex = regex.lastIndex;
          continue;
        }
      }
    }

    if (tag === "spoiler") {
      if (!isClosing) {
        const spoilerEndTag = "[/spoiler]";
        const spoilerEndIndex = text
          .toLowerCase()
          .indexOf(spoilerEndTag, matchEnd);

        if (spoilerEndIndex !== -1) {
          const spoilerContent = text.substring(matchEnd, spoilerEndIndex);
          elements.push(
            <SpoilerText
              key={`spoiler-${elements.length}`}
              content={spoilerContent}
              globalFontSize={globalFontSize}
            />,
          );

          regex.lastIndex = spoilerEndIndex + spoilerEndTag.length;
          lastIndex = regex.lastIndex;
          continue;
        }
      }
    }

    if (isClosing) {
      if (stack.length > 0 && stack[stack.length - 1].tag === tag) {
        stack.pop();

        currentStyle = { fontSize: globalFontSize, color: "#e0e0e0" };
        if (isAction) currentStyle.fontStyle = "italic";

        stack.forEach((item) => {
          switch (item.tag) {
            case "b":
              currentStyle.fontWeight = "bold";
              break;
            case "i":
              currentStyle.fontStyle = "italic";
              break;
            case "u":
              currentStyle.textDecorationLine = currentStyle.textDecorationLine
                ? currentStyle.textDecorationLine + " underline"
                : "underline";
              break;
            case "s":
              currentStyle.textDecorationLine = currentStyle.textDecorationLine
                ? currentStyle.textDecorationLine + " line-through"
                : "line-through";
              break;
            case "color":
              if (item.value) currentStyle.color = item.value;
              break;
            case "sup":
              currentStyle.fontSize = globalFontSize * 0.75;
              currentStyle.textAlignVertical = "top";
              break;
            case "sub":
              currentStyle.fontSize = globalFontSize * 0.75;
              currentStyle.textAlignVertical = "bottom";
              break;
          }
        });
      }
    } else {
      stack.push({ tag, value, start: matchEnd });
      switch (tag) {
        case "b":
          currentStyle = { ...currentStyle, fontWeight: "bold" };
          break;
        case "i":
          currentStyle = { ...currentStyle, fontStyle: "italic" };
          break;
        case "u":
          currentStyle = {
            ...currentStyle,
            textDecorationLine: currentStyle.textDecorationLine
              ? currentStyle.textDecorationLine + " underline"
              : "underline",
          };
          break;
        case "s":
          currentStyle = {
            ...currentStyle,
            textDecorationLine: currentStyle.textDecorationLine
              ? currentStyle.textDecorationLine + " line-through"
              : "line-through",
          };
          break;
        case "color":
          if (value) currentStyle = { ...currentStyle, color: value };
          break;
        case "sup":
          currentStyle = {
            ...currentStyle,
            fontSize: globalFontSize * 0.75,
            textAlignVertical: "top",
          };
          break;
        case "sub":
          currentStyle = {
            ...currentStyle,
            fontSize: globalFontSize * 0.75,
            textAlignVertical: "bottom",
          };
          break;
      }
    }
    lastIndex = matchEnd;
  }

  pushText(text.substring(lastIndex), currentStyle);
  return elements;
};

const SpoilerText = ({
  content,
  globalFontSize,
}: {
  content: string;
  globalFontSize: number;
}) => {
  const [isHidden, setIsHidden] = useState(true);
  return (
    <TouchableOpacity
      onPress={() => setIsHidden(!isHidden)}
      style={[
        styles.spoilerContainer,
        isHidden ? styles.spoilerHidden : styles.spoilerVisible,
      ]}
    >
      <Text
        style={[
          styles.spoilerText,
          { fontSize: globalFontSize },
          isHidden ? { color: "transparent" } : { color: "#e0e0e0" },
        ]}
      >
        {isHidden ? "Toca para ver el spoiler" : content}
      </Text>
    </TouchableOpacity>
  );
};

const SessionLink = ({
  title,
  channelId,
  globalFontSize,
}: {
  title: string;
  channelId: string;
  globalFontSize: number;
}) => {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const joinedChannels = useChatStore((state) => state.joinedChannels);
  const joinChannel = useChatStore((state) => state.joinChannel);

  useEffect(() => {
    const room = joinedChannels[channelId];
    if (room && room.users) {
      setUserCount(room.users.length);
    } else {
      setUserCount(null);
    }
  }, [joinedChannels, channelId]);

  const handlePress = () => {
    setIsLoading(true);
    joinChannel(channelId);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <TouchableOpacity
      style={styles.sessionLinkContainer}
      onPress={handlePress}
      disabled={isLoading}
    >
      <Ionicons
        name="chatbubbles"
        size={globalFontSize}
        color="#3498db"
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.sessionLinkText, { fontSize: globalFontSize }]}>
        {title}
      </Text>
      {userCount !== null ? (
        <Text
          style={[styles.sessionCountText, { fontSize: globalFontSize * 0.85 }]}
        >
          {" "}
          ({userCount})
        </Text>
      ) : isLoading ? (
        <ActivityIndicator
          size="small"
          color="#3498db"
          style={{ marginLeft: 5 }}
        />
      ) : null}
    </TouchableOpacity>
  );
};

export const BBCodeText: React.FC<BBCodeTextProps> = ({ text, isAction }) => {
  const globalFontSize =
    useSettingsStore((state) => state.globalSettings.fontSize) || 14;

  return (
    <Text style={{ lineHeight: globalFontSize * 1.5 }}>
      {parseBBCode(text, isAction, globalFontSize)}
    </Text>
  );
};

const styles = StyleSheet.create({
  spoilerContainer: {
    backgroundColor: "#222",
    borderRadius: 4,
    padding: 4,
    marginVertical: 2,
  },
  spoilerHidden: { backgroundColor: "#444" },
  spoilerVisible: { backgroundColor: "#2d3436" },
  spoilerText: { fontStyle: "italic", textAlign: "center" },
  sessionLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 152, 219, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(52, 152, 219, 0.4)",
    marginHorizontal: 2,
  },
  sessionLinkText: {
    color: "#3498db",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  sessionCountText: { color: "#aaa" },
});
