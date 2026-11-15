export interface Language {
  code: string;
  native: string;
  english: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'ur', native: 'اردو', english: 'Urdu' },
  { code: 'es', native: 'Español de España', english: 'European Spanish' },
  { code: 'es-419', native: 'Español de Latinoamérica', english: 'Latin American Spanish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'pt-BR', native: 'Português do Brasil', english: 'Brazilian Portuguese' },
  { code: 'pt', native: 'Português', english: 'European Portuguese' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
  { code: 'sv', native: 'Svenska', english: 'Swedish' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'zh-CN', native: '简体中文', english: 'Simplified Chinese' },
  { code: 'zh-TW', native: '繁體中文', english: 'Traditional Chinese' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'th', native: 'ภาษาไทย', english: 'Thai' },
  { code: 'fil', native: 'Filipino', english: 'Filipino' },
];
