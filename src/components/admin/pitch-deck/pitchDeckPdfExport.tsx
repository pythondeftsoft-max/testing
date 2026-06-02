import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { MotionConfig } from 'framer-motion';

// Import all slide components
import { CoverSlide } from './slides/CoverSlide';
import { ProblemSlide } from './slides/ProblemSlide';
import { SolutionSlide } from './slides/SolutionSlide';
import { InfrastructureSlide } from './slides/InfrastructureSlide';
import { WhoWeAreBringingSlide } from './slides/WhoWeAreBringingSlide';
import { EarlyPartnerBenefitsSlide } from './slides/EarlyPartnerBenefitsSlide';
import { WhatThisIsNotSlide } from './slides/WhatThisIsNotSlide';
import { PartnerEconomicsSlide } from './slides/PartnerEconomicsSlide';
import { PlatformAdvantageSlide } from './slides/PlatformAdvantageSlide';
import { HowItWorksSlide } from './slides/HowItWorksSlide';
import { DifferentiatorSlide } from './slides/DifferentiatorSlide';
import { ProductScreenshotsSlide } from './slides/ProductScreenshotsSlide';
import { CompetitiveSlide } from './slides/CompetitiveSlide';
import { MarketSlide } from './slides/MarketSlide';
import { TractionSlide } from './slides/TractionSlide';
import { IntegrationOpportunitiesSlide } from './slides/IntegrationOpportunitiesSlide';

const slideComponents = [
  { Component: CoverSlide, title: 'Cover' },
  { Component: ProblemSlide, title: 'The Problem' },
  { Component: SolutionSlide, title: 'The Solution' },
  { Component: InfrastructureSlide, title: 'Platform → Infrastructure' },
  { Component: WhoWeAreBringingSlide, title: 'Who We\'re Bringing In' },
  { Component: EarlyPartnerBenefitsSlide, title: 'Partner Benefits' },
  { Component: WhatThisIsNotSlide, title: 'What This Is Not' },
  { Component: PartnerEconomicsSlide, title: 'Partner Economics' },
  { Component: PlatformAdvantageSlide, title: 'Platform Advantage' },
  { Component: HowItWorksSlide, title: 'How It Works' },
  { Component: DifferentiatorSlide, title: 'Why Different' },
  { Component: ProductScreenshotsSlide, title: 'Product Experience' },
  { Component: CompetitiveSlide, title: 'Competition' },
  { Component: MarketSlide, title: 'Market Context' },
  { Component: TractionSlide, title: 'Expansion Layers' },
  { Component: IntegrationOpportunitiesSlide, title: 'Integration Opportunities' },
];

// Wrapper component to render slides without animations
function StaticSlideWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="always">
      <div 
        id="pdf-slide-container"
        className="relative overflow-hidden flex flex-col"
        style={{
          width: '1920px',
          height: '1080px',
          minHeight: '1080px',
          maxHeight: '1080px',
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        }}
      >
        <div style={{ 
          width: '100%', 
          height: '1080px',
          minHeight: '1080px',
          maxHeight: '1080px',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
        }}>
          {children}
        </div>
      </div>
    </MotionConfig>
  );
}

async function renderSlideToContainer(
  SlideComponent: React.FC,
  container: HTMLElement
): Promise<Root> {
  return new Promise((resolve) => {
    const root = createRoot(container);
    root.render(
      <StaticSlideWrapper>
        <SlideComponent />
      </StaticSlideWrapper>
    );
    // Give time for React to render and fonts/icons to load
    setTimeout(() => {
      resolve(root);
    }, 1500);
  });
}

export async function exportPitchDeckToPDF(): Promise<void> {
  const toastId = toast.loading('Generating PDF...', {
    description: 'Preparing slides for export'
  });

  try {
    // Create PDF in landscape mode with 16:9 aspect ratio
    // Using custom page size: 297mm x 167mm (approximately 16:9)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [297, 167]
    });

    const pdfWidth = 297;
    const pdfHeight = 167;

    for (let i = 0; i < slideComponents.length; i++) {
      const { Component, title } = slideComponents[i];
      
      // Update progress toast
      toast.loading(`Generating PDF...`, {
        id: toastId,
        description: `Capturing slide ${i + 1}/${slideComponents.length}: ${title}`
      });

      // Create temporary container - position off-screen but visible for CSS computation
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1920px';
      container.style.height = '1080px';
      container.style.zIndex = '-9999';
      container.style.visibility = 'visible';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      let root: Root | null = null;
      try {
        // Render slide component
        root = await renderSlideToContainer(Component, container);

        // Find the actual slide container (not the MotionConfig wrapper)
        const slideElement = container.querySelector('#pdf-slide-container') as HTMLElement;

        if (!slideElement) {
          throw new Error(`Could not find slide container for: ${title}`);
        }

        // Capture with html2canvas - use scale 1.5 and JPEG for smaller file size
        const canvas = await html2canvas(slideElement, {
          scale: 1.5,
          backgroundColor: '#f9fafb',
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 1920,
          height: 1080,
          windowWidth: 1920,
          windowHeight: 1080,
          onclone: (_clonedDoc, element) => {
            // Force the element to be visible in the cloned document
            element.style.visibility = 'visible';
            element.style.position = 'relative';
            element.style.left = '0';
            element.style.top = '0';
            element.style.width = '1920px';
            element.style.height = '1080px';
            element.style.display = 'flex';
            element.style.flexDirection = 'column';
            
            // Force all child elements to be visible and compute heights
            const allElements = element.querySelectorAll('*');
            allElements.forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.visibility = 'visible';
                
                // Elements with h-full class need explicit heights
                if (el.classList.contains('h-full')) {
                  el.style.height = '100%';
                  el.style.minHeight = '100%';
                }
                
                // Flex containers need proper display
                if (el.classList.contains('flex')) {
                  el.style.display = 'flex';
                }
                if (el.classList.contains('flex-col')) {
                  el.style.flexDirection = 'column';
                }
                if (el.classList.contains('flex-1')) {
                  el.style.flex = '1 1 0%';
                }
              }
            });
          }
        });

        // Check if canvas captured content
        if (canvas.width === 0 || canvas.height === 0) {
          console.error('Canvas is empty for slide:', title);
        }

        // Add page (except for first slide)
        if (i > 0) {
          pdf.addPage([297, 167], 'landscape');
        }

        // Add image to PDF - use JPEG with 85% quality for much smaller file size
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Clear canvas to free memory between slides
        canvas.width = 0;
        canvas.height = 0;

      } finally {
        // Unmount React root to prevent bleed-through
        if (root) {
          root.unmount();
        }
        // Cleanup container
        if (container.parentNode) {
          document.body.removeChild(container);
        }
      }
    }

    // Save the PDF
    pdf.save('OpenKey-Partner-Deck.pdf');

    toast.success('PDF downloaded!', {
      id: toastId,
      description: `All ${slideComponents.length} slides exported successfully`
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    toast.error('PDF generation failed', {
      id: toastId,
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    throw error;
  }
}
