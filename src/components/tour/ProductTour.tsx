import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, TooltipRenderProps } from 'react-joyride';
import { Loader2 } from 'lucide-react';
import { TourTooltip } from './TourTooltip';
import { getTourConfig, type TourVariant } from './tours';
import { usePaymentsTabStore } from '@/stores/paymentsTabStore';
import { usePaymentTaggingTabStore } from '@/stores/paymentTaggingTabStore';

interface ProductTourProps {
  page: 'portfolio' | 'dashboard';
  isRunning: boolean;
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onStop: () => void;
  variant?: TourVariant;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  page,
  isRunning,
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
  onStop,
  variant = 'pm',
}) => {
  const config = useMemo(() => getTourConfig(variant), [variant]);
  const allTourSteps = config.steps;
  const TOTAL_TOUR_STEPS = config.totalSteps;
  const DASHBOARD_STEP_OFFSET = config.dashboardOffset;
  const STEP_TAB_REQUIREMENTS = config.tabRequirements;
  const STEP_SUBTAB_REQUIREMENTS = config.subtabRequirements;
  const STEP_TAGGING_TAB_REQUIREMENTS = config.taggingTabRequirements;
  const TOUR_STORAGE_KEY = variant === 'listing' ? 'openkey_tour_state_listing' : 'openkey_tour_state';
  console.log('[Tour] ProductTour RENDER - page:', page, 'currentStep:', currentStep, 'isRunning:', isRunning);
  
  // State to gate Joyride rendering until target is confirmed to exist
  const [isTargetReady, setIsTargetReady] = useState(false);
  
  // Use ALL tour steps directly with global index - no more filtering/translation errors
  console.log('[Tour] Using allTourSteps with global currentStep:', currentStep, 'total steps:', allTourSteps.length);

  // Track if we're waiting for a tab switch
  const pendingTabSwitch = useRef<string | null>(null);
  
  // Track pending timeout for cleanup on unmount
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track polling interval for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track navigation direction for direction-aware skip logic
  const lastNavigationDirection = useRef<'next' | 'prev'>('next');
  
  // Clear pending timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        console.log('[Tour] Cleanup: Clearing pending timeout on unmount');
        clearTimeout(pendingTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        console.log('[Tour] Cleanup: Clearing polling interval on unmount');
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Reset isTargetReady when step changes
  useEffect(() => {
    console.log('[Tour] Step changed to', currentStep, '- resetting isTargetReady');
    setIsTargetReady(false);
  }, [currentStep]);

  // Poll for target existence BEFORE rendering Joyride
  useEffect(() => {
    // Clear any previous polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (!isRunning) {
      setIsTargetReady(false);
      return;
    }
    
    const currentStepData = allTourSteps[currentStep];
    if (!currentStepData) {
      console.warn('[Tour] No step data for step:', currentStep);
      setIsTargetReady(false);
      return;
    }
    
    // 'body' target is always available
    if (currentStepData.target === 'body') {
      console.log('[Tour] Target is body, immediately ready');
      setIsTargetReady(true);
      return;
    }
    
    const targetSelector = currentStepData.target as string;
    
    // Check immediately first
    const immediateTarget = document.querySelector(targetSelector);
    if (immediateTarget) {
      console.log('[Tour] Target found immediately:', targetSelector);
      setIsTargetReady(true);
      return;
    }
    
    // Poll for target existence (every 100ms for up to 3 seconds)
    console.log('[Tour] Polling for target:', targetSelector);
    
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds total
    
    pollingIntervalRef.current = setInterval(() => {
      attempts++;
      const target = document.querySelector(targetSelector);
      
      if (target) {
        console.log('[Tour] Target found after', attempts * 100, 'ms:', targetSelector);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Scroll element into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Small delay after scroll before showing tooltip
        setTimeout(() => setIsTargetReady(true), 150);
      } else if (attempts >= maxAttempts) {
        console.warn('[Tour] Target not found after 3s, skipping step:', currentStep, 'target:', targetSelector);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Skip to next step
        if (currentStep + 1 < TOTAL_TOUR_STEPS) {
          onStepChange(currentStep + 1);
        } else {
          onComplete();
        }
      }
    }, 100);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isRunning, currentStep, onStepChange, onComplete]);

  // Apply highlight class to current tour target
  useEffect(() => {
    if (!isRunning || !isTargetReady || currentStep < 0 || currentStep >= allTourSteps.length) return;
    
    const currentStepData = allTourSteps[currentStep];
    if (!currentStepData || currentStepData.target === 'body') return;
    
    const targetSelector = currentStepData.target as string;
    const targetElement = document.querySelector(targetSelector);
    
    if (targetElement) {
      targetElement.classList.add('tour-highlight');
      
      return () => {
        targetElement.classList.remove('tour-highlight');
      };
    }
  }, [isRunning, isTargetReady, currentStep]);
  
  // Hash to tab mapping for navigation
  const hashToTabMap: Record<string, string> = {
    'Dashboard': '#dashboard',
    'Analytics': '#analytics',
    'Lease Expirations': '#lease-expirations',
    'Properties': '#properties',
    'Maintenance': '#maintenance',
    'Payments': '#payments',
    'Tenants/Applications': '#tenants-applications',
    'My Rewards': '#my-rewards',
    'Profile': '#profile',
  };

  // Switch to required tab for a GLOBAL step - returns { needsSwitch, totalDelay }
  // CRITICAL: This function persists state to localStorage BEFORE changing the hash
  // because the hash change triggers an immediate component remount
  const switchToTabForStep = useCallback((globalStep: number): { needsSwitch: boolean; totalDelay: number } => {
    console.log('[Tour] switchToTabForStep called for step:', globalStep);
    
    if (page !== 'dashboard') {
      console.log('[Tour] Not on dashboard page, no tab switch needed');
      return { needsSwitch: false, totalDelay: 0 };
    }
    
    let needsMainTabSwitch = false;
    let totalDelay = 0;
    
    // Check if we need to switch the main tab (using GLOBAL step index)
    const requiredTab = STEP_TAB_REQUIREMENTS[globalStep];
    console.log('[Tour] Required tab for step', globalStep, ':', requiredTab);
    
    if (requiredTab) {
      const hash = hashToTabMap[requiredTab];
      if (hash) {
        const currentHash = window.location.hash || '#dashboard';
        console.log('[Tour] Current hash:', currentHash, '-> Target hash:', hash);
        
        if (currentHash !== hash) {
          console.log('[Tour] SWITCHING TAB! Persisting step', globalStep, 'to localStorage BEFORE hash change');
          pendingTabSwitch.current = requiredTab;
          needsMainTabSwitch = true;
          
          // CRITICAL: Persist state BEFORE hash change triggers remount
          localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
            currentStep: globalStep,
            isRunning: true,
            page: 'dashboard',
            variant,
          }));
          
          window.location.hash = hash;
          totalDelay = 600;
        } else {
          console.log('[Tour] Already on correct tab, no switch needed');
        }
      }
    }
    
    // Check if we need to switch sub-tabs (Payments section) - use Zustand store
    const requiredSubtab = STEP_SUBTAB_REQUIREMENTS[globalStep];
    if (requiredSubtab) {
      console.log('[Tour] Required sub-tab for step', globalStep, ':', requiredSubtab);
      
      // Map selector to tab value for Zustand store
      const subtabValueMap: Record<string, 'overview' | 'all-incoming' | 'tagging'> = {
        '[data-tour="payments-tab-overview"]': 'overview',
        '[data-tour="payments-tab-all-incoming"]': 'all-incoming',
        '[data-tour="payments-tab-tagging"]': 'tagging',
      };
      
      const tabValue = subtabValueMap[requiredSubtab];
      if (tabValue) {
        // Schedule sub-tab switch after main tab renders
        const subtabDelay = needsMainTabSwitch ? 700 : 100;
        setTimeout(() => {
          console.log('[Tour] Setting payments sub-tab via store:', tabValue);
          usePaymentsTabStore.getState().setActiveTab(tabValue);
        }, subtabDelay);
        
        // Also check if we need to switch the inner tagging tab
        const requiredTaggingTab = STEP_TAGGING_TAB_REQUIREMENTS[globalStep];
        if (requiredTaggingTab && tabValue === 'tagging') {
          setTimeout(() => {
            console.log('[Tour] Setting tagging inner tab via store:', requiredTaggingTab);
            usePaymentTaggingTabStore.getState().setActiveTab(requiredTaggingTab);
          }, subtabDelay + 200);
          totalDelay = Math.max(totalDelay, subtabDelay + 500);
        } else {
          // Add extra delay for sub-tab content to render
          totalDelay = Math.max(totalDelay, subtabDelay + 300);
        }
      }
    }
    
    return { needsSwitch: needsMainTabSwitch || !!requiredSubtab, totalDelay };
  }, [page]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;
    console.log('[Tour] handleCallback:', { status, type, action, index, currentStep });

    // Handle target_not_found errors - verify target actually exists before skipping
    if (type === 'error:target_not_found') {
      const currentStepData = allTourSteps[currentStep];
      const targetSelector = currentStepData?.target as string;
      
      // Check if target actually exists in DOM right now
      const targetExists = targetSelector && targetSelector !== 'body' 
        ? document.querySelector(targetSelector) 
        : false;
      
      if (targetExists) {
        console.log('[Tour] target_not_found fired but element exists, forcing re-render for step:', currentStep);
        // Target exists but Joyride couldn't find it (race condition)
        // Force a re-render by toggling isTargetReady
        setIsTargetReady(false);
        setTimeout(() => setIsTargetReady(true), 100);
        return; // DON'T skip!
      }
      
      console.warn('[Tour] target_not_found and element truly missing for step:', currentStep, '- skipping in direction:', lastNavigationDirection.current);
      // Target truly doesn't exist, skip in the same direction as last navigation
      if (lastNavigationDirection.current === 'prev') {
        // User was going backward, skip to previous step
        if (currentStep - 1 >= 0) {
          onStepChange(currentStep - 1);
        }
      } else {
        // User was going forward, skip to next step
        if (currentStep + 1 < TOTAL_TOUR_STEPS) {
          onStepChange(currentStep + 1);
        } else {
          onComplete();
        }
      }
      return;
    }

    // GUARD: Ignore stale STEP_AFTER events from Joyride after remount
    // This prevents double-advancing when component remounts after hash change
    if (type === EVENTS.STEP_AFTER && index !== currentStep) {
      console.log('[Tour] Ignoring stale callback - index:', index, 'expected:', currentStep);
      return;
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      console.log('[Tour] Tour FINISHED');
      if (page === 'dashboard') {
        onComplete();
      } else {
        // On portfolio page - navigate to dashboard and continue tour
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
          currentStep: DASHBOARD_STEP_OFFSET,
          isRunning: true,
          page: 'dashboard',
          variant,
        }));
        window.location.href = '/dashboard?portfolioId=everything';
      }
      return;
    }

    // Handle skip
    if (status === STATUS.SKIPPED) {
      console.log('[Tour] Tour SKIPPED');
      onSkip();
      return;
    }

    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      // Clear retry counter for successfully completed step
      sessionStorage.removeItem(`tour_retry_count_${currentStep}`);
      
      if (action === 'next') {
        lastNavigationDirection.current = 'next';
        const nextGlobalStep = currentStep + 1;
        console.log('[Tour] NEXT action: currentStep:', currentStep, '-> nextGlobalStep:', nextGlobalStep);
        
        // Check if tour is complete
        if (nextGlobalStep >= TOTAL_TOUR_STEPS) {
          console.log('[Tour] Tour complete, calling onComplete');
          onComplete();
          return;
        }
        
        // Check if we need to navigate to dashboard
        if (page === 'portfolio' && nextGlobalStep >= DASHBOARD_STEP_OFFSET) {
          console.log('[Tour] Navigating from portfolio to dashboard');
          localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
            currentStep: nextGlobalStep,
            isRunning: true,
            page: 'dashboard',
            variant,
          }));
          window.location.href = '/dashboard?portfolioId=everything';
          return;
        }
        
        // Check if we need to switch tabs (using GLOBAL step)
        const { needsSwitch, totalDelay } = switchToTabForStep(nextGlobalStep);
        
        if (needsSwitch) {
          console.log('[Tour] Tab switch initiated, setting timeout for', totalDelay, 'ms');
          // State already persisted inside switchToTabForStep before hash change
          // Clear any previous timeout before setting a new one
          if (pendingTimeoutRef.current) {
            console.log('[Tour] Clearing previous pending timeout');
            clearTimeout(pendingTimeoutRef.current);
          }
          // Wait for tab content to render before advancing
          pendingTimeoutRef.current = setTimeout(() => {
            console.log('[Tour] setTimeout callback firing for step:', nextGlobalStep);
            pendingTabSwitch.current = null;
            pendingTimeoutRef.current = null;
            // Verify target exists before advancing
            const stepData = allTourSteps[nextGlobalStep];
            if (stepData && stepData.target !== 'body') {
              const targetExists = document.querySelector(stepData.target as string);
              if (!targetExists) {
                console.log('[Tour] Target not found, retrying after 500ms');
                // Retry after another delay if target not found
                setTimeout(() => onStepChange(nextGlobalStep), 500);
                return;
              }
            }
            console.log('[Tour] Calling onStepChange with:', nextGlobalStep);
            onStepChange(nextGlobalStep);
          }, totalDelay);
        } else {
          console.log('[Tour] No tab switch needed, advancing immediately to:', nextGlobalStep);
          onStepChange(nextGlobalStep);
        }
      } else if (action === 'prev') {
        lastNavigationDirection.current = 'prev';
        console.log('[Tour] PREV action: currentStep:', currentStep);
        const prevGlobalStep = currentStep - 1;
        
        // Can't go before step 0
        if (prevGlobalStep < 0) return;
        
        // Check if we need to navigate back to portfolio page
        if (page === 'dashboard' && prevGlobalStep < DASHBOARD_STEP_OFFSET) {
          localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
            currentStep: prevGlobalStep,
            isRunning: true,
            page: 'portfolio',
            variant,
          }));
          window.location.href = '/portfolio-select';
          return;
        }
        
        // Check if we need to switch tabs (using GLOBAL step)
        const { needsSwitch, totalDelay } = switchToTabForStep(prevGlobalStep);
        
        if (needsSwitch) {
          // State already persisted inside switchToTabForStep before hash change
          setTimeout(() => {
            pendingTabSwitch.current = null;
            onStepChange(prevGlobalStep);
          }, totalDelay);
        } else {
          onStepChange(prevGlobalStep);
        }
      }
    }

    // Handle close button
    if (action === 'close') {
      onStop();
    }
  }, [page, currentStep, onStepChange, onComplete, onSkip, onStop, switchToTabForStep]);

  if (!isRunning) return null;
  
  // Don't render if step is out of bounds
  if (currentStep < 0 || currentStep >= allTourSteps.length) return null;

  // DON'T render Joyride until we confirm the target exists
  if (!isTargetReady) {
    return (
      <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-3 shadow-lg z-[10001] flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading step...</span>
      </div>
    );
  }

  return (
    <Joyride
      steps={allTourSteps}
      stepIndex={currentStep}
      run={isRunning}
      continuous
      showSkipButton
      showProgress={false}
      disableOverlay={true}
      disableCloseOnEsc={false}
      spotlightClicks={true}
      scrollToFirstStep={false}
      scrollOffset={120}
      disableScrollParentFix={false}
      callback={handleCallback}
      tooltipComponent={(props: TooltipRenderProps) => (
        <TourTooltip {...props} totalSteps={TOTAL_TOUR_STEPS} />
      )}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: 'hsl(var(--card))',
        },
      }}
      floaterProps={{
        disableAnimation: false,
        offset: 15,
      }}
    />
  );
};

export default ProductTour;
