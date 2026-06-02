import React, { lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TEMPLATE_SAMPLE_DATA } from './templateSampleData';

const PageTemplate = lazy(() => import('@/components/seo/templates/PageTemplate'));
const CityLandingTemplate = lazy(() => import('@/components/seo/templates/CityLandingTemplate'));
const Section8Template = lazy(() => import('@/components/seo/templates/Section8Template'));
const LandlordTemplate = lazy(() => import('@/components/seo/templates/LandlordTemplate'));
const ComparisonTemplate = lazy(() => import('@/components/seo/templates/ComparisonTemplate'));
const RentDataTemplate = lazy(() => import('@/components/seo/templates/RentDataTemplate'));
const BlogTemplate = lazy(() => import('@/components/seo/templates/BlogTemplate'));

const TEMPLATE_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<any>>> = {
  blog: BlogTemplate,
  'city-landing': CityLandingTemplate,
  section8: Section8Template,
  landlord: LandlordTemplate,
  comparison: ComparisonTemplate,
  'rent-data': RentDataTemplate,
  page: PageTemplate,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: string;
  templateLabel: string;
}

export const TemplatePreviewDialog: React.FC<Props> = ({ open, onOpenChange, template, templateLabel }) => {
  const Component = TEMPLATE_COMPONENTS[template] || PageTemplate;
  const sampleData = TEMPLATE_SAMPLE_DATA[template] || TEMPLATE_SAMPLE_DATA.page;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview — {templateLabel}</DialogTitle>
          <DialogDescription>Live rendering with sample data</DialogDescription>
        </DialogHeader>
        <div className="border rounded-lg p-6 bg-background">
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
            <Component page={sampleData} />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Miniature inline preview used inside gallery cards */
export const TemplateMiniPreview: React.FC<{ template: string }> = ({ template }) => {
  const Component = TEMPLATE_COMPONENTS[template] || PageTemplate;
  const sampleData = TEMPLATE_SAMPLE_DATA[template] || TEMPLATE_SAMPLE_DATA.page;

  return (
    <div className="relative w-full h-[140px] overflow-hidden rounded-t-lg border-b bg-background">
      <div
        className="pointer-events-none origin-top-left"
        style={{ transform: 'scale(0.22)', width: '454%', height: '454%' }}
      >
        <Suspense fallback={<div className="p-8 text-muted-foreground text-sm">Loading…</div>}>
          <div className="p-6">
            <Component page={sampleData} />
          </div>
        </Suspense>
      </div>
    </div>
  );
};
