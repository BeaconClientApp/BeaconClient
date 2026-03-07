import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RoomSettings {
    notifyAll: boolean;
    notifyName: boolean;
    highlightWords: string;
}

export interface GlobalSettings {
    sendOnEnter: boolean;
    showAvatarsInPM: boolean;
    idleTimer: number;
    logMessages: boolean;
    logAds: boolean;
    fontSize: number;
    playSounds: boolean;
    vibrate: boolean;
    notifyOnName: boolean;
    globalHighlightWords: string;
    keepSocketAlive: boolean;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
    sendOnEnter: false,
    showAvatarsInPM: true,
    idleTimer: 15,
    logMessages: true,
    logAds: false,
    fontSize: 14,
    playSounds: true,
    vibrate: true,
    notifyOnName: true,
    globalHighlightWords: '',
    keepSocketAlive: false
};

interface SettingsState {
    globalSettings: GlobalSettings;
    roomSettings: Record<string, RoomSettings>;
    updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
    setRoomSettings: (channel: string, settings: RoomSettings, myCharName: string) => void;
    loadSettings: (myCharName?: string | null) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    roomSettings: {},

    updateGlobalSettings: (settings) => set(state => {
        const newSettings = { ...state.globalSettings, ...settings };
        AsyncStorage.setItem('@chat_global_settings', JSON.stringify(newSettings)).catch(() => { });
        return { globalSettings: newSettings };
    }),

    setRoomSettings: (channel, settings, myCharName) => set(state => {
        const newSettings = { ...state.roomSettings, [channel]: settings };
        if (myCharName) AsyncStorage.setItem(`@chat_room_settings_${myCharName}`, JSON.stringify(newSettings)).catch(() => { });
        return { roomSettings: newSettings };
    }),

    loadSettings: async (myCharName) => {
        try {
            const savedGlobal = await AsyncStorage.getItem('@chat_global_settings');
            if (savedGlobal) set({ globalSettings: { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(savedGlobal) } });

            if (myCharName) {
                const savedRooms = await AsyncStorage.getItem(`@chat_room_settings_${myCharName}`);
                if (savedRooms) set({ roomSettings: JSON.parse(savedRooms) });
            }
        } catch (e) { console.error(e); }
    }
}));