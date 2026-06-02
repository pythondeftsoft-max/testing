export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  countryCode: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'GB' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countryCode: 'ES' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', countryCode: 'BR' },
  { code: 'fr', name: 'French', nativeName: 'Français', countryCode: 'FR' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', countryCode: 'IT' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', countryCode: 'DE' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', countryCode: 'VN' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', countryCode: 'CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', countryCode: 'JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', countryCode: 'KR' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', countryCode: 'IN' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', countryCode: 'RU' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'SA', rtl: true },
];

export const DEFAULT_LANGUAGE = 'en';

export const getLanguageByCode = (code: string): SupportedLanguage | undefined => 
  SUPPORTED_LANGUAGES.find(lang => lang.code === code);

export const getLanguageByCountryCode = (countryCode: string): SupportedLanguage | undefined =>
  SUPPORTED_LANGUAGES.find(lang => lang.countryCode === countryCode);
