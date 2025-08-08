import { postBackgroundMessage } from '../utils/chromeApi';
import { appConfig, defaults } from '../utils/appConfig';
import { TranslationResults, calculateResizedAspectRatio } from '../utils/translation';
import { createShadowOverlay } from './utils/createShadowOverlay';
import {
	createCtaButtonBar,
	createUnlockerDownloadButtonBar,
	createSiteAccessButtonBar
} from './utils/buttonBars';
import { shadowDomRootClassName } from './utils/shadowDomUtils';
import { ensureStylesInjected } from './utils/injectStyles';
import {
	checkCanTranslateCanvas,
	checkCanTranslateBgImageElement,
	checkCanTranslateImage
} from './utils/translationUtils';
import { fitText } from './utils/fitText';
import { sleepMs } from './utils/utils';
import { bangersRegular } from './embeddedFonts/bangersRegular';
import { kalam } from './embeddedFonts/kalam';
import { komikaJam } from './embeddedFonts/komikaJam';
import { komikaSlim } from './embeddedFonts/komikaSlim';
import { vtcLettererPro } from './embeddedFonts/vtcLettererPro';
import { ccWildWords } from './embeddedFonts/ccWildWords';
import { getOriginalFontSize } from './utils/getOriginalFontSize';
import {
	checkIsBgImageElement,
	checkIsCanvasElement,
	checkIsImageElement,
	getBackgroundUrl
} from './utils/elementUtils';
import { fastHash } from './utils/fastHash';

const m = chrome.i18n.getMessage;

// Necessary because TypeScript does not support this out of box yet.
declare class ResizeObserver {
	constructor(listener: any);
	observe: (element: any) => void;
}

let shadowDom: ShadowRoot | null = null;
const finishedImageHashes = new Set<string>();
const finishedElementTranslations = new Set<HTMLElement>();

onPageInject();
const retryTimeMs = 1000;
window.setInterval(onPageInject, retryTimeMs);

const resizeObserver = new ResizeObserver(entries => {
	const addedElements: Set<HTMLElement> = new Set();
	for (const entry of entries) {
		const element = entry.target;
		if (checkIsImageElement(element) && checkCanTranslateImage(element)) {
			addedElements.add(element as HTMLImageElement);
		} else if (checkIsCanvasElement(element) && checkCanTranslateCanvas(element)) {
			addedElements.add(element as HTMLCanvasElement);
		} else if (checkIsBgImageElement(element) && checkCanTranslateBgImageElement(element)) {
			addedElements.add(element as HTMLElement);
		}
	}

	for (const image of addedElements) {
		translate(image);
	}
});

// Listen for newly added elements to translate.
const observer = new MutationObserver(async mutations => {
	// Check if user has turned on translations for page.
	const activeUrls = await appConfig.getActiveUrls();
	const currentHostName = window.location.hostname;
	const shouldTranslatePage = activeUrls.includes(currentHostName);
	if (!shouldTranslatePage) {
		return;
	}

	const addedImages: Set<HTMLElement> = new Set();
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (checkIsImageElement(addedNode)) {
				// Attach observer in case image changes size.
				// This is typically done on some sites that lazy load images.
				resizeObserver.observe(addedNode);
			}

			if (checkIsImageElement(addedNode) && checkCanTranslateImage(addedNode)) {
				addedImages.add(addedNode as HTMLImageElement);
			} else if (checkIsCanvasElement(addedNode) && checkCanTranslateCanvas(addedNode)) {
				addedImages.add(addedNode as HTMLCanvasElement);
			} else if (
				checkIsBgImageElement(addedNode) &&
				checkCanTranslateBgImageElement(addedNode)
			) {
				addedImages.add(addedNode as HTMLElement);
			}
		}
	}

	for (const image of addedImages) {
		translate(image);
	}
});

observer.observe(document, { childList: true, subtree: true });

