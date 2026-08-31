# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. This project is Expo SDK 57 (RN 0.86, React 18, TS strict) — APIs differ from older SDKs.

## Commands

- `npm start` — runs `expo start --dev-client`. Requires a dev client build; **Expo Go will not work** (native plugins: expo-sqlite, expo-notifications).
- `npm run android` — `expo run:android` against the committed `android/` native project (prebuild output; regenerate with `npx expo prebuild`).
- Typecheck: `npx tsc --noEmit`. There are no lint or test scripts.
- Releases: EAS (`eas.json`) — `development` (dev client), `preview`/`production` (Android APK).

## Typecheck baseline is red (pre-existing)

`npx tsc --noEmit` fails before any change. Known pre-existing errors — don't attribute them to your change:

- `drizzle.config.ts` and `src/database/schema.ts` are dead code; drizzle-orm/drizzle-kit are not installed. Never build on them — the real DB layer is raw SQL (below).
- `BackupScreen`, `ExportScreen`, `ReportsScreen` use the old `expo-file-system` API (`documentDirectory`, `cacheDirectory`). In SDK 57 that API moved to `expo-file-system/legacy`; the main entry is the new File/Directory API.
- `src/screens/LoginScreen.tsx` is dead code (not in the navigator; references the removed `pin` field).

## Database (read before touching data)

- Source of truth: raw expo-sqlite in `src/database/db.ts` (schema + migrations) and `src/database/queries.ts` (all SQL). Zustand (`src/store/useStore.ts`) is hydrated from SQLite at startup.
- `CREATE TABLE IF NOT EXISTS` in `createBaseSchema` only runs on fresh installs. Any schema change must ALSO be appended as a versioned migration in `MIGRATIONS` (`PRAGMA user_version`-tracked, guarded with `columnExists`, additive/idempotent) or existing devices will never get it.
- DB opens with WAL, `busy_timeout`, and `foreign_keys = ON`.

## Conventions

- Navigation is React Navigation v6 (native stack + bottom tabs), not expo-router.
- Single-operator app: no login/PIN. Flow is Splash → MainTabs (Dashboard, Machines, CashRegister, Products, Settings).
- User-facing strings are Portuguese; keep them that way.
