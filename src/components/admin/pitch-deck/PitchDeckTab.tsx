import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize, Download, Presentation, Printer } from 'lucide-react';
import { CoverSlide } from './slides/CoverSlide';
import { ProblemSlide } from './slides/ProblemSlide';
import { SolutionSlide } from './slides/SolutionSlide';
import { InfrastructureSlide } from './slides/InfrastructureSlide';
import { WhoWeAreBringingSlide } from './slides/WhoWeAreBringingSlide';
import { EarlyPartnerBenefitsSlide } from './slides/EarlyPartnerBenefitsSlide';
import { WhatThisIsNotSlide } from './slides/WhatThisIsNotSlide';

import { PlatformAdvantageSlide } from './slides/PlatformAdvantageSlide';
import { HowItWorksSlide } from './slides/HowItWorksSlide';
import { DifferentiatorSlide } from './slides/DifferentiatorSlide';
import { ProductScreenshotsSlide } from './slides/ProductScreenshotsSlide';
import { CompetitiveSlide } from './slides/CompetitiveSlide';
import { MarketSlide } from './slides/MarketSlide';
import { TractionSlide } from './slides/TractionSlide';
import { IntegrationOpportunitiesSlide } from './slides/IntegrationOpportunitiesSlide';
import { printCurrentDeck } from './pitchDeckPrintExport';

const slides = [
  { component: CoverSlide, title: 'Cover' },
  { component: ProblemSlide, title: 'The Problem' },
  { component: SolutionSlide, title: 'The Solution' },
  { component: InfrastructureSlide, title: 'Platform → Infrastructure' },
  { component: WhoWeAreBringingSlide, title: 'Who We\'re Bringing In' },
  { component: EarlyPartnerBenefitsSlide, title: 'Partner Benefits' },
  { component: WhatThisIsNotSlide, title: 'What This Is Not' },
  { component: PlatformAdvantageSlide, title: 'Platform Advantage' },
  { component: HowItWorksSlide, title: 'How It Works' },
  { component: DifferentiatorSlide, title: 'Why Different' },
  { component: ProductScreenshotsSlide, title: 'Product Experience' },
  { component: CompetitiveSlide, title: 'Competition' },
  { component: MarketSlide, title: 'Market Context' },
  { component: TractionSlide, title: 'Expansion Layers' },
  { component: IntegrationOpportunitiesSlide, title: 'Integration Opportunities' },
];

export function PitchDeckTab() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(0);

  // Ensure currentSlide is within bounds (in case slides are removed)
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(slides.length - 1);
    }
  }, [currentSlide]);

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePrintPDF = () => {
    printCurrentDeck();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Safety check - ensure currentSlide is valid
  const safeSlideIndex = Math.min(Math.max(0, currentSlide), slides.length - 1);
  const CurrentSlideComponent = slides[safeSlideIndex]?.component || CoverSlide;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isFullscreen ? 'p-4 bg-white/90 backdrop-blur-sm' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <Presentation className="w-5 h-5 text-[#1e3a5f]" />
          <h2 className="text-xl font-semibold text-[#1e3a5f]">Strategic Partner Deck</h2>
          <span className="text-sm text-gray-500 ml-2">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            <Maximize className="w-4 h-4" />
            {isFullscreen ? 'Exit' : 'Present'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPDF}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Slide Container */}
      <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden ${isFullscreen ? 'flex-1' : 'aspect-[16/9]'}`}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
        >
          <ChevronLeft className="w-6 h-6 text-[#1e3a5f]" />
        </button>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
        >
          <ChevronRight className="w-6 h-6 text-[#1e3a5f]" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 py-4">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`group relative transition-all ${
              index === currentSlide
                ? 'w-8 h-3 bg-[#d4af37] rounded-full'
                : 'w-3 h-3 bg-gray-300 hover:bg-gray-400 rounded-full'
            }`}
            title={slide.title}
          >
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {slide.title}
            </span>
          </button>
        ))}
      </div>

      {/* Keyboard Hints */}
      <div className="text-center text-xs text-gray-400 pb-2">
        Use ← → arrows to navigate • Space to advance • F for fullscreen
      </div>
    </div>
  );
}
