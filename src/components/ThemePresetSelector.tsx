import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  category: 'business' | 'creative' | 'modern' | 'minimal';
}

interface ThemePresetSelectorProps {
  selectedPreset: string;
  onPresetSelect: (preset: ThemePreset) => void;
}

const themePresets: ThemePreset[] = [
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own color scheme',
    colors: { primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6' },
    category: 'business'
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional and trustworthy',
    colors: { primary: '#1e40af', secondary: '#1e3a8a', accent: '#3b82f6' },
    category: 'business'
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    description: 'Fresh and eco-friendly',
    colors: { primary: '#059669', secondary: '#047857', accent: '#10b981' },
    category: 'modern'
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm and energetic',
    colors: { primary: '#ea580c', secondary: '#c2410c', accent: '#fb923c' },
    category: 'creative'
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Luxurious and creative',
    colors: { primary: '#7c3aed', secondary: '#6d28d9', accent: '#a855f7' },
    category: 'creative'
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    description: 'Clean and sophisticated',
    colors: { primary: '#475569', secondary: '#334155', accent: '#64748b' },
    category: 'minimal'
  },
  {
    id: 'rose-modern',
    name: 'Rose Modern',
    description: 'Elegant and contemporary',
    colors: { primary: '#e11d48', secondary: '#be185d', accent: '#f43f5e' },
    category: 'modern'
  },
  {
    id: 'teal-business',
    name: 'Teal Business',
    description: 'Balanced and professional',
    colors: { primary: '#0d9488', secondary: '#0f766e', accent: '#14b8a6' },
    category: 'business'
  }
];

const ThemePresetSelector = ({ selectedPreset, onPresetSelect }: ThemePresetSelectorProps) => {
  const categoryColors = {
    business: 'bg-blue-50 text-blue-700',
    creative: 'bg-purple-50 text-purple-700',
    modern: 'bg-green-50 text-green-700',
    minimal: 'bg-gray-50 text-gray-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Theme Presets</h3>
        <p className="text-sm text-gray-600">
          Choose a predefined color scheme or create your own custom theme
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themePresets.map((preset) => (
          <Card 
            key={preset.id}
            className={`relative cursor-pointer transition-all hover:shadow-md ${
              selectedPreset === preset.id 
                ? 'ring-2 ring-blue-500 shadow-md' 
                : 'hover:shadow-sm'
            }`}
            onClick={() => onPresetSelect(preset)}
          >
            <CardContent className="p-4">
              {selectedPreset === preset.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{preset.name}</h4>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${categoryColors[preset.category]}`}
                  >
                    {preset.category}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600">{preset.description}</p>
                
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: preset.colors.primary }}
                    title="Primary Color"
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: preset.colors.secondary }}
                    title="Secondary Color"
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: preset.colors.accent }}
                    title="Accent Color"
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>Primary: {preset.colors.primary}</div>
                  <div>Secondary: {preset.colors.secondary}</div>
                  <div>Accent: {preset.colors.accent}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ThemePresetSelector;