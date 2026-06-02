import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Award } from 'lucide-react';
import WhiteLabelBranding from '@/components/WhiteLabelBranding';
import { LanguageSelector } from '@/components/ui/language-selector';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLanguage } from '@/contexts/LanguageContext';

const Navigation = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <header className="bg-background shadow-sm border-b border-openkey-blue/10 dark:border-border/20 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => navigate('/')}
              className="cursor-pointer"
            >
              <WhiteLabelBranding 
                className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity" 
                fallbackText="OpenKey"
              />
            </button>
            <nav className="hidden md:flex space-x-8">
              <a 
                href="/" 
                className="text-muted-foreground hover:text-openkey-blue cursor-pointer transition-colors font-medium"
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
              >
                {t('nav.home')}
              </a>
              <a 
                href="/find-home" 
                className="text-muted-foreground hover:text-openkey-blue cursor-pointer transition-colors font-medium"
                onClick={(e) => { e.preventDefault(); navigate('/find-home'); }}
              >
                {t('nav.findHome')}
              </a>
              <a 
                href="/about" 
                className="text-muted-foreground hover:text-openkey-blue cursor-pointer transition-colors font-medium"
                onClick={(e) => { e.preventDefault(); navigate('/about'); }}
              >
                {t('nav.about')}
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector compact />
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth?mode=login')}
              className="border-openkey-blue text-openkey-blue hover:bg-openkey-blue hover:text-white"
            >
              {t('nav.login')}
            </Button>
            <Button 
              variant="gradient"
              onClick={() => navigate('/auth?mode=signup')}
            >
              {t('nav.signUp')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
