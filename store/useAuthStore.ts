import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from './useChatStore';
import i18n from '@/i18n';

interface AuthState {
    account: string | null;
    passwordInSession: string | null;
    ticket: string | null;
    characters: string[];
    isLoading: boolean;
    error: string | null;
    setError: (err: string | null) => void;
    loadSession: () => Promise<void>;
    login: (account: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    account: null, passwordInSession: null, ticket: null, characters: [], isLoading: false, error: null,

    setError: (err) => set({ error: err }),

    loadSession: async () => {
        try {
            const [savedAccount, savedPassword, savedTicket, savedCharacters] = await Promise.all([
                AsyncStorage.getItem('@chat_account'), AsyncStorage.getItem('@chat_password'),
                AsyncStorage.getItem('@chat_ticket'), AsyncStorage.getItem('@chat_characters')
            ]);
            if (savedTicket && savedCharacters) {
                set({ ticket: savedTicket, characters: JSON.parse(savedCharacters), account: savedAccount, passwordInSession: savedPassword });
            }
        } catch (e) { console.error("Error cargando sesión:", e); }
    },

    login: async (account, password, rememberMe) => {
        set({ isLoading: true, error: null });
        try {
            const formData = new URLSearchParams();
            formData.append('account', account); formData.append('password', password);
            formData.append('no_friends', 'true'); formData.append('no_bookmarks', 'true');

            const response = await fetch('https://www.f-list.net/json/getApiTicket.php', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData.toString()
            });
            const data = await response.json();

            if (data.error) { set({ error: data.error, isLoading: false }); return; }
            await AsyncStorage.setItem('@chat_account', account);

            if (rememberMe) {
                await AsyncStorage.setItem('@chat_ticket', data.ticket);
                await AsyncStorage.setItem('@chat_characters', JSON.stringify(data.characters));
                await AsyncStorage.setItem('@chat_password', password);
            } else {
                await AsyncStorage.removeItem('@chat_ticket'); await AsyncStorage.removeItem('@chat_characters'); await AsyncStorage.removeItem('@chat_password');
            }
            set({ ticket: data.ticket, characters: data.characters || [], account: account, passwordInSession: password, isLoading: false });
        } catch (err) {
            console.log(err);
            set({ error: i18n.t("login.networkError"), isLoading: false });
        }
    },

    logout: async () => {
        useChatStore.getState().disconnectChat();
        await AsyncStorage.removeItem('@chat_ticket'); await AsyncStorage.removeItem('@chat_characters'); await AsyncStorage.removeItem('@chat_password');
        set({ ticket: null, characters: [], error: null, account: null, passwordInSession: null });
    }
}));