import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";

export function LoginScreen() {
  const [accountLocal, setAccountLocal] = useState("");
  const [passwordLocal, setPasswordLocal] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const loadSession = useAuthStore((state) => state.loadSession);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const characters = useAuthStore((state) => state.characters);
  const ticket = useAuthStore((state) => state.ticket);

  const connectToChat = useChatStore((state) => state.connectToChat);
  const isConnectingToChat = useChatStore((state) => state.isConnectingToChat);
  const myCharacterName = useChatStore((state) => state.myCharacterName);

  useEffect(() => {
    const init = async () => {
      const savedAccount = await AsyncStorage.getItem("@chat_account");
      const savedPassword = await AsyncStorage.getItem("@chat_password");
      if (savedAccount) setAccountLocal(savedAccount);
      if (savedPassword) {
        setPasswordLocal(savedPassword);
        setRememberMe(true);
      }

      await loadSession();
      setIsInitializing(false);
    };
    init();
  }, [loadSession]);

  let charsList: string[] = [];
  if (Array.isArray(characters)) {
    charsList = characters;
  } else if (characters && typeof characters === "object") {
    charsList = Object.values(characters);
  }

  const sortedCharacters = [...charsList].sort((a, b) => a.localeCompare(b));
  const filteredCharacters = sortedCharacters.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color="#3498db"
          style={{ marginTop: 30 }}
        />
        <Text
          style={{
            color: "#888",
            textAlign: "center",
            marginTop: 15,
            fontWeight: "bold",
          }}
        >
          Verificando sesión...
        </Text>
      </View>
    );
  }

  if (ticket && charsList.length > 0) {
    return (
      <View style={styles.container}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Selecciona tu Personaje</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={{ marginLeft: 10 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar personaje..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredCharacters}
          keyExtractor={(item) => item}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ flex: 1, width: "100%" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.characterCard,
                isConnectingToChat && styles.characterCardDisabled,
              ]}
              onPress={() => connectToChat(item)}
              disabled={isConnectingToChat}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri: `https://static.f-list.net/images/avatar/${item.toLowerCase()}.png`,
                  }}
                  style={styles.characterAvatar}
                />
                {isConnectingToChat && myCharacterName === item && (
                  <View style={styles.connectingOverlay}>
                    <ActivityIndicator size="large" color="#3498db" />
                  </View>
                )}
              </View>
              <Text style={styles.characterName} numberOfLines={2}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#888", textAlign: "center", marginTop: 20 }}>
              No se encontraron personajes.
            </Text>
          }
        />

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={logout}
          disabled={isConnectingToChat}
        >
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Iniciar Sesión en F-Chat</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Nombre de Cuenta"
        placeholderTextColor="#888"
        value={accountLocal}
        onChangeText={setAccountLocal}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={passwordLocal}
        onChangeText={setPasswordLocal}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setRememberMe(!rememberMe)}
      >
        <Ionicons
          name={rememberMe ? "checkbox" : "square-outline"}
          size={24}
          color={rememberMe ? "#3498db" : "#888"}
        />
        <Text style={styles.checkboxLabel}>Recordar credenciales</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => login(accountLocal, passwordLocal, rememberMe)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0b0c10",
  },
  logo: { width: "100%", height: 80, marginBottom: 30 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1f2833",
    color: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  logoutButton: { backgroundColor: "#e74c3c", marginTop: 15, marginBottom: 20 },
  errorText: {
    color: "#ff4757",
    marginBottom: 15,
    textAlign: "center",
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxLabel: { color: "#ccc", marginLeft: 10, fontSize: 16 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2833",
    borderRadius: 8,
    marginBottom: 20,
  },
  searchInput: { flex: 1, color: "white", padding: 12, fontSize: 15 },
  characterCard: {
    width: "31%",
    alignItems: "center",
    backgroundColor: "#1a1a24",
    padding: 10,
    borderRadius: 12,
    marginBottom: 15,
    marginHorizontal: "1.1%",
    borderWidth: 1,
    borderColor: "#2d3436",
  },
  characterCardDisabled: { opacity: 0.5 },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  characterAvatar: { width: "100%", height: "100%", backgroundColor: "#111" },
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  characterName: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
});
