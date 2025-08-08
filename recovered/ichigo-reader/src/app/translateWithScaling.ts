import { debug, translateImage } from '../utils/ichigoApi';
import { getBase64Data } from './utils/imageUtils';
import { TranslationResults, calculateResizedAspectRatio } from '../utils/translation';
import { fastHash } from './utils/fastHash';
import { LanguageCode } from '../utils/locales';
import { appConfig } from '../utils/appConfig';

const translationCache = {};

interface Image {
	width: number;
	height: number;
	base64Data?: string;

	// URL of the image to translate. May be base64 data.
	// Either `src` or `base64Data` must be set.
	src?: string;
}

// Note this can only be called from contexts which can make HTTP requests.
// For example, `background.ts`.
export async function translate(
	originalImage: Image,
	translateTo: LanguageCode,
	translationModel?: string,
	includeBase64Data?: boolean
): Promise<TranslationResults | 'FetchError' | 'SiteAccessError'> {
	// Check if we should clear the translation cache.
	const clearTranslationCacheFlag = await appConfig.getTranslationCacheClearFlag();
	if (clearTranslationCacheFlag) {
		Object.keys(translationCache).forEach(key => {
			delete translationCache[key];
		});
		await appConfig.setTranslationCacheClearFlag(false);
	}

	let imageToTranslate = originalImage;

	if (imageToTranslate.base64Data === undefined && originalImage.src) {
		const fetchedImage = await fetchImageWithScaling(originalImage);
		const failed = fetchedImage === 'FetchError' || fetchedImage === 'SiteAccessError';
		if (failed) {
			// Return the error to the caller.
			return fetchedImage;
		}

		imageToTranslate = fetchedImage;
	}

	// If we couldn't get base64 data from the original image or with `fetchImageWithScaling`, return failure.
	if (imageToTranslate.base64Data === undefined) {
		return 'FetchError';
	}

	// Cache translations on the MD5 hash of the image data.
	// The URL is not used as the key because it may return different results depending on various factors.
	const imageIdentity =
		translateTo + (translationModel ?? ':unknown:') + fastHash(imageToTranslate.base64Data);
	const cachedTranslation = translationCache[imageIdentity];
	const result =
		cachedTranslation ||
		(await translateImage(translateTo, imageToTranslate.base64Data, translationModel));

	if (!result.errorMessage) {
		translationCache[imageIdentity] = result;
	}

	const base64Data = includeBase64Data && imageToTranslate.base64Data;

	return {
		image: { width: imageToTranslate.width, height: imageToTranslate.height },
		translations: result.translations,
		base64Data
	};
}

async function fetchImageWithScaling(image: Image) {
	// Downscale extra large images. Helps prevent processing timeouts.
	const [resizedWidth, resizedHeight] = calculateResizedAspectRatio({
		width: image.width,
		height: image.height,
		heightMaxPx: 1800,
		widthMaxPx: 1800
	});

	debug(`h:${resizedHeight} w:${resizedWidth}`);

	const resizedImage = {
		...image,
		originalWidth: image.width,
		originalHeight: image.height,
		resizedWidth,
		resizedHeight
	};

	const encodedImage = await getBase64Data(resizedImage as any);
	return encodedImage;
}
