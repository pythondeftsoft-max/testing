import { create } from 'zustand';

export type ProcessingStage = 'field-mapping' | 'address-validation' | 'duplicate-detection' | 'quality-assessment' | 'ai-insights';

export type RowFilter = 'all' | 'success' | 'warning' | 'failed' | 'duplicates';

interface ImportStudioState {
  // UI State
  activeStage: ProcessingStage;
  selectedRowIds: Set<number>;
  rowFilter: RowFilter;
  inspectorCollapsed: boolean;

  // Popout States
  popouts: {
    pipeline: boolean;
    dataGrid: boolean;
    inspector: boolean;
    qualityMetrics: boolean;
  };
  
  // Stage metrics (computed from results)
  stageMetrics: Record<ProcessingStage, {
    total: number;
    completed: number;
    issues: number;
  }>;
  
  // Session persistence
  sessionData: {
    sessionId?: string;
    lastSaved?: number;
    isDirty: boolean;
  };
  
  // Quality monitoring
  qualityTrends: {
    timestamp: number;
    successRate: number;
    completenessScore: number;
    accuracyScore: number;
  }[];
  
  // Actions
  setActiveStage: (stage: ProcessingStage) => void;
  toggleRowSelection: (rowId: number) => void;
  selectRows: (rowIds: number[]) => void;
  clearSelection: () => void;
  setRowFilter: (filter: RowFilter) => void;
  toggleInspector: () => void;
  setPopoutOpen: (popout: keyof ImportStudioState['popouts'], open: boolean) => void;
  togglePopout: (popout: keyof ImportStudioState['popouts']) => void;
  updateStageMetrics: (metrics: ImportStudioState['stageMetrics']) => void;
  
  // Session management
  setSessionData: (data: Partial<ImportStudioState['sessionData']>) => void;
  
  // Computed getters for session
  get sessionId(): string | undefined;
  markDirty: () => void;
  markClean: () => void;
  
  // Quality tracking
  addQualitySnapshot: (snapshot: { successRate: number; completenessScore: number; accuracyScore: number }) => void;
  
  // Computed getters
  getSelectedCount: () => number;
  hasSelection: () => boolean;
}

export const useImportStudio = create<ImportStudioState>((set, get) => ({
  // Initial state
  activeStage: 'field-mapping',
  selectedRowIds: new Set(),
  rowFilter: 'all',
  inspectorCollapsed: false,
  popouts: {
    pipeline: false,
    dataGrid: false,
    inspector: false,
    qualityMetrics: false,
  },
  stageMetrics: {
    'field-mapping': { total: 0, completed: 0, issues: 0 },
    'address-validation': { total: 0, completed: 0, issues: 0 },
    'duplicate-detection': { total: 0, completed: 0, issues: 0 },
    'quality-assessment': { total: 0, completed: 0, issues: 0 },
    'ai-insights': { total: 0, completed: 0, issues: 0 },
  },
  sessionData: {
    isDirty: false,
  },
  qualityTrends: [],
  
  // Actions
  setActiveStage: (stage) => set({ activeStage: stage }),
  
  toggleRowSelection: (rowId) => set((state) => {
    const newSelected = new Set(state.selectedRowIds);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    return { selectedRowIds: newSelected };
  }),
  
  selectRows: (rowIds) => set({ selectedRowIds: new Set(rowIds) }),
  
  clearSelection: () => set({ selectedRowIds: new Set() }),
  
  setRowFilter: (filter) => set({ rowFilter: filter }),
  
  toggleInspector: () => set((state) => ({
    inspectorCollapsed: !state.inspectorCollapsed
  })),

  setPopoutOpen: (popout, open) => set((state) => ({
    popouts: { ...state.popouts, [popout]: open }
  })),

  togglePopout: (popout) => set((state) => ({
    popouts: { ...state.popouts, [popout]: !state.popouts[popout] }
  })),
  
  updateStageMetrics: (metrics) => set({ stageMetrics: metrics }),
  
  // Session management
  setSessionData: (data) => set((state) => ({
    sessionData: { ...state.sessionData, ...data }
  })),
  
  markDirty: () => set((state) => ({
    sessionData: { ...state.sessionData, isDirty: true }
  })),
  
  markClean: () => set((state) => ({
    sessionData: { ...state.sessionData, isDirty: false, lastSaved: Date.now() }
  })),
  
  // Quality tracking
  addQualitySnapshot: (snapshot) => set((state) => ({
    qualityTrends: [
      ...state.qualityTrends.slice(-20), // Keep last 20 snapshots
      { ...snapshot, timestamp: Date.now() }
    ]
  })),
  
    // Computed getters
    getSelectedCount: () => get().selectedRowIds.size,
    hasSelection: () => get().selectedRowIds.size > 0,
    get sessionId() {
      return get().sessionData.sessionId;
    },
}));