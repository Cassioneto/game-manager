import { create } from "zustand";
import { Machine, Session, CashRegister, User, Game } from "../types";
import { 
  getMachinesFromDb, insertMachineInDb, updateMachineInDb, deleteMachineFromDb,
  getGamesFromDb, insertGameInDb, updateGameInDb, deleteGameFromDb,
  getOpenCashRegisterFromDb, getActiveSessionsFromDb, updateSessionInDb
} from "../database/queries";

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeSessions: Session[];
  setActiveSessions: (sessions: Session[]) => void;
  addActiveSession: (session: Session) => void;
  updateActiveSession: (id: number, updates: Partial<Session>) => void;
  removeActiveSession: (id: number) => void;
  openCashRegister: CashRegister | null;
  setOpenCashRegister: (cashRegister: CashRegister | null) => void;
  machines: Machine[];
  setMachines: (machines: Machine[]) => void;
  addMachine: (machine: Omit<Machine, "id">) => void;
  updateMachine: (id: number, updates: Partial<Omit<Machine, "id">>) => void;
  removeMachine: (id: number) => void;
  games: Game[];
  setGames: (games: Game[]) => void;
  addGame: (game: Omit<Game, "id">) => void;
  updateGame: (id: number, updates: Partial<Omit<Game, "id">>) => void;
  removeGame: (id: number) => void;
  hydrateStore: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  activeSessions: [],
  setActiveSessions: (sessions) => set({ activeSessions: sessions }),
  addActiveSession: (session) => set((state) => ({ activeSessions: [...state.activeSessions, session] })),
  updateActiveSession: (id, updates) => {
    updateSessionInDb(id, updates);
    set((state) => ({
      activeSessions: state.activeSessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  },
  removeActiveSession: (id) =>
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== id),
    })),
  openCashRegister: null,
  setOpenCashRegister: (cashRegister) => set({ openCashRegister: cashRegister }),
  machines: [],
  setMachines: (machines) => set({ machines }),
  addMachine: (machine) => {
    const newMachine = insertMachineInDb(machine);
    set((state) => ({
      machines: [...state.machines, newMachine],
    }));
  },
  updateMachine: (id, updates) => {
    updateMachineInDb(id, updates);
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    }));
  },
  removeMachine: (id) => {
    deleteMachineFromDb(id);
    set((state) => ({
      machines: state.machines.filter((m) => m.id !== id),
    }));
  },
  games: [],
  setGames: (games) => set({ games }),
  addGame: (game) => {
    const newGame = insertGameInDb(game);
    set((state) => ({
      games: [...state.games, newGame],
    }));
  },
  updateGame: (id, updates) => {
    updateGameInDb(id, updates);
    set((state) => ({
      games: state.games.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },
  removeGame: (id) => {
    deleteGameFromDb(id);
    set((state) => ({ games: state.games.filter((g) => g.id !== id) }));
  },
  hydrateStore: () => {
    const machines = getMachinesFromDb();
    const games = getGamesFromDb();
    const openCashRegister = getOpenCashRegisterFromDb();
    const activeSessions = getActiveSessionsFromDb();

    set({
      machines,
      games,
      openCashRegister,
      activeSessions,
      currentUser: { id: 1, nome: "Administrador", perfil: "gerente" } // Single-user app: no login/PIN
    });
  }
}));
