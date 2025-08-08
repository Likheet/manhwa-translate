export interface TranslationResult {
	originalLanguage: string;
	translatedText: string;
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	fontHeightPx?: number;
	fontColor?: string;
	fontStrokeColor?: string;
	zIndex?: number;
	background?: string; // Base64 encoded string with the original text removed.
}

export interface TranslationResults {
	image: { width: number; height: number };
	translations: TranslationResult[];

	// Optional convenience return.
	// base64 encoded string of the image.
	base64Data?: string;
}

export function scaleTranslation(
	targetWidth: number,
	targetHeight: number,
	originalWidth: number,
	originalHeight: number,
	result: TranslationResult
): TranslationResult {
	const scaleX = targetWidth / originalWidth;
	const scaleY = targetHeight / originalHeight;

	return {
		...result,
		minX: Math.round(scaleX * result.minX),
		minY: Math.round(scaleY * result.minY),
		maxX: Math.round(scaleX * result.maxX),
		maxY: Math.round(scaleY * result.maxY)
	};
}

type Width = number;
type Height = number;

export function calculateResizedAspectRatio(params: {
	width: number;
	height: number;
	widthMaxPx: number;
	heightMaxPx: number;
}): [Width, Height] {
	const { width, height, widthMaxPx, heightMaxPx } = params;
	// `alreadyWithinBounds` intentionally uses `||` instead of `&&`,
	// so that images slightly over bounds are likely not touched.
	// Although experimenting with `&&` instead of `|| may be viable.
	const alreadyWithinBounds = width <= widthMaxPx || height <= heightMaxPx;
	if (alreadyWithinBounds) {
		return [width, height];
	}

	// `Math.max` (vs `Math.min`) is intentionally used to favor larger images.
	const resizedAspectRatio = Math.max(heightMaxPx / height, widthMaxPx / width);
	return [Math.round(width * resizedAspectRatio), Math.round(height * resizedAspectRatio)];
}
