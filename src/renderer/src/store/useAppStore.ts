import { create } from 'zustand';
import axios from 'axios';

interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  server: {
    queryInfo: (ip: string, port: number) => Promise<any>;
    queryPlayers: (ip: string, port: number) => Promise<any>;
    queryRules: (ip: string, port: number) => Promise<any>;
    launch: (config: any) => Promise<any>;
  };
  config: {
    read: () => Promise<any>;
    write: (data: any) => Promise<void>;
    selectPath: (type: 'file' | 'directory') => Promise<string | null>;
  };
}

declare global { interface Window { api: ElectronAPI; electronAPI: ElectronAPI; } }

export interface Server {
  ip: string; port: number; hostname: string; players: number; maxPlayers: number;
  mode: string; password: boolean; ping: number; isFavorite: boolean;
}

interface ServerDetails {
  version?: string; mapname?: string; lagcomp?: string;[key: string]: string | undefined;
}

interface AppConfig {
  nickname: string; gtaPath: string; winePrefix: string; wineBinary: string; launcherPath: string;
}

const getServerKey = (ip: string, port: number | string) => `${ip}:${port}`;

interface AppState {
  serverRegistry: Record<string, Server>;
  internetIds: string[];
  favoriteIds: string[];

  servers: Server[];
  currentTab: 'internet' | 'favorites';

  selectedServerId: string | null;
  selectedServerDetails: ServerDetails | null;
  playerList: any[];

  savedNicknames: Record<string, string>;
  config: AppConfig;
  isLoading: boolean;
  errorMsg: string | null;
  isJoinModalOpen: boolean;
  isAddModalOpen: boolean;

  getSelectedServer: () => Server | null;

  init: () => Promise<void>;
  setTab: (t: 'internet' | 'favorites') => void;
  fetchInternetList: () => Promise<void>;
  selectServer: (s: Server | null) => void;
  pingVisible: (start: number, end: number, force?: boolean) => void;
  toggleFavorite: (s: Server) => void;
  addFavorite: (address: string) => Promise<void>;
  updateConfig: (k: keyof AppConfig, v: string) => void;
  saveConfig: () => Promise<void>;
  launch: (password?: string, tempNick?: string) => Promise<void>;

  openJoinModal: () => void; closeJoinModal: () => void;
  openAddModal: () => void; closeAddModal: () => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  serverRegistry: {},
  internetIds: [],
  favoriteIds: [],
  servers: [],
  currentTab: 'favorites',
  selectedServerId: null,
  selectedServerDetails: null,
  playerList: [],
  savedNicknames: JSON.parse(localStorage.getItem('jmp_server_nicks') || '{}'),
  config: { nickname: 'Player', gtaPath: '', winePrefix: '', wineBinary: 'wine', launcherPath: '' },
  isLoading: false,
  errorMsg: null,
  isJoinModalOpen: false,
  isAddModalOpen: false,

  getSelectedServer: () => {
    const { selectedServerId, serverRegistry } = get();
    return selectedServerId ? serverRegistry[selectedServerId] || null : null;
  },

  init: async () => {
    if (!window.api) return;
    try {
      const c = await window.api.config.read();
      const nicks = JSON.parse(localStorage.getItem('jmp_server_nicks') || '{}');

      const favsRaw: Server[] = JSON.parse(localStorage.getItem('jmp_favs') || '[]');
      const registry: Record<string, Server> = {};
      const favIds: string[] = [];

      favsRaw.forEach(s => {
        const key = getServerKey(s.ip, s.port);
        registry[key] = { ...s, isFavorite: true, ping: -1 };
        favIds.push(key);
      });

      set({
        config: { ...get().config, ...c },
        savedNicknames: nicks,
        serverRegistry: registry,
        favoriteIds: favIds,
      });

      get().setTab('favorites');

    } catch (e) { console.error("Store init failed", e); }
  },

  setTab: (tab) => {
    set(state => {
      const ids = tab === 'internet' ? state.internetIds : state.favoriteIds;
      const viewList = ids.map(id => state.serverRegistry[id]).filter(Boolean);

      return {
        currentTab: tab,
        selectedServerId: null,
        playerList: [],
        selectedServerDetails: null,
        servers: viewList
      };
    });

    if (tab === 'internet' && get().internetIds.length === 0) {
      get().fetchInternetList();
    } else {
      get().pingVisible(0, 15, false);
    }
  },

  fetchInternetList: async () => {
    set({ isLoading: true });
    try {
      const { data } = await axios.get('https://api.open.mp/servers');

      set(state => {
        const newRegistry = { ...state.serverRegistry };
        const newInternetIds: string[] = [];

        data.forEach((s: any) => {
          const [ip, p] = (s.ip || '').split(':');
          const port = parseInt(p || s.port || '7777');
          const key = getServerKey(ip, port);

          if (newRegistry[key]) {
            newRegistry[key] = {
              ...newRegistry[key],
              hostname: s.hn || newRegistry[key].hostname,
              players: s.pc ?? newRegistry[key].players,
              maxPlayers: s.pm ?? newRegistry[key].maxPlayers,
              mode: s.gm || newRegistry[key].mode,
              password: s.pa || newRegistry[key].password
            };
          } else {
            newRegistry[key] = {
              ip, port,
              hostname: s.hn || 'Unknown',
              players: s.pc || 0, maxPlayers: s.pm || 0,
              mode: s.gm || '-',
              password: s.pa || false,
              ping: -1,
              isFavorite: false
            };
          }
          newInternetIds.push(key);
        });

        const nextState = {
          serverRegistry: newRegistry,
          internetIds: newInternetIds,
          isLoading: false
        };

        if (state.currentTab === 'internet') {
          const viewList = newInternetIds.map(id => newRegistry[id]);
          return { ...nextState, servers: viewList };
        }

        return nextState;
      });

      get().pingVisible(0, 15, false);

    } catch (e) {
      set({ isLoading: false });
    }
  },

