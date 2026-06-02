import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTourConfig, type TourVariant } from './tours';

const TOUR_STORAGE_KEY_PM = 'openkey_tour_state';
const TOUR_STORAGE_KEY_LISTING = 'openkey_tour_state_listing';

const storageKeyFor = (variant: TourVariant) =>
  variant === 'listing' ? TOUR_STORAGE_KEY_LISTING : TOUR_STORAGE_KEY_PM;

const completionColumnFor = (variant: TourVariant) =>
  variant === 'listing' ? 'has_completed_landlord_listing_tour' : 'has_completed_landlord_tour';

interface TourState {
  currentStep: number;
  isRunning: boolean;
  page: 'portfolio' | 'dashboard';
  variant: TourVariant;
}

interface UseTourStateReturn {
  shouldAutoStartTour: boolean;
  currentStep: number;
  isRunning: boolean;
  totalSteps: number;
  variant: TourVariant;
  startTour: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  skipTour: () => void;
  stopTour: () => void;
  isLoading: boolean;
}

function readStoredTourState(variant: TourVariant): TourState | null {
  const stored = localStorage.getItem(storageKeyFor(variant));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TourState;
  } catch {
    localStorage.removeItem(storageKeyFor(variant));
    return null;
  }
}

export function useTourState(
  page: 'portfolio' | 'dashboard',
  variant: TourVariant = 'pm'
): UseTourStateReturn {
  const config = useMemo(() => getTourConfig(variant), [variant]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean | null>(null);
  const [tourState, setTourState] = useState<TourState | null>(() => readStoredTourState(variant));

  const isRunning = useMemo(() => {
    if (!tourState?.isRunning) return false;
    if (tourState.variant !== variant) return false;
    if (tourState.page === page) return true;
    if (page === 'dashboard' && tourState.page === 'portfolio') return true;
    return false;
  }, [tourState, page, variant]);

  const shouldAutoStartTour = useMemo(() => {
    return !isLoading &&
      hasCompletedTour === false &&
      !tourState?.isRunning &&
      page === 'portfolio';
  }, [isLoading, hasCompletedTour, tourState?.isRunning, page]);

  const persistState = useCallback((state: TourState) => {
    localStorage.setItem(storageKeyFor(variant), JSON.stringify(state));
    setTourState(state);
  }, [variant]);

  const startTour = useCallback(() => {
    const initialStep = page === 'portfolio' ? 0 : config.dashboardOffset;
    persistState({ currentStep: initialStep, isRunning: true, page, variant });
  }, [page, variant, config.dashboardOffset, persistState]);

  const setStep = useCallback((step: number) => {
    persistState({ currentStep: step, isRunning: true, page, variant });
  }, [page, variant, persistState]);

  const updateDatabaseCompletion = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const column = completionColumnFor(variant);
      await supabase
        .from('profiles')
        .update({ [column]: true } as any)
        .eq('id', user.id);
    } catch (err) {
      console.error('Error updating tour completion:', err);
    }
  }, [variant]);

  const completeTour = useCallback(async () => {
    localStorage.removeItem(storageKeyFor(variant));
    setTourState(null);
    setHasCompletedTour(true);
    await updateDatabaseCompletion();
  }, [variant, updateDatabaseCompletion]);

  const skipTour = useCallback(async () => {
    localStorage.removeItem(storageKeyFor(variant));
    setTourState(null);
    setHasCompletedTour(true);
    await updateDatabaseCompletion();
  }, [variant, updateDatabaseCompletion]);

  const stopTour = useCallback(() => {
    localStorage.removeItem(storageKeyFor(variant));
    setTourState(null);
  }, [variant]);

  const nextStep = useCallback(() => {
    const current = tourState?.currentStep ?? 0;
    const next = current + 1;
    if (next >= config.totalSteps) {
      completeTour();
    } else {
      setStep(next);
    }
  }, [tourState?.currentStep, setStep, completeTour, config.totalSteps]);

  const prevStep = useCallback(() => {
    const current = tourState?.currentStep ?? 0;
    if (current > 0) setStep(current - 1);
  }, [tourState?.currentStep, setStep]);

  // Fetch completion from DB
  useEffect(() => {
    let cancelled = false;
    async function fetchTourStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        const column = completionColumnFor(variant);
        const { data, error } = await supabase
          .from('profiles')
          .select(column)
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          // If the column doesn't exist (listing tour column not yet migrated),
          // default to completed = true for safety so we never spam an unconfigured tour.
          console.warn('[useTourState] completion fetch failed for', column, error.message);
          setHasCompletedTour(true);
        } else {
          setHasCompletedTour(((data as any)?.[column] ?? false) as boolean);
        }
      } catch (err) {
        if (!cancelled) setHasCompletedTour(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchTourStatus();
    return () => { cancelled = true; };
  }, [variant]);

  // Sync from localStorage on page changes
  useEffect(() => {
    const storedState = readStoredTourState(variant);
    if (storedState && storedState.isRunning) {
      if (!tourState || tourState.currentStep !== storedState.currentStep) {
        setTourState(storedState);
      }
    }
  }, [page, variant]);

  // Hash change re-sync
  useEffect(() => {
    const handleHashChange = () => {
      const storedState = readStoredTourState(variant);
      if (storedState && storedState.isRunning) {
        setTourState(storedState);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [variant]);

  // Auto-start
  useEffect(() => {
    if (shouldAutoStartTour && !isRunning) {
      const timer = setTimeout(() => startTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoStartTour, isRunning, startTour]);

  return {
    shouldAutoStartTour,
    currentStep: tourState?.currentStep ?? 0,
    isRunning,
    totalSteps: config.totalSteps,
    variant,
    startTour,
    setStep,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
    stopTour,
    isLoading,
  };
}
