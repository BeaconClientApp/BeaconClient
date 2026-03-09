import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useSettingsStore } from './useSettingsStore';
import { useAuthStore } from './useAuthStore';
import { processChatCommand } from '@/utils/chatCommands';
import i18n from '@/i18n';

export interface ChatMessage {
    from: string;
    message: string;
    timestamp?:
    number;
    type?: 'chat' | 'ad';
}
export interface ChannelInfo {
    name: string;
    characters:
    number; mode?: string;
    title?: string;
}
export interface CharacterStatus {
    status: string;
    statusmsg: string;
    gender: string;
}
export interface JoinedChannelData {
    id: string;
    title: string;
    description: string;
    mode: string;
    users: string[];
    messages: ChatMessage[];
    lastAdSent?: number;
    owner?: string;
    oplist?: string[];
}
export interface ConsoleLog {
    id: string;
    timestamp: number;
    message: string;
}

const MAX_UI_MESSAGES = 100;
const INITIAL_LOAD_MESSAGES = 10;
const MAX_LOG_MESSAGES = 5000;

let lastGlobalMessageTime = 0;
let messageTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingMessages: (() => void)[] = [];

const queueMessage = (sendAction: () => void) => {
    const now = Date.now();
    const timeSinceLast = now - lastGlobalMessageTime;
    if (timeSinceLast >= 1100 && pendingMessages.length === 0) {
        lastGlobalMessageTime = Date.now(); sendAction();
    }
    else {
        pendingMessages.push(sendAction);
        if (!messageTimeout) scheduleNextMessage();
    }
};

const scheduleNextMessage = () => {
    if (pendingMessages.length === 0) {
        messageTimeout = null; return;
    }
    const now = Date.now();
    const timeSinceLast = now - lastGlobalMessageTime;
    const delay = Math.max(0, 1100 - timeSinceLast);
    messageTimeout = setTimeout(() => {
        const sendAction = pendingMessages.shift();
        if (sendAction) {
            lastGlobalMessageTime = Date.now();
            sendAction();
        }
        scheduleNextMessage();
    }, delay);
};

export const safeWsSend = (ws: WebSocket | null, payload: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const cmd = payload.substring(0, 3);
    const throttledCommands = ['MSG', 'PRI', 'LRP', 'RLL', 'STA', 'SFC'];
    if (throttledCommands.includes(cmd)) {
        queueMessage(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        });
    }
    else {
        ws.send(payload);
    }
};

let idleTimeout: ReturnType<typeof setTimeout> | null = null;
let preIdleStatus: string | null = null; let preIdleStatusMsg: string = '';

const playAppSound = async (type: 'login' | 'logout' | 'message') => {
    const store = useChatStore.getState();
    const gs = useSettingsStore.getState().globalSettings;
    const myStatus = store.myCharacterName ? store.onlineCharacters[store.myCharacterName]?.status : null;
    if (!gs.playSounds || myStatus === 'dnd') return;
    try {
        let soundModule;
        switch (type) {
            case 'login':
                soundModule = require('@/assets/sounds/login.wav');
                break;
            case 'logout':
                soundModule = require('@/assets/sounds/logout.wav');
                break;
            case 'message':
                soundModule = require('@/assets/sounds/message.wav');
                break;
            default:
                return;
        }
        const { sound } = await Audio.Sound.createAsync(soundModule);
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
        });
        await sound.playAsync();
    } catch (error) {
        console.log("Error de audio:", error);
    }
};

export const LogManager = {
    save: async (myChar: string, targetId: string, message: ChatMessage) => {
        const gs = useSettingsStore.getState().globalSettings;
        if (!gs.logMessages) return;
        if (message.type === 'ad' && !gs.logAds) return;
        try {
            const key = `@log_${myChar}_${targetId}`;
            const existing = await AsyncStorage.getItem(key);
            const logs: ChatMessage[] = existing ? JSON.parse(existing) : [];
            logs.push(message);
            await AsyncStorage.setItem(key, JSON.stringify(logs.slice(-MAX_LOG_MESSAGES))).catch(() => { });
        } catch { }
    },
    loadInitial: async (myChar: string, targetId: string): Promise<ChatMessage[]> => {
        try {
            const key = `@log_${myChar}_${targetId}`;
            const existing = await AsyncStorage.getItem(key);
            if (existing) {
                const logs: ChatMessage[] = JSON.parse(existing);
                return logs.slice(-INITIAL_LOAD_MESSAGES);
            }
        } catch { }
        return [];
    },
    loadFull: async (myChar: string, targetId: string): Promise<ChatMessage[]> => {
        try {
            const key = `@log_${myChar}_${targetId}`;
            const existing = await AsyncStorage.getItem(key);
            if (existing) return JSON.parse(existing);
        } catch { }
        return [];
    },
    getAvailableTargets: async (myChar: string): Promise<string[]> => {
        try {
            const prefix = `@log_${myChar}_`;
            const keys = await AsyncStorage.getAllKeys();
            return keys.filter(k => k.startsWith(prefix)).map(k => k.substring(prefix.length));
        } catch {
            return [];
        }
    }
};

