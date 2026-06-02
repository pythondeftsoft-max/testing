import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Globe, Languages, Download, Upload, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  translationProgress: number;
  isDefault: boolean;
  isActive: boolean;
}

interface TranslationKey {
  key: string;
  defaultText: string;
  category: string;
  translations: Record<string, string>;
  lastUpdated: string;
}

const supportedLanguages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    region: 'Americas',
    translationProgress: 100,
    isDefault: true,
    isActive: true
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    region: 'Europe',
    translationProgress: 89,
    isDefault: false,
    isActive: true
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    region: 'Europe',
    translationProgress: 76,
    isDefault: false,
    isActive: true
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    region: 'Europe',
    translationProgress: 82,
    isDefault: false,
    isActive: false
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    region: 'Asia',
    translationProgress: 45,
    isDefault: false,
    isActive: false
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    region: 'Asia',
    translationProgress: 23,
    isDefault: false,
    isActive: false
  }
];

const mockTranslations: TranslationKey[] = [
  {
    key: 'nav.home',
    defaultText: 'Home',
    category: 'Navigation',
    translations: {
      es: 'Inicio',
      fr: 'Accueil',
      de: 'Startseite'
    },
    lastUpdated: '2024-01-15'
  },
  {
    key: 'form.submit',
    defaultText: 'Submit',
    category: 'Forms',
    translations: {
      es: 'Enviar',
      fr: 'Soumettre',
      de: 'Absenden'
    },
    lastUpdated: '2024-01-14'
  },
  {
    key: 'pricing.monthly',
    defaultText: 'Monthly',
    category: 'Pricing',
    translations: {
      es: 'Mensual',
      fr: 'Mensuel',
      de: 'Monatlich'
    },
    lastUpdated: '2024-01-13'
  }
];

export const MultiLanguageSupport: React.FC = () => {
  const [languages, setLanguages] = useState<Language[]>(supportedLanguages);
  const [translations, setTranslations] = useState<TranslationKey[]>(mockTranslations);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('es');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const toggleLanguageStatus = (languageCode: string) => {
    setLanguages(prev => prev.map(lang => 
      lang.code === languageCode 
        ? { ...lang, isActive: !lang.isActive }
        : lang
    ));
    
    toast({
      title: "Language Status Updated",
      description: `Language has been ${languages.find(l => l.code === languageCode)?.isActive ? 'disabled' : 'enabled'}.`
    });
  };

  const updateTranslation = (key: string, languageCode: string, value: string) => {
    setTranslations(prev => prev.map(translation => 
      translation.key === key 
        ? {
            ...translation,
            translations: { ...translation.translations, [languageCode]: value },
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : translation
    ));
  };

  const exportTranslations = () => {
    const data = {
      languages: languages.filter(l => l.isActive),
      translations: translations
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translations.json';
    a.click();
    
    toast({
      title: "Translations Exported",
      description: "Translation file has been downloaded successfully."
    });
  };

  const filteredTranslations = translations.filter(translation =>
    translation.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    translation.defaultText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    translation.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompletionStatus = (translation: TranslationKey, languageCode: string) => {
    return translation.translations[languageCode] ? 'complete' : 'missing';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            Multi-Language Support
          </h2>
          <p className="text-muted-foreground">
            Manage translations and localization for your white-label sites
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTranslations}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Language
          </Button>
        </div>
      </div>

      <Tabs defaultValue="languages">
        <TabsList>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="languages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map(language => (
              <Card key={language.code} className={language.isActive ? 'border-green-200' : 'border-gray-200'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{language.flag}</span>
                      <div>
                        <CardTitle className="text-lg">{language.name}</CardTitle>
                        <CardDescription>{language.nativeName}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {language.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {language.isActive ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Translation Progress</span>
                        <span className="text-sm font-medium">{language.translationProgress}%</span>
                      </div>
                      <Progress value={language.translationProgress} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Region: {language.region}</span>
                      {!language.isDefault && (
                        <Button
                          variant={language.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleLanguageStatus(language.code)}
                        >
                          {language.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="translations" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search translations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.filter(l => l.isActive && !l.isDefault).map(language => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredTranslations.map(translation => (
              <Card key={translation.key}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Key</Label>
                      <div className="text-sm text-muted-foreground">{translation.key}</div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {translation.category}
                      </Badge>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Default (English)</Label>
                      <div className="text-sm">{translation.defaultText}</div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">
                        {languages.find(l => l.code === selectedLanguage)?.name} Translation
                      </Label>
                      <Input
                        value={translation.translations[selectedLanguage] || ''}
                        onChange={(e) => updateTranslation(translation.key, selectedLanguage, e.target.value)}
                        placeholder={`Translate "${translation.defaultText}"`}
                        className="mt-1"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        {getCompletionStatus(translation, selectedLanguage) === 'complete' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          Last updated: {translation.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Localization Settings</CardTitle>
              <CardDescription>Configure global localization preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date Format</Label>
                  <Select defaultValue="mm/dd/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY (EU)</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Number Format</Label>
                  <Select defaultValue="us">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">1,234.56 (US)</SelectItem>
                      <SelectItem value="eu">1.234,56 (EU)</SelectItem>
                      <SelectItem value="space">1 234,56 (Space)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Currency Display</Label>
                  <Select defaultValue="symbol">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="symbol">Symbol ($, €, ¥)</SelectItem>
                      <SelectItem value="code">Code (USD, EUR, JPY)</SelectItem>
                      <SelectItem value="name">Name (Dollar, Euro, Yen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Time Format</Label>
                  <Select defaultValue="12h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-Translation</CardTitle>
              <CardDescription>Configure automatic translation services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Translation Service</Label>
                <Select defaultValue="google">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Translate</SelectItem>
                    <SelectItem value="deepl">DeepL</SelectItem>
                    <SelectItem value="azure">Azure Translator</SelectItem>
                    <SelectItem value="aws">AWS Translate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Auto-Translation</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically translate new content when added
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};