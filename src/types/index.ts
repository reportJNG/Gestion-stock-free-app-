import type { ElectronApi } from '../../electron/preload';

export interface User {
  id: number;
  name: string;
  type: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
