import { getDefaultLanguage, LanguageCode, languageCodes } from './locales';
import { getStorageItem, setStorageItem } from './chromeApi';
import { v4 as uuidv4 } from 'uuid';

export interface AppConfig {
	// Gets the client uuid.
	getClientUuid: () => Promise<string>;

	// Gets the name of the font that should be used for UI strings.
	// eg `text.style.fontFamily = appConfig.getUIFontName();`
	// returns `system-default` for languages that don't have a font file.
	getUIFontFamily: () => string;

	// Set/get the translation model to use when translating manga. Eg 'gpt4o-mini', 'gpt4o', 'deepl', ..
	getTranslationModelId: () => Promise<string | undefined>;
	setTranslationModelId: (modelId: string) => Promise<boolean>;

	// Set/get the language code of the language to translate to.
	getTranslateToLanguage: () => Promise<LanguageCode>;
	setTranslateToLanguage: (languageCode: LanguageCode) => Promise<boolean>;

	// Set/get current user email.
	getEmail: () => Promise<string>;
	setEmail: (email: string) => Promise<boolean>;

	// Set/get configured manga font family.
	getFontFamily: () => Promise<string>;
	setFontFamily: (fontFamily: string) => Promise<boolean>;

	// Set/get the translation cache clear flag. Used to signal the extension to clear the translation cache.
	// `true` means the cache should be cleared.
	getTranslationCacheClearFlag: () => Promise<boolean>;
	setTranslationCacheClearFlag: (flag: boolean) => Promise<boolean>;

	// add/remove/get active translation urls.
	// An active url is a site the extension will scan for translation opportunities.
	getActiveUrls: () => Promise<string[]>;
	addActiveUrl: (activeUrl: string) => Promise<boolean>;
	removeActiveUrl: (activeUrl: string) => Promise<boolean>;
}

enum Keys {
	Email = 'email',
	FontFamily = 'fontFamily',
	ActiveUrls = 'activeUrls',
	ClientUuid = 'clientUuid',
	TranslateToLanguage = 'translateToLanguage',
	TranslationModel = 'translationModel',
	TranslationCacheClearFlag = 'translationCacheClearFlag'
}

export const defaults = Object.freeze({
	email: '',
	fontFamily: 'CC Wild Words',
	fontColor: '#000000',
	fontStrokeColor: '#ffffff',
	fontWeight: 'initial',
	translateToLanguage: getDefaultLanguage(),
	translationModel: 'gpt4o-mini'
});

// Used to check if any of the activeUrl appConfig properties have been accessed.
// This is so defaults can be initialized.
// This cannot be done in chrome.runtime.onInstalled due to that event being triggered on chrome updates,
// and on app updates.
const hasInitActiveUrlDefaults = '_isActiveUrlInitKey';
const commonMangaSites = [];

export const appConfig: AppConfig = Object.freeze({
	getClientUuid: async () => {
		const clientUuid = await getStorageItem<string>(Keys.ClientUuid);
		if (clientUuid) {
			return clientUuid;
		}

		// Initialize client uuid.
		// If storage is full, this could fail repeatedly, but client uuids are not crucial.
		const newUuid = uuidv4();
		await setStorageItem<string>(Keys.ClientUuid, newUuid);
		return newUuid;
	},

	getEmail: async () => (await getStorageItem<string>(Keys.Email)) ?? defaults.email,
	setEmail: async (email: string) => await setStorageItem<string>(Keys.Email, email),

	getTranslationModelId: async () => {
		const translationModel = await getStorageItem<string>(Keys.TranslationModel);
		if (!translationModel) {
			return undefined;
		}

		return translationModel;
	},
	setTranslationModelId: async (modelId: string) =>
		await setStorageItem<string>(Keys.TranslationModel, modelId),

	// Returns the language code of the language to translate to. Eg 'en', 'ja', 'zh-CN', ..
	getTranslateToLanguage: async () => {
		const translateToLanguage = await getStorageItem<LanguageCode>(Keys.TranslateToLanguage);

		if (!translateToLanguage) {
			return getDefaultLanguage();
		}

		return translateToLanguage;
	},
	setTranslateToLanguage: async (languageCode: LanguageCode) => {
		if (!languageCodes.includes(languageCode)) {
			console.warn(`Invalid language code: ${languageCode}. Overwriting with default.`);
			languageCode = getDefaultLanguage();
		}

		return await setStorageItem<LanguageCode>(Keys.TranslateToLanguage, languageCode);
	},
	getUIFontFamily: () => {
		const language = navigator.language.split('-')[0];
		switch (language) {
			// No font file at the moment for these: use whatever the default font is.
			case 'hi':
			case 'th':
			case 'ja':
			case 'ko':
			case 'zh':
			case 'vi':
			case 'ar':
				return 'system-default';
			default:
				return 'PatrickHand-Regular';
		}
	},

	getFontFamily: async () => {
		const fontFamily = (await getStorageItem<string>(Keys.FontFamily)) ?? defaults.fontFamily;
		const language = await appConfig.getTranslateToLanguage();
		switch (language) {
			// These languages are unsupported for the usual font options.
			case 'hi':
			case 'th':
			case 'ja':
			case 'ko':
			case 'zh-CN':
			case 'zh-TW':
			case 'vi':
			case 'ar':
				return 'system-default';
			default:
				return fontFamily;
		}
	},
	setFontFamily: async (fontFamily: string) =>
		await setStorageItem<string>(Keys.FontFamily, fontFamily),

	getTranslationCacheClearFlag: async () => {
		const flag = await getStorageItem<boolean>(Keys.TranslationCacheClearFlag);
		if (flag === undefined) {
			return false;
		}
		return flag;
	},
	setTranslationCacheClearFlag: async (flag: boolean) =>
		await setStorageItem<boolean>(Keys.TranslationCacheClearFlag, flag),

	// Returns the list of active urls.
	getActiveUrls: async () => {
		const hasInitDefaults = await getStorageItem<boolean>(hasInitActiveUrlDefaults);
		if (!hasInitDefaults) {
			await setStorageItem<string[]>(Keys.ActiveUrls, commonMangaSites);
			await setStorageItem<boolean>(hasInitActiveUrlDefaults, true);
		}

		return (await getStorageItem<string[]>(Keys.ActiveUrls)) ?? [];
	},
	addActiveUrl: async (activeUrl: string) => {
		const hasInitDefaults = await getStorageItem<boolean>(hasInitActiveUrlDefaults);
		if (!hasInitDefaults) {
			await setStorageItem<string[]>(Keys.ActiveUrls, commonMangaSites);
			await setStorageItem<boolean>(hasInitActiveUrlDefaults, true);
		}

		const activeUrls = (await getStorageItem<string[]>(Keys.ActiveUrls)) ?? [];
		return await setStorageItem<string[]>(Keys.ActiveUrls, [...activeUrls, activeUrl]);
	},
	removeActiveUrl: async (activeUrl: string) => {
		const hasInitDefaults = await getStorageItem<boolean>(hasInitActiveUrlDefaults);
		if (!hasInitDefaults) {
			await setStorageItem<string[]>(Keys.ActiveUrls, commonMangaSites);
			await setStorageItem<boolean>(hasInitActiveUrlDefaults, true);
		}

		const activeUrls = (await getStorageItem<string[]>(Keys.ActiveUrls)) ?? [];
		return await setStorageItem<string[]>(
			Keys.ActiveUrls,
			activeUrls.filter(url => url !== activeUrl)
		);
	}
});