async function onPageInject() {
	// Check if user has turned on translations for page.
	const activeUrls = await appConfig.getActiveUrls();
	const currentHostName = window.location.hostname;
	const shouldTranslatePage = activeUrls.includes(currentHostName);
	if (!shouldTranslatePage) {
		return;
	}

	if (document.getElementsByClassName(shadowDomRootClassName).length === 0) {
		// Clear old `finishedTranslationRequests` (for when translations are toggled on/off)
		finishedElementTranslations.clear();

		// Setup shadowDom (which may be cleared when translations are toggled on/off)
		const body = document.body;
		const head = document.head;
		const shadowRoot = body ?? head;
		const shadowRootDiv: HTMLDivElement = document.createElement('div');
		shadowRootDiv.className = shadowDomRootClassName;
		shadowRoot.append(shadowRootDiv);
		shadowDom = shadowRootDiv.attachShadow({ mode: 'open' });
	}

	ensureStylesInjected(shadowDom);

	const images = [...document.querySelectorAll('img')].filter(checkCanTranslateImage);
	const canvases = [...document.querySelectorAll('canvas')].filter(checkCanTranslateCanvas);
	const bgElements: HTMLElement[] = getElementsWithBackgroundUrl().filter(
		checkCanTranslateBgImageElement
	);
	const elements = new Set<HTMLElement>([...images, ...canvases, ...bgElements]);

	for (const element of elements) {
		translate(element);
	}
}

async function translate(element: HTMLElement): Promise<void> {
	/*
	 * BUG: If an overlay is removed because the user goes to the next page, and then navigates back,
	 * the overlay will not reappear as it's already in an "outgoingTranslationRequest".
	 * Could potentially mark each element with metadata to prevent this.
	 */
	if (finishedElementTranslations.has(element)) {
		return;
	}

	// Lock element.
	finishedElementTranslations.add(element);

	// Check if element content is already in the set of finished translations.
	// This can happen if the overlay is removed on an already translated image.
	const currentHash = hash(element);
	if (currentHash && finishedImageHashes.has(currentHash)) {
		return;
	}

	// Occurs when:
	// - element src changes (except when done by the extension).
	// - element is no longer part of document.body.
	// - element is hidden.
	const onRemoved = () => {
		finishedElementTranslations.delete(element);
	};

	// Occurs when:
	// - element is resized.
	// - element intersection changes.
	// - element is mutated.
	// - element is moved.
	const onChanged = () => {
		// Canvases must be checked any time the overlay changes, because the website may have changed the canvas.
		if (checkIsCanvasElement(element)) {
			finishedElementTranslations.delete(element);
		}
	};

	const overlay = createShadowOverlay(
		shadowDom as unknown as HTMLElement,
		element,
		onRemoved,
		onChanged
	);
	overlay.setLoading(true);

	const fontFamily = await appConfig.getFontFamily();

	// Canvas context invalidated after async call.
	if (checkIsCanvasElement(element) && currentHash !== hash(element)) {
		finishedElementTranslations.delete(element);
		overlay.remove();
		return;
	}

	const response = await waitForTranslation(element, overlay, fontFamily);

	// Canvas context invalidated after async call.
	if (checkIsCanvasElement(element) && currentHash !== hash(element)) {
		finishedElementTranslations.delete(element);
		overlay.remove();
		return;
	}

	// Toggle off loading spinners and display messages.
	overlay.setLoading(false);
	overlay.removeHeaderMessage();

	// Can happen on unexpected error.
	if (response == null) {
		return;
	}

	if (response === 'FetchError') {
		await overlay.addSystemMessage(m('fetchErrorMessage'), createUnlockerDownloadButtonBar());
		return;
	}

	if (response === 'SiteAccessError') {
		await overlay.addSystemMessage(m('siteAccessErrorMessage'), createSiteAccessButtonBar());
		return;
	}

	const hasTranslations = response.translations.length !== 0;
	if (!hasTranslations) {
		// Probably safe to do this for images too, if we update the code to invalidate context on images.
		if (checkIsCanvasElement(element)) {
			finishedImageHashes.add(currentHash);
		}
		return;
	}

	for (const textBox of response.translations) {
		/** HACK: Special state for out of translations. */
		const isOutOfTranslations =
			textBox.translatedText ===
			'Out of translations. Server costs are expensive. Upgrade for more!';

		if (isOutOfTranslations) {
			await overlay.addSystemMessage(m('feedServerHamstersMessage'), createCtaButtonBar());
			return;
		}
	}

	// Place translated text on image.
	const canvas = await overlayTranslations(response.base64Data, response);
	finishedElementTranslations.add(canvas);

	// Canvas context invalidated after async call.
	if (checkIsCanvasElement(element) && currentHash !== hash(element)) {
		finishedElementTranslations.delete(element);
		overlay.remove();
		return;
	}

	element.dataset.originalSrc = response.base64Data;

	if (checkIsCanvasElement(element)) {
		const ctx = element.getContext('2d', { willReadFrequently: true });
		ctx.drawImage(canvas, 0, 0);
	} else {
		// Replace the image with the canvas right away to reduce time to display.
		canvas.className = element.className;
		copyStyles(element, canvas);
		element.replaceWith(canvas);

		// Now convert to image.
		const base64 = canvas.toDataURL();
		if (checkIsImageElement(element)) {
			element.src = base64;
		} else {
			element.style.backgroundImage = `url("${base64}")`;
		}

		canvas.replaceWith(element);

		// Remove source elements to prevent them from being displayed instead of the translated image.
		// Most sites do not use `picture` elements, so this is not a common issue.
		if (checkIsImageElement(element)) {
			removeSourceElements(element);
		}
	}

	finishedImageHashes.add(hash(element));
}

