import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';

// Import all slides
import { CoverSlide } from './slides/CoverSlide';
import { ProblemSlide } from './slides/ProblemSlide';
import { SolutionSlide } from './slides/SolutionSlide';
import { PlatformAdvantageSlide } from './slides/PlatformAdvantageSlide';
import { HowItWorksSlide } from './slides/HowItWorksSlide';
import { ProductScreenshotsSlide } from './slides/ProductScreenshotsSlide';
import { MarketSlide } from './slides/MarketSlide';
import { DifferentiatorSlide } from './slides/DifferentiatorSlide';
import { CompetitiveSlide } from './slides/CompetitiveSlide';
import { RevenueSlide } from './slides/RevenueSlide';
import { GrowthSlide } from './slides/GrowthSlide';
import { WhatThisIsNotSlide } from './slides/WhatThisIsNotSlide';
import { PartnerEconomicsSlide } from './slides/PartnerEconomicsSlide';
import { WhoWeAreBringingSlide } from './slides/WhoWeAreBringingSlide';
import { InfrastructureSlide } from './slides/InfrastructureSlide';
import { IntegrationOpportunitiesSlide } from './slides/IntegrationOpportunitiesSlide';

const slides = [
  CoverSlide,
  ProblemSlide,
  SolutionSlide,
  PlatformAdvantageSlide,
  HowItWorksSlide,
  ProductScreenshotsSlide,
  MarketSlide,
  DifferentiatorSlide,
  CompetitiveSlide,
  RevenueSlide,
  GrowthSlide,
  WhatThisIsNotSlide,
  PartnerEconomicsSlide,
  WhoWeAreBringingSlide,
  InfrastructureSlide,
  IntegrationOpportunitiesSlide,
];

const printStyles = `
  @media print {
    @page {
      size: 297mm 167mm landscape;
      margin: 0;
    }
    
    /* Hide everything except our print container */
    body > *:not(#pitch-deck-print-root) {
      display: none !important;
      visibility: hidden !important;
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    #pitch-deck-print-root {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
      z-index: auto !important;
    }
    
    .print-slide-page {
      width: 297mm !important;
      height: 167mm !important;
      min-height: 167mm !important;
      max-height: 167mm !important;
      page-break-after: always !important;
      page-break-inside: avoid !important;
      overflow: hidden !important;
      overflow: clip !important;
      position: relative !important;
      display: block !important;
      box-sizing: border-box !important;
      contain: strict !important;
      isolation: isolate !important;
    }
    
    .print-slide-page:last-child {
      page-break-after: avoid !important;
    }
    
    /* Force the inner slide container to fill */
    .print-slide-inner {
      width: 100% !important;
      height: 167mm !important;
      min-height: 167mm !important;
      max-height: 167mm !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      overflow: clip !important;
      position: relative !important;
      contain: layout style !important;
    }
    
    /* Fix h-full elements */
    .print-slide-inner .h-full,
    .print-slide-inner [class*="h-full"] {
      height: 100% !important;
      min-height: 0 !important;
    }
    
    /* Force flex-1 to work */
    .print-slide-inner .flex-1,
    .print-slide-inner [class*="flex-1"] {
      flex: 1 1 0% !important;
      min-height: 0 !important;
    }
    
    /* Ensure SVGs print properly */
    svg {
      display: inline-block !important;
      visibility: visible !important;
      overflow: visible !important;
    }
    
    svg * {
      visibility: visible !important;
    }
    
    /* Force desktop grid layouts */
    .print-slide-inner .md\\:grid-cols-2,
    .print-slide-inner [class*="md:grid-cols-2"] {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    
    .print-slide-inner .md\\:grid-cols-3,
    .print-slide-inner [class*="md:grid-cols-3"] {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
    
    .print-slide-inner .md\\:grid-cols-4,
    .print-slide-inner [class*="md:grid-cols-4"] {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
    
    /* Force desktop flex layouts */
    .print-slide-inner .md\\:flex-row,
    .print-slide-inner [class*="md:flex-row"] {
      flex-direction: row !important;
    }
    
    /* Force backgrounds to print */
    .print-slide-inner * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Ensure gradients print */
    .print-slide-inner [class*="bg-gradient"],
    .print-slide-inner [class*="from-"],
    .print-slide-inner [class*="to-"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  
  /* Screen styles for the print container (hidden until print) */
  @media screen {
    #pitch-deck-print-root {
      position: fixed !important;
      left: -9999px !important;
      top: 0 !important;
      width: 297mm !important;
      visibility: hidden !important;
      z-index: -1 !important;
      pointer-events: none !important;
    }
  }
`;

