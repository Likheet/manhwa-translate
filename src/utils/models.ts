export interface TranslationModelData {
	id: string;
	name: string;
	description?: string;
	supportedLanguages?: string[];
}

export interface ModelConfig {
	defaultModel: string;
	availableModels: TranslationModelData[];
}

export const defaultModels: TranslationModelData[] = [
	{
		id: 'manga-translator-v1',
		name: 'Manga Translator v1',
		description: 'Default manga translation model',
		supportedLanguages: ['ja', 'ko', 'zh', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru']
	}
];
