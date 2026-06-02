import { create } from 'zustand';

type PaymentsTab = 'overview' | 'all-incoming' | 'tagging';

interface PaymentsTabStore {
  activeTab: PaymentsTab;
  setActiveTab: (tab: PaymentsTab) => void;
  resetTab: () => void;
}

export const usePaymentsTabStore = create<PaymentsTabStore>((set) => ({
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  resetTab: () => set({ activeTab: 'overview' }),
}));
