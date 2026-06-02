import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface FooterPageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const FooterPageLayout = ({ children, title }: FooterPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Main Content */}
      <main className="flex-1">
        {title && (
          <div className="bg-primary text-primary-foreground py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold">{title}</h1>
            </div>
          </div>
        )}
        
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};