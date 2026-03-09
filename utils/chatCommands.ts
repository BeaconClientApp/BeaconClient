import * as Clipboard from 'expo-clipboard';
import { useChatStore, safeWsSend } from '@/store/useChatStore';
import i18n from '@/i18n';

export const processChatCommand = (channelId: string, text: string, isRoom: boolean): boolean => {
    const textTrimmed = text.trim();
    if (!textTrimmed.startsWith('/')) return false;

    const lowerText = textTrimmed.toLowerCase();
    if (lowerText.startsWith('/me ') || lowerText.startsWith("/me's ")) return false;

    const firstSpace = textTrimmed.indexOf(' ');
    const cmd = firstSpace === -1 ? textTrimmed.slice(1).toLowerCase() : textTrimmed.slice(1, firstSpace).toLowerCase();
    const args = firstSpace === -1 ? '' : textTrimmed.slice(firstSpace + 1);

    const store = useChatStore.getState();
    const { ws, leaveChannel, closeChat, setActiveChat, joinChannel, addConsoleLog, joinedChannels, toggleIgnore, ignoredUsers, setSystemNotice, requestChannels, setActiveTab, requestOpenRooms, sendChannelMessage } = store;

    if (cmd === 'ad' && isRoom && ws) {
        sendChannelMessage(channelId, args, 'ad');
        return true;
    }

    const send = (payload: string) => safeWsSend(ws, payload);

    switch (cmd) {
        case 'join':
            if (args) joinChannel(args);
            return true;
        case 'close':
        case 'leave':
            if (isRoom) leaveChannel(channelId);
            else closeChat(channelId);
            return true;
        case 'priv':
        case 'msg':
        case 'pm':
            if (args) setActiveChat(args);
            return true;
        case 'channels':
            requestChannels();
            setActiveTab('channels');
            return true;
        case 'prooms':
            requestOpenRooms();
            setActiveTab('channels');
            return true;
        case 'ignore':
        case 'unignore':
            if (args) toggleIgnore(args);
            return true;
        case 'ignorelist':
            addConsoleLog(i18n.t("chatCommands.ignoreList", { users: ignoredUsers.join(', ') || i18n.t("chatCommands.none") }));
            return true;
        case 'reward':
            if (args && ws) send(`RWD ${JSON.stringify({ character: args })}`);
            return true;
        case 'uptime':
            if (ws) send('UPT');
            return true;
        case 'status':
            if (ws) {
                const statusParts = args.split(' ');
                const statusName = (statusParts[0] || 'online').toLowerCase();
                const statusMsg = statusParts.slice(1).join(' ');
                if (['online', 'looking', 'busy', 'dnd', 'idle', 'away', 'crown'].includes(statusName)) send(`STA ${JSON.stringify({ status: statusName, statusmsg: statusMsg })}`);
                else addConsoleLog(i18n.t("chatCommands.invalidStatus"));
            }
            return true;
        case 'makeroom':
            if (args && ws) send(`CCR ${JSON.stringify({ channel: args })}`);
            return true;
        case 'openroom':
            if (ws && isRoom) send(`RST ${JSON.stringify({ channel: channelId, status: 'public' })}`);
            return true;
        case 'closeroom':
            if (ws && isRoom) send(`RST ${JSON.stringify({ channel: channelId, status: 'private' })}`);
            return true;
        case 'setmode':
            if (args && ws && isRoom) send(`RMO ${JSON.stringify({ channel: channelId, mode: args })}`);
            return true;
        case 'invite':
            if (args && ws && isRoom) send(`CIU ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'kick':
            if (args && ws && isRoom) send(`CKU ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'ban':
            if (args && ws && isRoom) send(`CBU ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'unban':
            if (args && ws && isRoom) send(`CUB ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'banlist':
            if (ws && isRoom) send(`CBL ${JSON.stringify({ channel: channelId })}`);
            return true;
        case 'op':
            if (args && ws && isRoom) send(`COA ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'deop':
            if (args && ws && isRoom) send(`COR ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'coplist':
            if (ws && isRoom) send(`COL ${JSON.stringify({ channel: channelId })}`);
            return true;
        case 'setowner':
            if (args && ws && isRoom) send(`CSO ${JSON.stringify({ channel: channelId, character: args })}`);
            return true;
        case 'setdescription':
            if (args && ws && isRoom) send(`CDS ${JSON.stringify({ channel: channelId, description: args })}`);
            return true;
        case 'getdescription':
            if (isRoom) {
                addConsoleLog(i18n.t("chatCommands.roomDescription", { desc: joinedChannels[channelId]?.description || i18n.t("chatCommands.none") }));
            }
            return true;
        case 'timeout':
            if (args && ws && isRoom) {
                const [char, time] = args.split(',').map(s => s.trim());
                send(`CTU ${JSON.stringify({ channel: channelId, character: char, length: parseInt(time) || 10 })}`);
            }
            return true;
        case 'warn':
            if (args && ws && isRoom) send(`MSG ${JSON.stringify({ channel: channelId, message: `[b][color=red]System:[/color] ${args}[/b]` })}`);
            return true;
        case 'roll':
            if (args && ws && isRoom) send(`RLL ${JSON.stringify({ channel: channelId, dice: args })}`);
            return true;
        case 'bottle':
            if (ws && isRoom) send(`RLL ${JSON.stringify({ channel: channelId, dice: 'bottle' })}`);
            return true;
        case 'clear':
            useChatStore.setState((state) => {
                if (isRoom) {
                    const room = state.joinedChannels[channelId];
                    return {
                        joinedChannels: { ...state.joinedChannels, [channelId]: { ...room, messages: [] } }
                    };
                }
                else {
                    return {
                        privateMessages: { ...state.privateMessages, [channelId]: [] }
                    };
                }
            });
            setSystemNotice(i18n.t("chatCommands.chatCleared")); 
        case 'clearall':
            useChatStore.setState((state) => {
                const clearedRooms = { ...state.joinedChannels };
                Object.keys(clearedRooms).forEach(k => clearedRooms[k].messages = []);
                return {
                    joinedChannels: clearedRooms, privateMessages: {}
                };
            });
            setSystemNotice(i18n.t("chatCommands.allChatsCleared")); 
        case 'code':
            if (isRoom) {
                const codeStr = `[session=${joinedChannels[channelId]?.title}]${channelId}[/session]`;
                Clipboard.setStringAsync(codeStr).catch(() => { }); 
                setSystemNotice(i18n.t("chatCommands.codeCopied"));
            }
            return true;
        case 'gkick':
            if (args && ws) send(`KIK ${JSON.stringify({ character: args })}`);
            return true;
        case 'gban':
            if (args && ws) send(`ACB ${JSON.stringify({ character: args })}`);
            return true;
        case 'gunban':
            if (args && ws) send(`UNB ${JSON.stringify({ character: args })}`);
            return true;
        case 'gtimeout':
            if (args && ws) {
                const [tchar, ttime, treason] = args.split(',').map(s => s.trim());
                send(`TMO ${JSON.stringify({ character: tchar, time: parseInt(ttime) || 10, reason: treason || '' })}`);
            }
            return true;
        case 'createchannel':
            if (args && ws) send(`CRC ${JSON.stringify({ channel: args })}`);
            return true;
        case 'killchannel':
            if (ws) send(`KIC ${JSON.stringify({ channel: args || channelId })}`);
            return true;
        case 'broadcast':
            if (args && ws) send(`BRO ${JSON.stringify({ message: args })}`);
            return true;
        case 'gop':
            if (ws) send(`AOP ${JSON.stringify({ character: args || channelId })}`);
            return true;
        case 'gdeop':
            if (ws) send(`DOP ${JSON.stringify({ character: args || channelId })}`);
            return true;
        case 'reload':
            if (args && ws) send(`RLD ${JSON.stringify({ save: args })}`);
            return true;
        case 'preview':
            setSystemNotice(i18n.t("chatCommands.usePreviewBtn"));
            return true;
        case 'who':
            setSystemNotice(i18n.t("chatCommands.useRightMenuMembers"));
            return true;
        case 'users':
            setSystemNotice(i18n.t("chatCommands.useRightMenuFriends"));
            return true;
        default:
            addConsoleLog(i18n.t("chatCommands.unknownCommand", { cmd }));
            return true;
    }
};