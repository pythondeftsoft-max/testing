import { create } from 'zustand';

type PaymentTaggingTab = 'untagged' | 'tagged' | 'rules';

interface PaymentTaggingTabStore {
  activeTab: PaymentTaggingTab;
  setActiveTab: (tab: PaymentTaggingTab) => void;
  resetTab: () => void;
}

export const usePaymentTaggingTabStore = create<PaymentTaggingTabStore>((set) => ({
  activeTab: 'untagged',
  setActiveTab: (tab) => set({ activeTab: tab }),
  resetTab: () => set({ activeTab: 'untagged' }),
}));