// Wrapper component for printable slides
function PrintableSlide({ SlideComponent, index }: { SlideComponent: React.ComponentType; index: number }) {
  return (
    <div 
      className="print-slide-page"
      style={{
        width: '297mm',
        height: '167mm',
        minHeight: '167mm',
        maxHeight: '167mm',
        background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        contain: 'strict',
        isolation: 'isolate',
      }}
    >
      <div 
        className="print-slide-inner"
        style={{
          width: '100%',
          height: '167mm',
          minHeight: '167mm',
          maxHeight: '167mm',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <SlideComponent />
      </div>
    </div>
  );
}

// Main print container component
function PrintContainer() {
  return (
    <MotionConfig reducedMotion="always">
      <div style={{ background: 'white' }}>
        {slides.map((SlideComponent, index) => (
          <PrintableSlide 
            key={index} 
            SlideComponent={SlideComponent} 
            index={index} 
          />
        ))}
      </div>
    </MotionConfig>
  );
}

export function printCurrentDeck() {
  // Remove any existing print container
  const existingContainer = document.getElementById('pitch-deck-print-root');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Remove any existing print styles
  const existingStyles = document.getElementById('pitch-deck-print-styles');
  if (existingStyles) {
    existingStyles.remove();
  }
  
  // Create and inject print styles
  const styleElement = document.createElement('style');
  styleElement.id = 'pitch-deck-print-styles';
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
  
  // Create the print container
  const printContainer = document.createElement('div');
  printContainer.id = 'pitch-deck-print-root';
  document.body.appendChild(printContainer);
  
  // Render React components into the container
  const root = createRoot(printContainer);
  root.render(<PrintContainer />);
  
  // Wait for React to render and all content to load (increased to 2500ms)
  setTimeout(() => {
    // Force all motion.div elements to be fully visible (remove animation state)
    const allElements = printContainer.querySelectorAll('*');
    allElements.forEach(el => {
      const element = el as HTMLElement;
      // Force opacity and transform for animated elements
      if (element.style.opacity === '0' || element.style.opacity === '') {
        element.style.opacity = '1';
      }
      if (element.style.transform && element.style.transform !== 'none') {
        element.style.transform = 'none';
      }
    });
    
    // Force all SVGs to be visible with explicit dimensions
    const svgs = printContainer.querySelectorAll('svg');
    svgs.forEach(svg => {
      // Preserve original dimensions or use defaults
      const width = svg.getAttribute('width') || '24';
      const height = svg.getAttribute('height') || '24';
      svg.style.width = width.includes('px') ? width : `${width}px`;
      svg.style.height = height.includes('px') ? height : `${height}px`;
      svg.style.display = 'inline-block';
      svg.style.visibility = 'visible';
      svg.style.overflow = 'visible';
      svg.style.minWidth = svg.style.width;
      svg.style.minHeight = svg.style.height;
      
      // Force all child elements to be visible
      svg.querySelectorAll('*').forEach(child => {
        (child as SVGElement).style.visibility = 'visible';
      });
    });
    
    // Force all h-full elements to have explicit heights
    const hFullElements = printContainer.querySelectorAll('[class*="h-full"]');
    hFullElements.forEach(el => {
      (el as HTMLElement).style.height = '100%';
      (el as HTMLElement).style.minHeight = '0';
    });
    
    // Force flex-1 elements
    const flex1Elements = printContainer.querySelectorAll('[class*="flex-1"]');
    flex1Elements.forEach(el => {
      (el as HTMLElement).style.flex = '1 1 0%';
      (el as HTMLElement).style.minHeight = '0';
    });
    
    // Force desktop grid layouts
    const gridCols2 = printContainer.querySelectorAll('[class*="md:grid-cols-2"]');
    gridCols2.forEach(el => {
      (el as HTMLElement).style.display = 'grid';
      (el as HTMLElement).style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    });
    
    const gridCols3 = printContainer.querySelectorAll('[class*="md:grid-cols-3"]');
    gridCols3.forEach(el => {
      (el as HTMLElement).style.display = 'grid';
      (el as HTMLElement).style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    });
    
    const gridCols4 = printContainer.querySelectorAll('[class*="md:grid-cols-4"]');
    gridCols4.forEach(el => {
      (el as HTMLElement).style.display = 'grid';
      (el as HTMLElement).style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
    });
    
    // Force md:flex-row layouts
    const flexRowElements = printContainer.querySelectorAll('[class*="md:flex-row"]');
    flexRowElements.forEach(el => {
      (el as HTMLElement).style.display = 'flex';
      (el as HTMLElement).style.flexDirection = 'row';
    });
    
    // Force md:gap-8 layouts
    const gap8Elements = printContainer.querySelectorAll('[class*="md:gap-8"]');
    gap8Elements.forEach(el => {
      (el as HTMLElement).style.gap = '2rem';
    });
    
    // Trigger print
    window.print();
    
    // Cleanup after print dialog closes
    setTimeout(() => {
      root.unmount();
      printContainer.remove();
      styleElement.remove();
    }, 1000);
  }, 2500); // Increased from 1500ms to 2500ms
}
