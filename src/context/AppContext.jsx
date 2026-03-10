// client/src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────
// Context globale: autenticazione, tema, KV status, toast
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { MOCK_USERS } from '@/data/users';

// ── Initial State ─────────────────────────────────────────────
const initialState = {
  auth: {
    user: null,          // { id, name, role, mat, dept, col }
    isLoading: false,
    error: null,
  },
  theme: localStorage.getItem('primed-theme') || 'light',
  kvStatus: 'idle',      // idle | loading | saving | saved | error
  toasts: [],            // [{ id, message, type, visible }]
  confirmDialog: null,   // { msg, onYes, onNo } | null
};

// ── Reducer ───────────────────────────────────────────────────
function reducer(state, action) {
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
      localStorage.setItem('primed-theme', action.payload);
      return { ...state, theme: action.payload };

    case 'SET_KV_STATUS':
      return { ...state, kvStatus: action.payload };

    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'TOAST_REMOVE':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    case 'CONFIRM_SHOW':
      return { ...state, confirmDialog: action.payload };

    case 'CONFIRM_HIDE':
      return { ...state, confirmDialog: null };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
const AppContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimers = useRef({});

  // ── Auth ──────────────────────────────────────────────────
  const login = useCallback(async (mat, password) => {
    dispatch({ type: 'AUTH_LOGIN_START' });

    // Simula latenza (rimuovere in produzione con vera API)
    await new Promise(r => setTimeout(r, 400));

    const user = MOCK_USERS.find(u => u.mat === mat && u.password === password);
    if (!user) {
      dispatch({ type: 'AUTH_LOGIN_ERROR', payload: 'Credenziali non valide.' });
      return false;
    }

    const { password: _pw, ...safeUser } = user; // non esporre password
    dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: safeUser });
    return true;
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  // ── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'TOAST_ADD', payload: { id, message, type, visible: true } });

    toastTimers.current[id] = setTimeout(() => {
      dispatch({ type: 'TOAST_REMOVE', payload: id });
      delete toastTimers.current[id];
    }, duration);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    dispatch({ type: 'TOAST_REMOVE', payload: id });
  }, []);

  // ── Confirm dialog ────────────────────────────────────────
  const confirm = useCallback((msg, onYes, onNo) => {
    dispatch({ type: 'CONFIRM_SHOW', payload: { msg, onYes, onNo } });
  }, []);

  const hideConfirm = useCallback(() => {
    dispatch({ type: 'CONFIRM_HIDE' });
  }, []);

  // ── Theme ─────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    const next = state.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: next });
  }, [state.theme]);

  // ── KV Status ─────────────────────────────────────────────
  const setKvStatus = useCallback((status) => {
    dispatch({ type: 'SET_KV_STATUS', payload: status });
  }, []);

  const value = {
    // State
    auth:          state.auth,
    theme:         state.theme,
    kvStatus:      state.kvStatus,
    toasts:        state.toasts,
    confirmDialog: state.confirmDialog,
    // Actions
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
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve essere usato dentro <AppProvider>');
  return ctx;
}
