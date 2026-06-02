import React from 'react';
import { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourTooltipProps extends TooltipRenderProps {
  totalSteps?: number;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  totalSteps = 1,
}) => {
  // index is already the global step index (0-based), just add 1 for display
  const globalStepNumber = index + 1;

  const isFirstStep = globalStepNumber === 1;
  const isFinalStep = globalStepNumber === totalSteps;

  return (
    <AnimatePresence>
      <motion.div
        {...tooltipProps}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-card border border-border rounded-xl shadow-xl max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-openkey-blue px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <span className="text-openkey-gold">📍</span>
            {step.title as string}
          </h3>
          <button
            {...closeProps}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-foreground text-sm leading-relaxed mb-4">
            {step.content as string}
          </p>

          {/* Step indicator */}
          <div className="text-muted-foreground text-xs mb-4">
            Step {globalStepNumber} of {totalSteps}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Skip button */}
            <Button
              {...skipProps}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="w-3 h-3 mr-1" />
              Skip
            </Button>

            <div className="flex items-center gap-2">
              {/* Back button - hidden on first step */}
              {!isFirstStep && (
                <Button
                  {...backProps}
                  variant="outline"
                  size="sm"
                  className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue/10"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}

            {/* Next/Finish button */}
              {continuous && !isFinalStep ? (
                <Button
                  {...primaryProps}
                  size="sm"
                  className="bg-openkey-gold hover:bg-openkey-gold/90 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  {...primaryProps}
                  size="sm"
                  className="bg-openkey-gold hover:bg-openkey-gold/90 text-white"
                >
                  {isFinalStep ? 'Finish' : 'Next'}
                  {!isFinalStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
