import { AppState, CartItem } from '../types';
import { INITIAL_MENU } from '../constants';

const STORAGE_KEY = 'sakshi_dhaba_data_v3';
const SESSION_KEY = 'sakshi_dhaba_session_v1';

const DEFAULT_STATE: AppState = {
  menu: INITIAL_MENU,
  bills: [],
  customers: [],
};

export interface SessionState {
  cart: CartItem[];
  tableNo: string;
  kitchenNote: string;
  customerName: string;
  customerPhone: string;
}

const DEFAULT_SESSION: SessionState = {
  cart: [],
  tableNo: '',
  kitchenNote: '',
  customerName: '',
  customerPhone: ''
};

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return DEFAULT_STATE;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Could not load state", err);
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state", err);
  }
};

// New: Session Persistence (for Cart across tabs/reloads)
export const loadSession = (): SessionState => {
  try {
    const serialized = localStorage.getItem(SESSION_KEY);
    if (serialized === null) return DEFAULT_SESSION;
    return JSON.parse(serialized);
  } catch (err) {
    return DEFAULT_SESSION;
  }
};

export const saveSession = (session: SessionState) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error("Could not save session", err);
  }
};