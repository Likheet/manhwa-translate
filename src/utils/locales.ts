const m = chrome.i18n.getMessage;

// Supported language codes.
export type LanguageCode =
	| 'ar'
	| 'de'
	| 'en'
	| 'es'
	| 'fr'
	| 'hi'
	| 'id'
	| 'it'
	| 'ja'
	| 'ko'
	| 'pl'
	| 'pt-BR'
	| 'pt-PT'
	| 'ru'
	| 'th'
	| 'vi'
	| 'zh-CN'
	| 'zh-TW';

export const languageCodes: LanguageCode[] = [
	'ar',
	'de',
	'en',
	'es',
	'fr',
	'hi',
	'id',
	'it',
	'ja',
	'ko',
	'pl',
	'pt-BR',
	'pt-PT',
	'ru',
	'th',
	'vi',
	'zh-CN',
	'zh-TW'
];

export function getDefaultLanguage(): LanguageCode {
	const fullLang = navigator.language;

	const shortLang = navigator.language.split('-')[0];
	const firstShortLang = languageCodes.find(lang => lang.startsWith(shortLang));

	if (languageCodes.includes(fullLang as LanguageCode)) {
		return fullLang as LanguageCode;
	} else if (firstShortLang) {
		return firstShortLang;
	} else {
		return 'en';
	}
}

export function getDisplayString(languageCode: LanguageCode): string {
	switch (languageCode) {
		case 'ar':
			return m('translateToArabicLabel');
		case 'de':
			return m('translateToGermanLabel');
		case 'en':
			return m('translateToEnglishLabel');
		case 'es':
			return m('translateToSpanishLabel');
		case 'fr':
			return m('translateToFrenchLabel');
		case 'hi':
			return m('translateToHindiLabel');
		case 'id':
			return m('translateToIndonesianLabel');
		case 'it':
			return m('translateToItalianLabel');
		case 'ja':
			return m('translateToJapaneseLabel');
		case 'ko':
			return m('translateToKoreanLabel');
		case 'pl':
			return m('translateToPolishLabel');
		case 'pt-BR':
			return m('translateToBrazilianPortugueseLabel');
		case 'pt-PT':
			return m('translateToPortugueseLabel');
		case 'ru':
			return m('translateToRussianLabel');
		case 'th':
			return m('translateToThaiLabel');
		case 'vi':
			return m('translateToVietnameseLabel');
		case 'zh-CN':
			return m('translateToChineseSimplifiedLabel');
		case 'zh-TW':
			return m('translateToChineseTraditionalLabel');
		default:
			return 'Unknown';
	}
}
