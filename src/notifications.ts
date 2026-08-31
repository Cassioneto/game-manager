import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useStore } from './store/useStore';

// Local notification identifiers per session, so they can be cancelled when a
// session is extended or ended. This is in-memory only: on app restart we
// cancel everything and reschedule fresh from the sessions that are still
// active in the database (see rescheduleAllActiveSessionNotifications below),
// so nothing needs to be persisted to disk.
const scheduledIds: Record<number, { warning?: string; expired?: string }> = {};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sessions', {
      name: 'Sessões Ativas',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelSessionNotifications(sessionId: number) {
  const ids = scheduledIds[sessionId];
  if (!ids) return;
  if (ids.warning) await Notifications.cancelScheduledNotificationAsync(ids.warning).catch(() => {});
  if (ids.expired) await Notifications.cancelScheduledNotificationAsync(ids.expired).catch(() => {});
  delete scheduledIds[sessionId];
}

/**
 * Schedules the "5 minutes left" and "time's up" alerts for a timed session so
 * they still fire even if the app is backgrounded or the screen is locked
 * (RNF-08). Safe to call again after extending a session — it cancels any
 * previous alerts for this session first.
 */
export async function scheduleSessionEndNotifications(
  sessionId: number,
  machineName: string,
  fimPrevisto: number
) {
  await cancelSessionNotifications(sessionId);

  const secondsUntilEnd = Math.round((fimPrevisto - Date.now()) / 1000);
  if (secondsUntilEnd <= 0) return;

  const ids: { warning?: string; expired?: string } = {};

  if (secondsUntilEnd > 300) {
    ids.warning = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tempo quase a acabar',
        body: `Faltam 5 minutos na ${machineName}.`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilEnd - 300,
      },
    });
  }

  ids.expired = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tempo esgotado',
      body: `O tempo da ${machineName} terminou.`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilEnd,
    },
  });

  scheduledIds[sessionId] = ids;
}

export async function cancelSessionEndNotifications(sessionId: number) {
  await cancelSessionNotifications(sessionId);
}

/**
 * Called once on app start (after hydrating active sessions from SQLite).
 * Clears any stale scheduled notifications from a previous app run and
 * reschedules fresh ones for whatever sessions are still active with a
 * future end time — this is what keeps alerts correct across app restarts,
 * device reboots, or the app being killed and relaunched.
 */
export async function rescheduleAllActiveSessionNotifications(
  activeSessions: { id: number; fimPrevisto?: number }[],
  machineNameById: Record<number, string>,
  machineIdBySessionId: Record<number, number>
) {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  for (const key of Object.keys(scheduledIds)) delete scheduledIds[Number(key)];

  for (const session of activeSessions) {
    if (!session.fimPrevisto) continue;
    const machineId = machineIdBySessionId[session.id];
    const machineName = machineNameById[machineId] || 'máquina';
    await scheduleSessionEndNotifications(session.id, machineName, session.fimPrevisto);
  }
}

/**
 * One-shot startup entry point (called after the store has been hydrated from
 * SQLite): configures the channel, asks for permission and re-arms alerts for
 * every session still active in the database.
 */
export async function rearmSessionNotifications() {
  await configureNotifications();
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const { activeSessions, machines } = useStore.getState();
  const machineNameById: Record<number, string> = {};
  for (const m of machines) machineNameById[m.id] = m.nome;
  const machineIdBySessionId: Record<number, number> = {};
  for (const s of activeSessions) machineIdBySessionId[s.id] = s.machineId;

  await rescheduleAllActiveSessionNotifications(activeSessions, machineNameById, machineIdBySessionId);
}
