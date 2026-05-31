import { create } from 'zustand';

interface Transaction {
  id: number | string;
  type: 'RIDE' | 'TOPUP' | 'BONUS';
  title: string;
  amount: number;
  date: string;
  time: string;
  month: string;
  details?: any;
}

interface WalletState {
  balance: number;
  history: Transaction[];
  
  setBalance: (balance: number) => void;
  setHistory: (history: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  history: [],

  setBalance: (balance) => set({ balance }),
  setHistory: (history) => set({ history }),
  addTransaction: (tx) => set((state) => ({ 
    history: [tx, ...state.history],
    balance: state.balance + tx.amount 
  })),
}));