  selectServer: async (s) => {
    if (!s) {
      set({ selectedServerId: null, playerList: [], selectedServerDetails: null });
      return;
    }

    const key = getServerKey(s.ip, s.port);
    set({ selectedServerId: key, playerList: [], selectedServerDetails: null });

    if (window.api) {
      try {
        const [players, rules] = await Promise.all([
          window.api.server.queryPlayers(s.ip, s.port).catch(() => []),
          window.api.server.queryRules(s.ip, s.port).catch(() => ({}))
        ]);

        if (get().selectedServerId === key) {
          set({
            playerList: Array.isArray(players) ? players : [],
            selectedServerDetails: rules && typeof rules === 'object' ? rules : {}
          });
        }
      } catch (e) { console.error("Details fetch error", e); }
    }
  },

  pingVisible: (start, end, force = false) => {
    const { servers } = get();
    if (!window.api) return;

    const safeStart = Math.max(0, start);
    const safeEnd = Math.min(end, servers.length - 1);
    const subset = servers.slice(safeStart, safeEnd + 1);

    subset.forEach(async (srv) => {
      if (!force && srv.ping !== -1) return;

      try {
        const info = await window.api.server.queryInfo(srv.ip, srv.port);
        if (info) {
          const key = getServerKey(srv.ip, srv.port);

          set(state => {
            const currentObj = state.serverRegistry[key];
            if (!currentObj) return {};

            const updatedRegistry = {
              ...state.serverRegistry,
              [key]: { ...currentObj, ...info }
            };

            const ids = state.currentTab === 'internet' ? state.internetIds : state.favoriteIds;
            const newServers = ids.map(id => updatedRegistry[id]).filter(Boolean);

            return { serverRegistry: updatedRegistry, servers: newServers };
          });
        }
      } catch (e) { }
    });
  },

  toggleFavorite: (s) => {
    const key = getServerKey(s.ip, s.port);

    set(state => {
      const isFav = state.favoriteIds.includes(key);
      const newFavIds = isFav
        ? state.favoriteIds.filter(id => id !== key)
        : [...state.favoriteIds, key];

      const updatedRegistry = {
        ...state.serverRegistry,
        [key]: { ...state.serverRegistry[key], isFavorite: !isFav }
      };

      const favsToSave = newFavIds.map(id => updatedRegistry[id]);
      localStorage.setItem('jmp_favs', JSON.stringify(favsToSave));

      const ids = state.currentTab === 'internet' ? state.internetIds : newFavIds;
      const newServers = ids.map(id => updatedRegistry[id]).filter(Boolean);

      return {
        serverRegistry: updatedRegistry,
        favoriteIds: newFavIds,
        servers: newServers
      };
    });
  },

  addFavorite: async (address: string) => {
    let [ip, portStr] = address.split(':');
    if (!ip) return;
    let port = parseInt(portStr || '7777') || 7777;
    const key = getServerKey(ip, port);

    const { favoriteIds } = get();
    if (favoriteIds.includes(key)) {
      set({ errorMsg: "Server already in favorites." });
      return;
    }

    let info = { hostname: address, players: 0, maxPlayers: 0, mode: '-', password: false };
    try {
      if (window.api) {
        const res = await window.api.server.queryInfo(ip, port);
        if (res) info = res;
      }
    } catch { }

    set(state => {
      const existing = state.serverRegistry[key];
      const newObj: Server = existing
        ? { ...existing, isFavorite: true }
        : { ip, port, ...info, ping: -1, isFavorite: true };

      const newRegistry = { ...state.serverRegistry, [key]: newObj };
      const newFavIds = [...state.favoriteIds, key];

      const favsToSave = newFavIds.map(id => newRegistry[id]);
      localStorage.setItem('jmp_favs', JSON.stringify(favsToSave));

      const ids = state.currentTab === 'internet' ? state.internetIds : newFavIds;
      const newServers = ids.map(id => newRegistry[id]).filter(Boolean);

      return {
        serverRegistry: newRegistry,
        favoriteIds: newFavIds,
        servers: newServers
      };
    });

    if (get().currentTab === 'favorites') get().pingVisible(0, get().favoriteIds.length, false);
  },

  updateConfig: (k, v) => set(s => ({ config: { ...s.config, [k]: v } })),
  saveConfig: async () => { if (window.api) await window.api.config.write(get().config); },

  launch: async (password, tempNick) => {
    const s = get().getSelectedServer();
    if (!s || !window.api) return;

    const { config, savedNicknames } = get();
    if (!config.gtaPath) {
      set({ errorMsg: "GTA Path not set." });
      return;
    }

    const key = getServerKey(s.ip, s.port);
    const finalNick = tempNick || savedNicknames[key] || config.nickname;

    const newNicks = { ...savedNicknames, [key]: finalNick };
    localStorage.setItem('jmp_server_nicks', JSON.stringify(newNicks));
    set({ savedNicknames: newNicks });

    const res = await window.api.server.launch({
      ...config, username: finalNick, ip: s.ip, port: s.port, password: password || ''
    });

    if (!res.success) set({ errorMsg: res.msg || "Launch failed." });
  },

  openJoinModal: () => set({ isJoinModalOpen: true }),
  closeJoinModal: () => set({ isJoinModalOpen: false }),
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  clearError: () => set({ errorMsg: null }),
}));