async function waitForTranslation(element: HTMLElement, overlay: any, fontFamily: string) {
	let response: TranslationResults | 'FullQueue' | 'FetchError' | 'SiteAccessError';

	let src: string | undefined = undefined;
	const [width, height, base64Data] = await getBase64Data(element);

	if (checkIsCanvasElement(element)) {
		// Some canvases are only accessibly when running in unlocked mode.
		if (base64Data === undefined) {
			return 'FetchError';
		}
	} else if (checkIsImageElement(element)) {
		src = element.src;
	} else {
		src = getBackgroundUrl(element);
	}

	const translateTo = await appConfig.getTranslateToLanguage();
	const translationModel = await appConfig.getTranslationModelId();

	do {
		response = await postBackgroundMessage({
			kind: 'translateImage',
			image: {
				src,
				width,
				height,
				base64Data
			},
			translateTo,
			translationModel,
			includeBase64Data: true
		});

		if (response === 'FullQueue') {
			overlay.displayHeaderMessage('Queued', fontFamily);
			await sleepMs(1000);
		}
	} while (response === 'FullQueue');

	return response;
}

async function overlayTranslations(
	imageBase64: string,
	translationResults: TranslationResults
): Promise<HTMLCanvasElement> {
	translationResults = {
		...translationResults,
		translations: [...translationResults.translations]
	};

	// Order translations in ascending order of z-index.
	// This is so lower priority text boxes are drawn first and later ones will be drawn on top.
	translationResults.translations.sort((a, b) => {
		// HACK: Give empty text boxes lower z-index. This should be handled on the backend in the future.
		const bZIndex = b.translatedText === '   ' ? 0 : b.zIndex ?? 1;
		const aZIndex = a.translatedText === '   ' ? 0 : a.zIndex ?? 1;
		return aZIndex - bZIndex;
	});

	const fontFamily = await appConfig.getFontFamily();
	const maxZindex = '2147483647';

	const image = await loadImage(imageBase64);

	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;

	const context = canvas.getContext('2d', { willReadFrequently: true });
	context.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);

	const textBoxes: HTMLDivElement[] = [];
	const yScale = image.height / translationResults.image.height;
	const xScale = image.width / translationResults.image.width;

	for (const translation of translationResults.translations) {
		const textBox = document.createElement('div');
		const textBoxWidth = (translation.maxX - translation.minX) * xScale;
		const textBoxHeight = (translation.maxY - translation.minY) * yScale;
		const fontColor = translation.fontColor ?? defaults.fontColor;

		textBox.style.all = 'initial';
		textBox.style.lineHeight = '1.25';
		textBox.style.textAlign = 'center';
		textBox.style.backgroundColor = 'white';
		textBox.style.position = 'absolute';
		textBox.style.borderRadius = '8px';
		textBox.style.width = `${textBoxWidth}px`;
		textBox.style.height = `${textBoxHeight}px`;
		textBox.style.color = fontColor;
		textBox.style.fontFamily = fontFamily;
		textBox.style.position = 'absolute';
		textBox.style.zIndex = translation.zIndex ? `${translation.zIndex}` : maxZindex;
		textBox.style.top = '-1000px'; // Keep text box out of view of user.
		textBox.textContent = translation.translatedText;
		document.body.append(textBox);
		textBoxes.push(textBox);
	}

	// Draw backgrounds onto canvas. This was originally done in the SVGs as a `background-image`.
	// However, doing it here allows the SVGs to more easily add padding or other manipulations
	// without also having to manipulate the background.
	// In addition, some browsers such as the Orion Browser on iOS do not support backgrounds on SVG foreignObjects.
	const drawBackgroundsPromise = Promise.all(
		translationResults.translations.map(async translation => {
			const background = translation.background;
			const textBoxWidth = (translation.maxX - translation.minX) * xScale;
			const textBoxHeight = (translation.maxY - translation.minY) * yScale;
			const minX = translation.minX;
			const minY = translation.minY;

			if (background) {
				const backgroundImage = await loadImage(background);
				backgroundImage.style.borderRadius = '8px';
				context.drawImage(
					backgroundImage,
					0,
					0,
					backgroundImage.width,
					backgroundImage.height,
					minX * xScale,
					minY * yScale,
					textBoxWidth,
					textBoxHeight
				);
			} else {
				drawRoundedRect(
					context,
					minX * xScale,
					minY * yScale,
					textBoxWidth,
					textBoxHeight,
					'white',
					8 // border radius px.
				);
			}
		})
	);

	await fitText(
		textBoxes,
		translationResults.translations.map(translation => {
			return getOriginalFontSize(
				fontFamily,
				translation.fontHeightPx && yScale * translation.fontHeightPx
			);
		})
	);

	// HACK: Add a little width+height to each text box, because for some unknown reason,
	// the text can be cut off even if scrollHeight is equal to clientHeight.
	for (const textBox of textBoxes) {
		const currentHeight = parseInt(textBox.style.height, 10);
		const currentWidth = parseInt(textBox.style.width, 10);
		textBox.style.height = `${currentHeight + 10}px`;
		textBox.style.width = `${currentWidth + 10}px`;
	}

	const svgImages = await Promise.all(
		translationResults.translations.map(async (translation, i) => {
			const width = parseInt(textBoxes[i].style.width, 10);
			const height = parseInt(textBoxes[i].style.height, 10);
			const fontColor = translation.fontColor ?? defaults.fontColor;
			const fontStrokeColor = translation.fontStrokeColor ?? defaults.fontStrokeColor;

			const svgImage = await textToImage(
				width,
				height,
				translation.translatedText,
				fontFamily,
				textBoxes[i].style.fontSize,
				fontColor,
				fontStrokeColor,
				textBoxes[i].style.zIndex
			);
			return svgImage;
		})
	);

	// Wait for all background images to be drawn before drawing text.
	await drawBackgroundsPromise;

	const svgCoords: [HTMLImageElement, number, number][] = [];

	// Fit the SVGs onto the canvas.
	for (const [i, svgImage] of svgImages.entries()) {
		const translation = translationResults.translations[i];

		const originalWidth = (translation.maxX - translation.minX) * xScale;
		const originalHeight = (translation.maxY - translation.minY) * yScale;

		const currentWidth = parseInt(textBoxes[i].style.width, 10);
		const currentHeight = parseInt(textBoxes[i].style.height, 10);

		// SVG size can diverge from the actual size of the text box to fit the text better.
		// In this case, we need to adjust the coordinates to better align.
		let dx = xScale * translation.minX;
		let dy = yScale * translation.minY;

		if (currentWidth > originalWidth) {
			dx -= Math.abs(currentWidth - originalWidth) / 2; // Shift left.
		}

		if (currentHeight > originalHeight) {
			dy -= Math.abs(currentHeight - originalHeight) / 2; // Shift up.
		}

		svgCoords.push([svgImage, dx, dy]);
	}

	// Try to fix any overlapping SVGs.
	for (let i = 0; i < svgCoords.length; i++) {
		const [svgImage, dx, dy] = svgCoords[i];
		const [svgWidth, svgHeight] = [svgImage.width, svgImage.height];

		for (let j = i + 1; j < svgCoords.length; j++) {
			const [otherSvgImage, otherDx, otherDy] = svgCoords[j];
			const [otherWidth, otherHeight] = [otherSvgImage.width, otherSvgImage.height];

			/**
			 * If there is an overlap, shift the current SVG in the direction
			 * that will cause the least amount of overlap. Capped to prevent excessive shifting.
			 */
			const overlapX = Math.min(dx + svgWidth, otherDx + otherWidth) - Math.max(dx, otherDx);
			const overlapY =
				Math.min(dy + svgHeight, otherDy + otherHeight) - Math.max(dy, otherDy);

			if (overlapX > 0 && overlapY > 0) {
				// Calculate the shift direction and magnitude needed to resolve the overlap.
				let shiftX = dx < otherDx ? -overlapX : overlapX;
				let shiftY = dy < otherDy ? -overlapY : overlapY;

				// Limit the shift to a maximum of 1.5%.
				const unitX = (1.5 / 100) * canvas.width;
				const unitY = (1.5 / 100) * canvas.height;
				shiftX = Math.sign(shiftX) * Math.min(Math.abs(shiftX), unitX);
				shiftY = Math.sign(shiftY) * Math.min(Math.abs(shiftY), unitY);

				// Update the coordinates of the current SVG
				svgCoords[i][1] += shiftX;
				svgCoords[i][2] += shiftY;

				// Cap the coordinates if they're off the canvas.
				svgCoords[i][1] = Math.max(0, svgCoords[i][1]);
				svgCoords[i][2] = Math.max(0, svgCoords[i][2]);

				const maxDx = canvas.width - svgWidth; // Max x coordinate without clipping.
				const maxDy = canvas.height - svgHeight; // Max y coordinate without clipping.

				svgCoords[i][1] = Math.min(maxDx, svgCoords[i][1]);
				svgCoords[i][2] = Math.min(maxDy, svgCoords[i][2]);
			}
		}
	}

	for (const svgCoord in svgCoords) {
		const [svgImage, dx, dy] = svgCoords[svgCoord];
		context.drawImage(
			svgImage,
			0,
			0,
			svgImage.width,
			svgImage.height,
			dx,
			dy,
			svgImage.width,
			svgImage.height
		);
	}

	for (const textBox of textBoxes) {
		textBox.remove();
	}

	return canvas;
}

