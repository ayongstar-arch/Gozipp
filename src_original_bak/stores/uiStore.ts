import { create } from 'zustand';

type AppTab = 'HOME' | 'WALLET' | 'HISTORY' | 'ACTIVITY' | 'PROFILE';

interface UIState {
  activeTab: AppTab;
  showTopupModal: boolean;
  showChatModal: boolean;
  toastMessage: string | null;
  isLoading: boolean;
  
  setActiveTab: (tab: AppTab) => void;
  setShowTopupModal: (show: boolean) => void;
  setShowChatModal: (show: boolean) => void;
  setToastMessage: (msg: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'HOME',
  showTopupModal: false,
  showChatModal: false,
  toastMessage: null,
  isLoading: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setShowTopupModal: (showTopupModal) => set({ showTopupModal }),
  setShowChatModal: (showChatModal) => set({ showChatModal }),
  setToastMessage: (toastMessage) => {
    set({ toastMessage });
    if (toastMessage) {
      setTimeout(() => set({ toastMessage: null }), 3000);
    }
  },
  setIsLoading: (isLoading) => set({ isLoading }),
}));