interface ChatState {
    isConnectingToChat: boolean;
    ws: WebSocket | null;
    isWsConnected: boolean;
    friends: string[];
    apiFriends: string[];
    onlineCharacters: Record<string, CharacterStatus>;
    globalOps: string[];
    activeChat: string | null;
    activeTab: 'console' | 'channels';
    pendingJoin: string | null;
    knownRoomTitles: Record<string, string>;
    isLogsModalOpen: boolean;
    logsPreselectedTarget: string | null;
    roomUnreadActivity: Record<string, boolean>;
    updateActivity: () => void;
    isStatusModalOpen: boolean;
    setStatusModalOpen: (open: boolean) => void;
    isGlobalSettingsModalOpen: boolean;
    setGlobalSettingsModalOpen: (open: boolean) => void;
    openLogs: (targetId?: string) => void;
    setLogsModalOpen: (open: boolean) => void;
    setActiveTab: (tab: 'console' | 'channels') => void;
    selectedUserProfile: string | null;
    setSelectedUserProfile: (user: string | null) => void;
    privateMessages: Record<string, ChatMessage[]>;
    consoleLogs: ConsoleLog[];
    systemNotice: string | null;
    setSystemNotice: (msg: string | null) => void;
    changeMyStatus: (status: string, statusmsg: string) => void;
    loadCharacterData: (charName: string) => Promise<void>;
    connectToChat: (characterName: string) => Promise<void>;
    disconnectChat: () => void;
    setActiveChat: (characterOrChannelId: string | null) => void;
    sendPrivateMessage: (recipient: string, message: string) => void;
    addConsoleLog: (log: string) => void;
    myCharacterName: string | null;
    openChats: string[]; pinnedChats: string[];
    closeChat: (character: string) => void;
    togglePinChat: (character: string) => void;
    typingStatuses: Record<string, string>;
    sendTyping: (character: string, status: 'typing' | 'paused' | 'clear') => void;
    unreadCounts: Record<string, number>;
    publicChannels: ChannelInfo[]; requestChannels: () => void;
    openRooms: ChannelInfo[]; requestOpenRooms: () => void;
    joinedChannels: Record<string, JoinedChannelData>;
    channelAdCooldowns: Record<string, number>; pinnedRooms: string[];
    joinChannel: (channel: string) => void;
    leaveChannel: (channel: string) => void;
    sendChannelMessage: (channel: string, message: string, type: 'chat' | 'ad') => void;
    togglePinRoom: (channel: string) => void;
    sendStaffAlert: (channel: string, report: string) => void;
    processCommand: (channelId: string, text: string, isRoom: boolean) => boolean;
    ignoredUsers: string[];
    hiddenAdsUsers: string[];
    toggleIgnore: (character: string) => void;
    toggleHideAds: (character: string) => void;
    fetchMemo: (character: string) => Promise<string>;
    saveMemo: (character: string, memo: string) => Promise<void>;
    reportUser: (character: string, reason: string) => void;
}