async function textToImage(
	width: number,
	height: number,
	text: string,
	fontFamily: string,
	fontSize: string,
	fontColor: string,
	fontStrokeColor: string,
	zIndex: string
) {
	let fontStyle;
	switch (fontFamily) {
		case 'Bangers Regular':
			fontStyle = bangersRegular;
			break;
		case 'Kalam':
			fontStyle = kalam;
			break;
		case 'Komika Jam':
			fontStyle = komikaJam;
			break;
		case 'Komika Slim':
			fontStyle = komikaSlim;
			break;
		case 'VTC Letterer Pro':
			fontStyle = vtcLettererPro;
			break;
		case 'CC Wild Words':
			fontStyle = ccWildWords;
			break;
		default:
			fontStyle = ccWildWords;
			break;
	}
	const url =
		'data:image/svg+xml,' +
		encodeURIComponent(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">
<style>
${fontStyle}
</style>
<div xmlns="http://www.w3.org/1999/xhtml" style="
		font-family: ${fontFamily};
		color: ${fontColor};
		background-color: transparent;
		width: ${width}px;
		height: ${height}px;
		place-items: center;
		display: grid;
		text-align: center;
		font-size: ${fontSize};
		z-index: ${zIndex};
		line-height: 1.25;
		text-rendering: optimizeLegibility;
		font-smooth: never;
		-webkit-font-smoothing: subpixel-antialiased;
		border-radius: 8px;
		text-shadow:
			calc(3px*1) calc(3px*0) 0 ${fontStrokeColor},
			calc(3px*0.924) calc(3px*0.383) 0 ${fontStrokeColor},
			calc(3px*0.707) calc(3px*0.707) 0 ${fontStrokeColor},
			calc(3px*0.383) calc(3px*0.924) 0 ${fontStrokeColor},
			calc(3px*0) calc(3px*1) 0 ${fontStrokeColor},
			calc(3px*-0.383) calc(3px*0.924) 0 ${fontStrokeColor},
			calc(3px*-0.707) calc(3px*0.707) 0 ${fontStrokeColor},
			calc(3px*-0.924) calc(3px*0.3827) 0 ${fontStrokeColor},
			calc(3px*-1) calc(3px*0) 0 ${fontStrokeColor},
			calc(3px*-0.924) calc(3px*-0.383) 0 ${fontStrokeColor},
			calc(3px*-0.707) calc(3px*-0.707) 0 ${fontStrokeColor},
			calc(3px*-0.383) calc(3px*-0.924) 0 ${fontStrokeColor},
			calc(3px*0) calc(3px*-1) 0 ${fontStrokeColor},
			calc(3px*0.383) calc(3px*-0.924) 0 ${fontStrokeColor},
			calc(3px*0.707) calc(3px*-0.707) 0 ${fontStrokeColor},
			calc(3px*0.924) calc(3px*-0.383) 0 ${fontStrokeColor};
	"
>
	${escapeHtml(text)}
</div>
</foreignObject>
</svg>`
		);

	const svg = await loadImage(url);
	return svg;
}

// Returns the original image if the clone fails.
function cloneFullSizedImage(image: HTMLImageElement): Promise<HTMLImageElement> {
	return new Promise<HTMLImageElement>(resolve => {
		const clone = image.cloneNode() as HTMLImageElement;
		clone.width = image.naturalWidth;
		clone.height = image.naturalHeight;
		clone.onload = () => resolve(clone);
		clone.onerror = () => resolve(image);
	});
}

async function getBase64Data(element: HTMLElement): Promise<[number, number, string | undefined]> {
	// Full sized images are better for OCR.
	if (
		checkIsImageElement(element) &&
		element.naturalWidth > element.width &&
		element.naturalHeight > element.height
	) {
		element = await cloneFullSizedImage(element);
	} else if (checkIsBgImageElement(element)) {
		// Convert elements with background images into images.
		const image = await loadImage(getBackgroundUrl(element) ?? '');
		element = image;
	}

	assert(checkIsImageElement(element) || checkIsCanvasElement(element));

	// Downscale extra large images. Helps prevent processing timeouts.
	const [resizedWidth, resizedHeight] = calculateResizedAspectRatio({
		width: element.width,
		height: element.height,
		heightMaxPx: 1800,
		widthMaxPx: 1800
	});

	try {
		const canvas = document.createElement('canvas');
		canvas.width = resizedWidth;
		canvas.height = resizedHeight;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		context.drawImage(element, 0, 0, resizedWidth, resizedHeight);
		const result = canvas.toDataURL();
		return [resizedWidth, resizedHeight, result];
	} catch {
		/** This can happen when not running in unlocked mode.
		 * This is due to the canvas being tainted.
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
		 * Additionally, the background script adds headers to special sites that are not available here.
		 * It can fail in those cases too.*/

		// We didn't actually resize, so return the original size.
		if (checkIsImageElement(element)) {
			return [element.naturalWidth, element.naturalHeight, undefined];
		} else {
			return [element.width, element.height, undefined];
		}
	}
}

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function copyStyles(sourceElement, targetElement) {
	const computedStyles = window.getComputedStyle(sourceElement);
	for (let i = 0; i < computedStyles.length; i++) {
		const property = computedStyles[i];
		targetElement.style[property] = computedStyles.getPropertyValue(property);
	}

	const sourceStyles = sourceElement.style;
	for (let i = 0; i < sourceStyles.length; i++) {
		const styleName = sourceStyles[i];
		targetElement.style[styleName] = sourceStyles[styleName];
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise(resolve => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => resolve(image);
		image.src = src;
	});
}

function assert(condition: any): asserts condition {
	if (!condition) {
		throw new Error('Assertion failure');
	}
}

function drawRoundedRect(ctx, x, y, width, height, color, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.stroke();
}

function getElementsWithBackgroundUrl() {
	const allElements = document.getElementsByTagName('*');
	const elementsWithBackgroundUrl = [];

	for (let element of allElements) {
		if (checkIsBgImageElement(element)) {
			elementsWithBackgroundUrl.push(element);
		}
	}

	return elementsWithBackgroundUrl;
}

function hash(element: HTMLElement): string | undefined {
	if (checkIsImageElement(element)) {
		return fastHash(element.src);
	} else if (checkIsCanvasElement(element)) {
		return hashCanvas(element);
	} else if (checkIsBgImageElement(element)) {
		return fastHash(getBackgroundUrl(element));
	}

	return undefined;
}

function hashCanvas(canvas: HTMLCanvasElement): string {
	if (canvas.width === 0 || canvas.height === 0) {
		return '';
	}

	const context = canvas.getContext('2d', { willReadFrequently: true });
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

	let hash = '';
	const len = imageData.length;
	const selectCount = 150;

	// Select the first 150 characters.
	for (let i = 0; i < selectCount && i < len; i++) {
		hash += imageData[i].toString();
	}

	// Select the last 150 characters.
	for (let i = len - selectCount; i < len; i++) {
		if (i >= 0) {
			hash += imageData[i].toString();
		}
	}

	const step = Math.ceil(len / 1000) + 1;
	for (let i = 0; i < len; i += step) {
		hash += imageData[i].toString();
	}

	return hash.toString();
}

function removeSourceElements(element: HTMLImageElement) {
	const parent = element.parentElement;
	if (parent?.tagName === 'PICTURE') {
		const sources = parent.querySelectorAll('source');
		for (const source of sources) {
			source.remove();
		}
	}
}
