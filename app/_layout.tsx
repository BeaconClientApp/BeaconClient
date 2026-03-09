import { Stack } from "expo-router";
import notifee from '@notifee/react-native';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import '../i18n';

let backgroundPingTimeout: ReturnType<typeof setTimeout> | null = null;
let stopCurrentService: (() => void) | null = null;

notifee.registerForegroundService((notification) => {
  return new Promise((resolve) => {
    
    if (backgroundPingTimeout) clearTimeout(backgroundPingTimeout);
    if (stopCurrentService) stopCurrentService();

    stopCurrentService = () => {
        if (backgroundPingTimeout) clearTimeout(backgroundPingTimeout);
        backgroundPingTimeout = null;
        resolve();
    };

    (global as any).killForegroundPing = stopCurrentService;

    const sendPing = () => {
        const state = useChatStore.getState();
        const settings = useSettingsStore.getState();
        
        if (!settings.globalSettings.keepSocketAlive || !state.isWsConnected || !state.ws) {
            if (stopCurrentService) stopCurrentService();
            return;
        }

        try {
            if (state.ws.readyState === WebSocket.OPEN) {
                state.ws.send('PIN');
            }
        } catch {}

        backgroundPingTimeout = setTimeout(sendPing, 25000);
    };

    sendPing();
  });
});

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}