let noticeTimeout: ReturnType<typeof setTimeout> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
    isConnectingToChat: false, ws: null, isWsConnected: false, friends: [], apiFriends: [], onlineCharacters: {}, globalOps: [], selectedUserProfile: null, activeChat: null, activeTab: 'console', privateMessages: {}, consoleLogs: [], myCharacterName: null, openChats: [], pinnedChats: [], typingStatuses: {}, unreadCounts: {}, publicChannels: [], openRooms: [], joinedChannels: {}, channelAdCooldowns: {}, pinnedRooms: [], ignoredUsers: [], hiddenAdsUsers: [], systemNotice: null, pendingJoin: null, knownRoomTitles: {}, isLogsModalOpen: false, logsPreselectedTarget: null, roomUnreadActivity: {}, isStatusModalOpen: false, setStatusModalOpen: (open) => set({ isStatusModalOpen: open }), isGlobalSettingsModalOpen: false, setGlobalSettingsModalOpen: (open) => set({ isGlobalSettingsModalOpen: open }),

    updateActivity: () => {
        const { ws, myCharacterName } = get();
        const { globalSettings } = useSettingsStore.getState();
        if (idleTimeout) clearTimeout(idleTimeout);
        if (preIdleStatus && ws && ws.readyState === WebSocket.OPEN) {
            safeWsSend(ws, `STA ${JSON.stringify({ status: preIdleStatus, statusmsg: preIdleStatusMsg })}`);
            preIdleStatus = null; preIdleStatusMsg = '';
        }
        if (globalSettings.idleTimer > 0 && ws && myCharacterName && ws.readyState === WebSocket.OPEN) {
            idleTimeout = setTimeout(() => {
                const myCurrent = get().onlineCharacters[myCharacterName];
                if (myCurrent && myCurrent.status !== 'dnd' && myCurrent.status !== 'idle') {
                    preIdleStatus = myCurrent.status;
                    preIdleStatusMsg = myCurrent.statusmsg;
                    safeWsSend(ws, `STA ${JSON.stringify({ status: 'idle', statusmsg: myCurrent.statusmsg })}`);
                }
            }, globalSettings.idleTimer * 60000);
        }
    },

    openLogs: (targetId) => set({
        isLogsModalOpen: true,
        logsPreselectedTarget: targetId || null
    }),
    setLogsModalOpen: (open) => set({
        isLogsModalOpen: open,
        logsPreselectedTarget: null
    }),
    setSystemNotice: (msg) => {
        set({ systemNotice: msg });
        if (noticeTimeout) clearTimeout(noticeTimeout);
        if (msg) {
            noticeTimeout = setTimeout(() => {
                set({ systemNotice: null });
            }, 4000);
        }
    },
    changeMyStatus: (status, statusmsg) => {
        const { ws } = get();
        safeWsSend(ws, `STA ${JSON.stringify({ status, statusmsg })}`);
        preIdleStatus = null;
    },
    setSelectedUserProfile: (user) => set({
        selectedUserProfile: user
    }),
    setActiveTab: (tab) => set({
        activeTab: tab, activeChat: null
    }),
    closeChat: (character) => set((state) => {
        const newOpenChats = state.openChats.filter(c => c !== character);
        const newPinnedChats = state.pinnedChats.filter(c => c !== character);
        if (state.myCharacterName) {
            AsyncStorage.setItem(`@chat_openpms_${state.myCharacterName}`, JSON.stringify(newOpenChats)).catch(() => { });
            AsyncStorage.setItem(`@chat_pinned_${state.myCharacterName}`, JSON.stringify(newPinnedChats)).catch(() => { });
        }
        return {
            openChats: newOpenChats,
            pinnedChats: newPinnedChats,
            activeChat: state.activeChat === character ? null : state.activeChat,
            activeTab: state.activeChat === character ? 'console' : state.activeTab
        };
    }),
    togglePinChat: (character) => set((state) => {
        if (!state.myCharacterName) return state;
        const isPinned = state.pinnedChats.includes(character);
        const newPinned = isPinned ? state.pinnedChats.filter(c => c !== character) : [...state.pinnedChats, character];
        AsyncStorage.setItem(`@chat_pinned_${state.myCharacterName}`, JSON.stringify(newPinned)).catch(() => { });
        return {
            pinnedChats: newPinned
        };
    }),
    togglePinRoom: (channel) => set((state) => {
        if (!state.myCharacterName) return state;
        const isPinned = state.pinnedRooms.includes(channel);
        const newPinned = isPinned ? state.pinnedRooms.filter(c => c !== channel) : [...state.pinnedRooms, channel];
        AsyncStorage.setItem(`@chat_pinned_rooms_${state.myCharacterName}`, JSON.stringify(newPinned)).catch(() => { });
        return {
            pinnedRooms: newPinned
        };
    }),
    setActiveChat: (characterOrChannelId) => set((state) => {
        if (!characterOrChannelId) return { activeChat: null };
        if (state.joinedChannels[characterOrChannelId]) {
            const newUnreads = { ...state.unreadCounts }; delete newUnreads[characterOrChannelId];
            const newActivity = { ...state.roomUnreadActivity }; delete newActivity[characterOrChannelId];
            if (state.myCharacterName) AsyncStorage.setItem(`@chat_unreads_${state.myCharacterName}`, JSON.stringify(newUnreads)).catch(() => { });
            return { activeChat: characterOrChannelId, unreadCounts: newUnreads, roomUnreadActivity: newActivity };
        }
        const newOpenChats = state.openChats.includes(characterOrChannelId) ? state.openChats : [...state.openChats, characterOrChannelId];
        const newUnreads = { ...state.unreadCounts }; delete newUnreads[characterOrChannelId];
        if (state.myCharacterName) {
            AsyncStorage.setItem(`@chat_openpms_${state.myCharacterName}`, JSON.stringify(newOpenChats)).catch(() => { }); AsyncStorage.setItem(`@chat_unreads_${state.myCharacterName}`, JSON.stringify(newUnreads)).catch(() => { });
            if (!state.privateMessages[characterOrChannelId]) { LogManager.loadInitial(state.myCharacterName, characterOrChannelId).then(history => { set((s) => ({ privateMessages: { ...s.privateMessages, [characterOrChannelId]: history } })); }); }
        }
        return { activeChat: characterOrChannelId, openChats: newOpenChats, unreadCounts: newUnreads };
    }),
    addConsoleLog: (msg) => set((state) => {
        const newLog: ConsoleLog = {
            id: Date.now().toString() + Math.random(), timestamp: Date.now(), message: msg
        };
        const newLogs = [newLog, ...state.consoleLogs].slice(0, MAX_UI_MESSAGES);
        if (state.myCharacterName) AsyncStorage.setItem(`@chat_console_${state.myCharacterName}`, JSON.stringify(newLogs)).catch(() => { });
        return {
            consoleLogs: newLogs
        };
    }),
    loadCharacterData: async (charName) => {
        try {
            const prefix = `_${charName}`;
            const [savedPinned, savedUnreads, savedPinnedRooms, savedCooldowns, savedOpenPms, savedTitles] = await Promise.all([
                AsyncStorage.getItem(`@chat_pinned${prefix}`),
                AsyncStorage.getItem(`@chat_unreads${prefix}`),
                AsyncStorage.getItem(`@chat_pinned_rooms${prefix}`),
                AsyncStorage.getItem(`@chat_ad_cooldowns${prefix}`),
                AsyncStorage.getItem(`@chat_openpms${prefix}`),
                AsyncStorage.getItem(`@chat_room_titles${prefix}`)
            ]);
            await useSettingsStore.getState().loadSettings(charName);
            const currentPinnedRooms = savedPinnedRooms ? JSON.parse(savedPinnedRooms) : [];
            const savedPinnedArray = savedPinned ? JSON.parse(savedPinned) : [];
            const openPmsArray = savedOpenPms ? JSON.parse(savedOpenPms) : [];
            const parsedTitles = savedTitles ? JSON.parse(savedTitles) : {};
            const openChatsMerged = Array.from(new Set([...savedPinnedArray, ...openPmsArray]));
            const restoredPrivateMessages: Record<string, ChatMessage[]> = {};
            for (const pm of openChatsMerged) {
                restoredPrivateMessages[pm] = await LogManager.loadInitial(charName, pm);
            }
            set({
                privateMessages: restoredPrivateMessages,
                pinnedChats: savedPinnedArray,
                openChats: openChatsMerged,
                unreadCounts: savedUnreads ? JSON.parse(savedUnreads) : {},
                pinnedRooms: currentPinnedRooms,
                knownRoomTitles: parsedTitles, joinedChannels: {},
                channelAdCooldowns: savedCooldowns ? JSON.parse(savedCooldowns) : {},
                roomUnreadActivity: {},
                consoleLogs: [],
                myCharacterName: charName,
                activeChat: null,
                activeTab: 'console'
            });
        } catch (e) {
            console.error(e);
        }
    },
    disconnectChat: () => {
        const { ws } = get();
        if (ws) {
            ws.onclose = null;
            ws.close();
        } playAppSound('logout');
        if (idleTimeout) clearTimeout(idleTimeout);
        preIdleStatus = null;
        pendingMessages = [];
        set({
            ws: null,
            isWsConnected: false,
            isConnectingToChat: false,
            myCharacterName: null,
            activeChat: null,
            joinedChannels: {},
            onlineCharacters: {},
            privateMessages: {},
            openChats: [],
            pinnedChats: [],
            pinnedRooms: [],
            friends: [],
            apiFriends: [],
            consoleLogs: [],
            systemNotice: null,
            pendingJoin: null,
            isLogsModalOpen: false,
            knownRoomTitles: {},
            roomUnreadActivity: {},
            isGlobalSettingsModalOpen: false,
            isStatusModalOpen: false
        });
    },
    connectToChat: async (characterName: string) => {
        const { account, passwordInSession } = useAuthStore.getState();
        const { ws } = get();
        if (ws) {
            ws.onclose = null;
            ws.close();
        }
        if (!account || !passwordInSession) {
            useAuthStore.getState().setError(i18n.t("chatStore.errors.sessionExpired"));
            return;
        }

        set({
            isConnectingToChat: true,
            ws: null
        });
        await get().loadCharacterData(characterName);
        const savedHiddenAds = await AsyncStorage.getItem(`@chat_hiddenads_${characterName}`);
        if (savedHiddenAds) set({
            hiddenAdsUsers: JSON.parse(savedHiddenAds)
        });

        try {
            const formData = new URLSearchParams();
            formData.append('account', account); formData.append('password', passwordInSession);
            formData.append('no_friends', 'true');
            formData.append('no_bookmarks', 'true');
            const response = await fetch('https://www.f-list.net/json/getApiTicket.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }, body: formData.toString()
            });
            const data = await response.json();
            if (data.error) {
                useAuthStore.getState().setError(data.error);
                set({
                    isConnectingToChat: false
                });
                return;
            }

            try {
                const fForm = new URLSearchParams();
                fForm.append('account', account);
                fForm.append('ticket', data.ticket);
                fForm.append('friendlist', 'true');
                const fRes = await fetch('https://www.f-list.net/json/api/friend-bookmark-lists.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: fForm.toString()
                });
                const fData = await fRes.json();
                if (fData.friendlist) {
                    const myFriends = [...new Set(fData.friendlist.map((f: any) => f.dest))];
                    set({ apiFriends: myFriends as string[] });
                }
            } catch { }

            const newWs = new WebSocket('wss://chat.f-list.net/chat2');
            newWs.onopen = () => {
                newWs.send(`IDN ${JSON.stringify({
                    method: 'ticket',
                    account: account,
                    ticket: data.ticket,
                    character: characterName,
                    cname: 'Beacon Client',
                    cversion: '0.2.0-alpha'
                })}`);
            };

            newWs.onmessage = (event) => {
                const message = event.data as string;
                const command = message.substring(0, 3);
                const payloadString = message.substring(4);
                const { addConsoleLog, friends, myCharacterName, onlineCharacters } = get();
                const isBookmarked = (name: string) => friends.includes(name);
                const myStatus = myCharacterName ? onlineCharacters[myCharacterName]?.status : 'online';
                const isDnd = myStatus === 'dnd';
                let data: any = {};
                if (payloadString) {
                    try {
                        data = JSON.parse(payloadString);
                    } catch { }
                }

                switch (command) {
                    case 'IDN':
                        addConsoleLog(i18n.t("chatStore.console.connectionSuccess"));
                        set({ isWsConnected: true, isConnectingToChat: false });
                        playAppSound('login');
                        get().pinnedRooms.forEach(room =>
                            safeWsSend(newWs, `JCH ${JSON.stringify({ channel: room })}`));
                        get().updateActivity();
                        break;
                    case 'ERR':
                        if ([2, 3, 4, 9, 30, 31, 32, 62].includes(data.number)) {
                            useAuthStore.getState().setError(i18n.t("chatStore.errors.attention", { message: data.message }));
                            set({ isConnectingToChat: false, pendingJoin: null });
                            newWs.close();
                        }
                        else {
                            if (data.number === 28 && get().pendingJoin) {
                                const existingId = Object.keys(get().joinedChannels).find(id => id.toLowerCase() === get().pendingJoin?.toLowerCase());
                                set({ activeChat: existingId || get().pendingJoin, pendingJoin: null, activeTab: 'channels' });
                            } else {
                                addConsoleLog(i18n.t("chatStore.errors.errorPrefix", { message: data.message }));
                                get().setSystemNotice(data.message);
                                set({ pendingJoin: null });
                            }
                        } break;
                    case 'HLO':
                        addConsoleLog(i18n.t("chatStore.console.hello", { message: data.message || i18n.t("chatStore.console.helloDefault") }));
                        break;
                    case 'CON':
                        addConsoleLog(i18n.t("chatStore.console.usersConnected", { count: data.count }));
                        break;
                    case 'PIN':
                        newWs.send('PIN');
                        break;
                    case 'FRL':
                        set({ friends: data.characters || [] });
                        break;
                    case 'ADL':
                        set({ globalOps: data.ops || [] });
                        break;
                    case 'LIS':
                        set((state) => {
                            const newOnline = { ...state.onlineCharacters };
                            data.characters.forEach((char: any[]) => {
                                newOnline[char[0]] = {
                                    gender: char[1],
                                    status: char[2],
                                    statusmsg: char[3] || ""
                                };
                            });
                            return { onlineCharacters: newOnline };
                        });
                        break;
                    case 'NLN':
                        if (isBookmarked(data.identity)) addConsoleLog(i18n.t("chatStore.console.userConnected", { user: data.identity }));
                        set((state) => ({
                            onlineCharacters: {
                                ...state.onlineCharacters, [data.identity]: {
                                    status: data.status,
                                    gender: data.gender,
                                    statusmsg: ""
                                }
                            }
                        }));
                        break;
                    case 'STA':
                        if (isBookmarked(data.character)) addConsoleLog(i18n.t("chatStore.console.statusChanged", { user: data.character, status: data.status }));
                        set((state) => {
                            const char = state.onlineCharacters[data.character] || {
                                gender: "None",
                                status: "online",
                                statusmsg: ""
                            };
                            return {
                                onlineCharacters: {
                                    ...state.onlineCharacters, [data.character]: {
                                        ...char,
                                        status: data.status,
                                        statusmsg: data.statusmsg || ""
                                    }
                                }
                            };
                        });
                        break;
                    case 'FLN':
                        if (isBookmarked(data.character)) addConsoleLog(i18n.t("chatStore.console.userDisconnected", { user: data.character }));
                        set((state) => {
                            const newOnline = { ...state.onlineCharacters };
                            delete newOnline[data.character];
                            const newJoinedChannels = { ...state.joinedChannels };
                            let roomsChanged = false;
                            Object.keys(newJoinedChannels).forEach(channelId => {
                                if (newJoinedChannels[channelId].users.includes(data.character)) {
                                    newJoinedChannels[channelId] = {
                                        ...newJoinedChannels[channelId],
                                        users: newJoinedChannels[channelId].users.filter(u => u !== data.character)
                                    };
                                    roomsChanged = true;
                                }
                            });
                            return { onlineCharacters: newOnline, ...(roomsChanged ? { joinedChannels: newJoinedChannels } : {}) };
                        });
                        break;
                    case 'CIU':
                        addConsoleLog(i18n.t("chatStore.console.invitedToRoom", { sender: data.sender, title: data.title, room: data.name }));
                        break;
                    case 'CBU':
                    case 'CKU':
                    case 'CTU':
                        addConsoleLog(i18n.t("chatStore.console.modSanction", { operator: data.operator, user: data.character, channel: data.channel }));
                        break;
                    case 'CHA':
                        set({ publicChannels: (data.channels || []).sort((a: any, b: any) => b.characters - a.characters) });
                        break;
                    case 'ORS':
                        set({ openRooms: (data.channels || []).sort((a: any, b: any) => b.characters - a.characters) });
                        break;
                    case 'TPN':
                        set((state) => ({ typingStatuses: { ...state.typingStatuses, [data.character]: data.status } }));
                        break;
                    case 'PRI':
                        set((state) => {
                            const sender = data.character; const history = state.privateMessages[sender] || [];
                            const newMessage = {
                                from: sender,
                                message: data.message,
                                timestamp: Date.now()
                            };
                            if (state.myCharacterName && sender !== state.myCharacterName) {
                                playAppSound('message');

                            }
                            if (state.myCharacterName) LogManager.save(state.myCharacterName, sender, newMessage);
                            const newPrivateMessages = { ...state.privateMessages, [sender]: [...history, newMessage].slice(-MAX_UI_MESSAGES) };
                            const newOpenChats = state.openChats.includes(sender) ? state.openChats : [...state.openChats, sender];
                            let newUnreads = state.unreadCounts;
                            if (state.activeChat !== sender) {
                                newUnreads = { ...state.unreadCounts, [sender]: (state.unreadCounts[sender] || 0) + 1 };
                                if (state.myCharacterName) AsyncStorage.setItem(`@chat_unreads_${state.myCharacterName}`, JSON.stringify(newUnreads)).catch(() => { });
                                const { globalSettings } = useSettingsStore.getState();
                                if (globalSettings.vibrate && !isDnd) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                            if (state.myCharacterName) AsyncStorage.setItem(`@chat_openpms_${state.myCharacterName}`, JSON.stringify(newOpenChats)).catch(() => { });
                            if (!isDnd && AppState.currentState.match(/inactive|background/)) {
                                Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: i18n.t("chatStore.notifications.privateMessageTitle", { sender }),
                                        body: data.message,
                                        sound: true,
                                    },
                                    trigger: null,
                                });
                            } return {
                                privateMessages: newPrivateMessages,
                                openChats: newOpenChats,
                                unreadCounts: newUnreads
                            };
                        });
                        break;
                    case 'JCH':
                        set((state) => {
                            const charName = data.character.identity;
                            const channelId = data.channel.toLowerCase().startsWith('adh-') ? 'ADH-' + data.channel.substring(4).toLowerCase() : data.channel;
                            if (charName === state.myCharacterName) {
                                const titleToSave = data.title || channelId;
                                const newTitles = { ...state.knownRoomTitles, [channelId]: titleToSave };
                                AsyncStorage.setItem(`@chat_room_titles_${state.myCharacterName}`, JSON.stringify(newTitles)).catch(() => { });
                                const existingRoom = state.joinedChannels[channelId];
                                const newJoinedChannels = {
                                    ...state.joinedChannels,
                                    [channelId]: {
                                        id: channelId,
                                        title: titleToSave,
                                        description: existingRoom?.description || '',
                                        mode: existingRoom?.mode || 'chat',
                                        users: [],
                                        messages: existingRoom?.messages || [],
                                        owner: existingRoom?.owner,
                                        oplist: existingRoom?.oplist
                                    }
                                }; const pendingLower = state.pendingJoin?.toLowerCase();
                                const channelLower = channelId.toLowerCase();
                                const shouldJump = pendingLower === channelLower;
                                LogManager.loadInitial(state.myCharacterName!, channelId).then(history => {
                                    useChatStore.setState(s => {
                                        if (s.joinedChannels[channelId]) {
                                            return {
                                                joinedChannels: {
                                                    ...s.joinedChannels,
                                                    [channelId]: {
                                                        ...s.joinedChannels[channelId],
                                                        messages: history
                                                    }
                                                }
                                            };
                                        } return {};
                                    });
                                });
                                return {
                                    joinedChannels: newJoinedChannels,
                                    activeChat: shouldJump ? channelId : state.activeChat,
                                    activeTab: shouldJump ? 'channels' : state.activeTab,
                                    pendingJoin: shouldJump ? null : state.pendingJoin,
                                    knownRoomTitles: newTitles
                                };
                            } else {
                                const room = state.joinedChannels[channelId];
                                if (!room || room.users.includes(charName))
                                    return state;
                                return {
                                    joinedChannels: {
                                        ...state.joinedChannels,
                                        [channelId]: {
                                            ...room,
                                            users: [...room.users, charName]
                                        }
                                    }
                                };
                            }
                        });
                        break;
                    case 'ICH':
                        set((state) => {
                            const channelId = data.channel.toLowerCase().startsWith('adh-') ? 'ADH-' + data.channel.substring(4).toLowerCase() : data.channel;
                            const room = state.joinedChannels[channelId];
                            if (!room) return state;
                            return {
                                joinedChannels: {
                                    ...state.joinedChannels,
                                    [channelId]: {
                                        ...room,
                                        mode: data.mode,
                                        users: data.users.map((u: any) => u.identity)
                                    }
                                }
                            };
                        });
                        break;
                    case 'COL':
                        set((state) => {
                            const room = state.joinedChannels[data.channel];
                            if (!room) return state;
                            return {
                                joinedChannels: {
                                    ...state.joinedChannels,
                                    [data.channel]: {
                                        ...room, owner: data.oplist[0] || "",
                                        oplist: data.oplist
                                    }
                                }
                            };
                        });
                        break;
                    case 'CDS':
                        set((state) => {
                            const room = state.joinedChannels[data.channel];
                            if (!room) return state;
                            return {
                                joinedChannels: {
                                    ...state.joinedChannels,
                                    [data.channel]: {
                                        ...room,
                                        description: data.description
                                    }
                                }
                            };
                        });
                        break;
                    case 'LCH':
                        set((state) => {
                            const room = state.joinedChannels[data.channel];
                            if (!room) return state;
                            return {
                                joinedChannels: {
                                    ...state.joinedChannels,
                                    [data.channel]: {
                                        ...room, users: room.users.filter(u => u !== data.character)
                                    }
                                }
                            };
                        });
                        break;
                    case 'MSG':
                    case 'LRP':
                        set((state) => {
                            const channelId = data.channel.toLowerCase().startsWith('adh-') ? 'ADH-' + data.channel.substring(4).toLowerCase() : data.channel;
                            const room = state.joinedChannels[channelId];
                            if (!room) return state;
                            const newMessage: ChatMessage = {
                                from: data.character,
                                message: data.message,
                                timestamp: Date.now(),
                                type: command === 'LRP' ? 'ad' : 'chat'
                            };
                            if (state.myCharacterName) LogManager.save(state.myCharacterName, channelId, newMessage);
                            const updatedMessages = [...room.messages, newMessage].slice(-MAX_UI_MESSAGES);
                            const newJoinedChannels = { ...state.joinedChannels, [channelId]: { ...room, messages: updatedMessages } };
                            let newUnreads = { ...state.unreadCounts };
                            let newActivity = { ...state.roomUnreadActivity };
                            if (command === 'MSG') {
                                const { globalSettings, roomSettings } = useSettingsStore.getState();
                                const settings = roomSettings[channelId] || { notifyAll: false, notifyName: true, highlightWords: '' };
                                let isHighlight = false;
                                if ((settings.notifyName || globalSettings.notifyOnName) && state.myCharacterName && data.character !== state.myCharacterName) {
                                    if (data.message.toLowerCase().includes(state.myCharacterName.toLowerCase())) isHighlight = true;
                                }
                                if (!isHighlight && data.character !== state.myCharacterName) {
                                    const rWords = settings.highlightWords.split(',').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length > 0);
                                    const gWords = globalSettings.globalHighlightWords.split(',').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length > 0);
                                    const allWords = [...rWords, ...gWords];
                                    const lowerMsg = data.message.toLowerCase();
                                    if (allWords.some((w: string) => lowerMsg.includes(w))) isHighlight = true;
                                } const shouldNotify = settings.notifyAll || isHighlight;
                                if (state.activeChat !== channelId) {
                                    newActivity[channelId] = true;
                                    if (shouldNotify) {
                                        newUnreads[channelId] = (newUnreads[channelId] || 0) + 1;
                                        if (state.myCharacterName) AsyncStorage.setItem(`@chat_unreads_${state.myCharacterName}`, JSON.stringify(newUnreads)).catch(() => { });
                                        playAppSound('message');
                                        if (globalSettings.vibrate && !isDnd) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        if (!isDnd && AppState.currentState.match(/inactive|background/)) {
                                            Notifications.scheduleNotificationAsync({
                                                content: {
                                                    title: i18n.t("chatStore.notifications.roomMessageTitle", { room: room.title }),
                                                    body: i18n.t("chatStore.notifications.roomMessageBody", { sender: data.character }), 
                                                },
                                                trigger: null
                                            });
                                        }
                                    }
                                } else { if (isHighlight) playAppSound('message'); }
                            } return {
                                joinedChannels: newJoinedChannels,
                                unreadCounts: newUnreads,
                                roomUnreadActivity: newActivity
                            };
                        });
                        break;
                    case 'SYS':
                        addConsoleLog(i18n.t("chatStore.console.systemMessage", { message: data.message }));
                        break;
                    case 'BRO':
                        addConsoleLog(i18n.t("chatStore.console.broadcast", { message: data.message }));
                        break;
                    case 'VAR':
                        addConsoleLog(i18n.t("chatStore.console.serverConfigLoaded", { variable: data.variable }));
                        break;
                    case 'RLL':
                        if (data.channel) {
                            set((state) => {
                                const channelId = data.channel.toLowerCase().startsWith('adh-') ? 'ADH-' + data.channel.substring(4).toLowerCase() : data.channel;
                                const room = state.joinedChannels[channelId];
                                if (!room) return state;
                                const newMessage: ChatMessage = {
                                    from: 'System',
                                    message: `[color=yellow]🎲 ${data.message}[/color]`,
                                    timestamp: Date.now(),
                                    type: 'chat'
                                };
                                if (state.myCharacterName) LogManager.save(state.myCharacterName, channelId, newMessage);
                                const updatedMessages = [...room.messages, newMessage].slice(-MAX_UI_MESSAGES);
                                const newJoinedChannels = { ...state.joinedChannels, [channelId]: { ...room, messages: updatedMessages } };
                                let newUnreads = { ...state.unreadCounts };
                                let newActivity = { ...state.roomUnreadActivity };
                                const { globalSettings, roomSettings } = useSettingsStore.getState();
                                const settings = roomSettings[channelId] || { notifyAll: false, notifyName: true, highlightWords: '' };
                                let isHighlight = false;
                                if ((settings.notifyName || globalSettings.notifyOnName) && state.myCharacterName) {
                                    if (data.message.toLowerCase().includes(state.myCharacterName.toLowerCase())) isHighlight = true;
                                }
                                if (!isHighlight) {
                                    const rWords = settings.highlightWords.split(',').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length > 0);
                                    const gWords = globalSettings.globalHighlightWords.split(',').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length > 0);
                                    const allWords = [...rWords, ...gWords];
                                    const lowerMsg = data.message.toLowerCase();
                                    if (allWords.some((w: string) => lowerMsg.includes(w))) isHighlight = true;
                                }
                                const shouldNotify = settings.notifyAll || isHighlight;
                                if (state.activeChat !== channelId) {
                                    newActivity[channelId] = true;
                                    if (shouldNotify) {
                                        newUnreads[channelId] = (newUnreads[channelId] || 0) + 1;
                                        if (state.myCharacterName) AsyncStorage.setItem(`@chat_unreads_${state.myCharacterName}`, JSON.stringify(newUnreads)).catch(() => { });
                                        playAppSound('message');
                                        if (globalSettings.vibrate && !isDnd) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        if (!isDnd && AppState.currentState.match(/inactive|background/)) {
                                            Notifications.scheduleNotificationAsync({
                                                content: {
                                                    title: i18n.t("chatStore.notifications.diceAlertTitle", { room: room.title }),
                                                    body: i18n.t("chatStore.notifications.diceAlertBody"),
                                                    sound: true
                                                },
                                                trigger: null
                                            });
                                        }
                                    }
                                } else {
                                    if (isHighlight) playAppSound('message');
                                }
                                return {
                                    joinedChannels: newJoinedChannels,
                                    unreadCounts: newUnreads,
                                    roomUnreadActivity: newActivity
                                };
                            });
                        } else {
                            addConsoleLog(`🎲 ${data.message}`);
                        }
                        break;
                    case 'RTB':
                        addConsoleLog(i18n.t("chatStore.console.webNotification", { type: data.type }));
                        break;
                    case 'UPT':
                        addConsoleLog(i18n.t("chatStore.console.uptime", { start: data.startstring, users: data.users, max: data.maxusers, channels: data.channels, accepted: data.accepted }));
                        break;
                    case 'IGN':
                        if (data.action === 'init') {
                            set({ ignoredUsers: data.characters || [] });
                        } else if (data.action === 'add') {
                            set((state) => ({
                                ignoredUsers: [...new Set([...state.ignoredUsers, data.character])]
                            }));
                        } else if (data.action === 'delete') {
                            set((state) => ({
                                ignoredUsers: state.ignoredUsers.filter(c => c !== data.character)
                            }));
                        }
                        break;
                    case 'KID':
                    case 'PRD':
                        break;
                    default:
                        addConsoleLog(i18n.t("chatStore.console.unknownCommand", { command }));
                        break;
                }
            };
            newWs.onerror = () => {
                set({ isConnectingToChat: false });
                useAuthStore.getState().setError(i18n.t("chatStore.errors.wsNetworkError"));
            };
            newWs.onclose = () => {
                if (get().myCharacterName) {
                    set({
                        isWsConnected: false,
                        ws: null,
                        isConnectingToChat: false
                    });
                }
            };
            set({ ws: newWs });
        } catch (err) {
            console.log(err);
            useAuthStore.getState().setError(i18n.t("chatStore.errors.ticketError"));
            set({ isConnectingToChat: false });
        }
    },

    requestChannels: () => {
        const { ws } = get();
        if (ws) ws.send('CHA');
    },
    requestOpenRooms: () => {
        const { ws } = get();
        if (ws) ws.send('ORS');
    },
    joinChannel: (rawChannel) => {
        const { ws, joinedChannels, activeChat } = get();
        const channel = rawChannel.toLowerCase().startsWith('adh-') ? 'ADH-' + rawChannel.substring(4).toLowerCase() : rawChannel;
        if (joinedChannels[channel] && joinedChannels[channel].users.length > 0) {
            if (activeChat !== channel) {
                set({ activeChat: channel, activeTab: 'channels' });
            }
            return;
        } if (ws) ws.send(`JCH ${JSON.stringify({ channel })}`);
        set({ pendingJoin: channel });
    },
    leaveChannel: (channel) => {
        const { ws } = get();
        if (ws) ws.send(`LCH ${JSON.stringify({ channel })}`);
        set((state) => {
            const newPinned = state.pinnedRooms.filter(c => c !== channel);
            if (state.myCharacterName) AsyncStorage.setItem(`@chat_pinned_rooms_${state.myCharacterName}`, JSON.stringify(newPinned)).catch(() => { });
            const room = state.joinedChannels[channel];
            if (!room) return state;
            const newJoinedChannels = { ...state.joinedChannels };
            delete newJoinedChannels[channel];
            return {
                joinedChannels: newJoinedChannels,
                pinnedRooms: newPinned,
                activeChat: state.activeChat === channel ? null : state.activeChat,
                activeTab: state.activeChat === channel ? 'console' : state.activeTab
            };
        });
    },
    sendChannelMessage: (channel, message, type) => {
        const { ws, myCharacterName } = get();
        if (!ws || message.trim() === '') return;
        const command = type === 'ad' ? 'LRP' : 'MSG';
        safeWsSend(ws, `${command} ${JSON.stringify({ channel, message })}`);
        set((state) => {
            const room = state.joinedChannels[channel];
            if (!room) return state;
            const newMessage: ChatMessage = {
                from: myCharacterName || 'Yo',
                message: message,
                timestamp: Date.now(),
                type: type
            };
            if (state.myCharacterName) LogManager.save(state.myCharacterName, channel, newMessage);
            const newJoinedChannels = {
                ...state.joinedChannels,
                [channel]: {
                    ...room,
                    messages: [...room.messages, newMessage].slice(-MAX_UI_MESSAGES),
                    lastAdSent: type === 'ad' ? Date.now() : room.lastAdSent
                }
            };
            if (type === 'ad') {
                const newCooldowns = {
                    ...state.channelAdCooldowns,
                    [channel]: Date.now()
                };
                if (state.myCharacterName) AsyncStorage.setItem(`@chat_ad_cooldowns_${state.myCharacterName}`, JSON.stringify(newCooldowns)).catch(() => { });
                return {
                    joinedChannels: newJoinedChannels,
                    channelAdCooldowns: newCooldowns
                };
            } return {
                joinedChannels: newJoinedChannels
            };
        });
    },
    sendStaffAlert: (channel, report) => {
        const { ws } = get();
        if (!ws) return;
        safeWsSend(ws, `SFC ${JSON.stringify({
            action: "report",
            report: i18n.t("chatStore.reports.roomAlert", { channel, report }),
            character: "" 
        })}`);
    },
    sendTyping: (character, status) => {
        const { ws } = get();
        if (ws) ws.send(`TPN ${JSON.stringify({ character, status })}`);
    },
    sendPrivateMessage: (recipient, message) => {
        const { ws, myCharacterName } = get();
        if (!ws || message.trim() === '') return;
        safeWsSend(ws, `PRI ${JSON.stringify({ recipient, message })}`);
        set((state) => {
            const history = state.privateMessages[recipient] || [];
            const newMessage = {
                from: myCharacterName || 'Yo',
                message,
                timestamp: Date.now()
            };
            if (state.myCharacterName) LogManager.save(state.myCharacterName, recipient, newMessage);
            const newPrivateMessages = { ...state.privateMessages, [recipient]: [...history, newMessage].slice(-MAX_UI_MESSAGES) };
            const newOpenChats = state.openChats.includes(recipient) ? state.openChats : [...state.openChats, recipient];
            if (state.myCharacterName) AsyncStorage.setItem(`@chat_openpms_${state.myCharacterName}`, JSON.stringify(newOpenChats)).catch(() => { });
            return {
                privateMessages: newPrivateMessages,
                openChats: newOpenChats
            };
        });
    },
    processCommand: (channelId, text, isRoom) => processChatCommand(channelId, text, isRoom),
    toggleIgnore: (character) => {
        const { ws, ignoredUsers } = get();
        const isIgnored = ignoredUsers.includes(character);
        const action = isIgnored ? 'delete' : 'add';
        if (ws && ws.readyState === WebSocket.OPEN) {
            safeWsSend(ws, `IGN {"action":"${action}","character":"${character}"}`);
        }
        set({ ignoredUsers: isIgnored ? ignoredUsers.filter(u => u !== character) : [...ignoredUsers, character] });
    },
    toggleHideAds: async (character) => {
        const { hiddenAdsUsers, myCharacterName } = get();
        const newHidden = hiddenAdsUsers.includes(character) ? hiddenAdsUsers.filter(u => u !== character) : [...hiddenAdsUsers, character];
        set({ hiddenAdsUsers: newHidden });
        if (myCharacterName) await AsyncStorage.setItem(`@chat_hiddenads_${myCharacterName}`, JSON.stringify(newHidden)).catch(() => { });
    },
    fetchMemo: async (character) => {
        const { ticket, account } = useAuthStore.getState();
        if (!account || !ticket) return "";
        try {
            const formData = new URLSearchParams();
            formData.append('account', account);
            formData.append('ticket', ticket);
            formData.append('target', character);
            const response = await fetch('https://www.f-list.net/json/api/character-memo-get2.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            const data = await response.json();
            if (data.error) return "";
            return data.note || "";
        } catch { return ""; }
    },
    saveMemo: async (character, memo) => {
        const { ticket, account } = useAuthStore.getState();
        if (!account || !ticket) return;
        try {
            const formData = new URLSearchParams();
            formData.append('account', account);
            formData.append('ticket', ticket);
            formData.append('target_name', character);
            formData.append('note', memo);
            const response = await fetch('https://www.f-list.net/json/api/character-memo-save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            const data = await response.json();
            if (data.error) alert(i18n.t("chatStore.errors.memoSaveError", { error: data.error }));
        } catch {
            alert(i18n.t("chatStore.errors.serverConnectionError"));
        }
    },
    reportUser: (character, reason) => {
        const { ws } = get();
        if (ws && ws.readyState === WebSocket.OPEN) {
            safeWsSend(ws, `SFC ${JSON.stringify({ 
                action: "report", 
                report: i18n.t("chatStore.reports.userReport", { character, reason }), 
                character: character
            })}`);
        }
    },
}));