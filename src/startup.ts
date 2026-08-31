import { initializeDatabase } from "./database/db";
import { getMachinesFromDb } from "./database/queries";
import { seedDatabase } from "./database/seed";
import { rearmSessionNotifications } from "./notifications";
import { useStore } from "./store/useStore";

/**
 * Ordered app bootstrap: schema + migrations -> first-run seed -> store
 * hydration -> session notifications. The UI stays behind the native splash
 * until this resolves (see App.tsx), so no screen ever renders against an
 * empty/uninitialized store.
 *
 * Throws if the database cannot be initialized; App.tsx surfaces that as a
 * retry screen instead of a silently broken UI.
 */
export async function bootstrapApp(): Promise<void> {
  await initializeDatabase();

  if (getMachinesFromDb().length === 0) {
    seedDatabase();
  }

  useStore.getState().hydrateStore();

  // Best-effort: re-arm alerts for sessions still active across app restarts.
  // Never block startup or fail the launch if notifications are unavailable.
  rearmSessionNotifications().catch((error) => {
    console.warn("Session notification bootstrap failed:", error);
  });
}
