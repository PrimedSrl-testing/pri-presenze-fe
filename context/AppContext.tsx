// src/context/AppContext.tsx
'use client';

import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { MOCK_USERS, type MockUser } from '@/data/users';

// ── Types ──────────────────────────────────────────────────────
export type UserRole = 'dip' | 'mgr' | 'hr' | 'dir' | 'prod';
export type Theme = 'light' | 'dark';
export type KvStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
export type ToastType = 'ok' | 'error' | 'warn' | 'info';

export interface AuthUser {
  id: string;
  mat: string;
  name: string;
  full: string;
  ini: string;
  role: UserRole;
  dept: string;
  ruolo: string;
  col: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ConfirmDialog {
  msg: string;
  onYes?: () => void;
  onNo?: () => void;
}

interface AppState {
  auth: AuthState;
  theme: Theme;
  kvStatus: KvStatus;
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;
}

type AppAction =
  | { type: 'AUTH_LOGIN_START' }
  | { type: 'AUTH_LOGIN_SUCCESS'; payload: AuthUser }
  | { type: 'AUTH_LOGIN_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_KV_STATUS'; payload: KvStatus }
  | { type: 'TOAST_ADD'; payload: Toast }
  | { type: 'TOAST_REMOVE'; payload: string }
  | { type: 'CONFIRM_SHOW'; payload: ConfirmDialog }
  | { type: 'CONFIRM_HIDE' };

// ── Initial State ──────────────────────────────────────────────
const initialState: AppState = {
  auth: { user: null, isLoading: false, error: null },
  theme: 'light', // aggiornato da localStorage in useEffect
  kvStatus: 'idle',
  toasts: [],
  confirmDialog: null,
};

// ── Reducer ───────────────────────────────────────────────────
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'AUTH_LOGIN_START':
      return { ...state, auth: { ...state.auth, isLoading: true, error: null } };
    case 'AUTH_LOGIN_SUCCESS':
      return { ...state, auth: { user: action.payload, isLoading: false, error: null } };
    case 'AUTH_LOGIN_ERROR':
      return { ...state, auth: { user: null, isLoading: false, error: action.payload } };
    case 'AUTH_LOGOUT':
      return { ...state, auth: initialState.auth };
    case 'SET_THEME':
      if (typeof window !== 'undefined') {
        localStorage.setItem('primed-theme', action.payload);
      }
      return { ...state, theme: action.payload };
    case 'SET_KV_STATUS':
      return { ...state, kvStatus: action.payload };
    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'TOAST_REMOVE':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case 'CONFIRM_SHOW':
      return { ...state, confirmDialog: action.payload };
    case 'CONFIRM_HIDE':
      return { ...state, confirmDialog: null };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
interface AppContextValue {
  auth: AuthState;
  theme: Theme;
  kvStatus: KvStatus;
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;
  login: (mat: string, password: string) => Promise<boolean>;
  logout: () => void;
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  hideToast: (id: string) => void;
  confirm: (msg: string, onYes?: () => void, onNo?: () => void) => void;
  hideConfirm: () => void;
  toggleTheme: () => void;
  setKvStatus: (status: KvStatus) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Ripristina tema da localStorage dopo il mount (client only)
  useEffect(() => {
    const saved = localStorage.getItem('primed-theme') as Theme | null;
    if (saved && saved !== state.theme) {
      dispatch({ type: 'SET_THEME', payload: saved });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (mat: string, password: string): Promise<boolean> => {
    dispatch({ type: 'AUTH_LOGIN_START' });
    await new Promise((r) => setTimeout(r, 400));
    const user = MOCK_USERS.find((u) => u.mat === mat && u.password === password);
    if (!user) {
      dispatch({ type: 'AUTH_LOGIN_ERROR', payload: 'Credenziali non valide.' });
      return false;
    }
    const { password: _pw, ...safeUser } = user as MockUser;
    dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: safeUser as AuthUser });
    return true;
  }, []);

  const logout = useCallback(() => dispatch({ type: 'AUTH_LOGOUT' }), []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'TOAST_ADD', payload: { id, message, type, visible: true } });
    toastTimers.current[id] = setTimeout(() => {
      dispatch({ type: 'TOAST_REMOVE', payload: id });
      delete toastTimers.current[id];
    }, duration);
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    dispatch({ type: 'TOAST_REMOVE', payload: id });
  }, []);

  const confirm = useCallback((msg: string, onYes?: () => void, onNo?: () => void) => {
    dispatch({ type: 'CONFIRM_SHOW', payload: { msg, onYes, onNo } });
  }, []);

  const hideConfirm = useCallback(() => dispatch({ type: 'CONFIRM_HIDE' }), []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  }, [state.theme]);

  const setKvStatus = useCallback((status: KvStatus) => {
    dispatch({ type: 'SET_KV_STATUS', payload: status });
  }, []);

  const value: AppContextValue = {
    auth: state.auth,
    theme: state.theme,
    kvStatus: state.kvStatus,
    toasts: state.toasts,
    confirmDialog: state.confirmDialog,
    login,
    logout,
    showToast,
    hideToast,
    confirm,
    hideConfirm,
    toggleTheme,
    setKvStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve essere usato dentro <AppProvider>');
  return ctx;
}
