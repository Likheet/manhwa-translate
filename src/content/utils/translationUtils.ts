import { getBackgroundUrl } from './elementUtils';

export function checkCanTranslateImage(image: HTMLImageElement) {
	if (!image.src) {
		false;
	}

	// Don't translate images with no width or height.
	// Implicit width/height images: <image src="..." /> still have the width and height property set.
	if (!image.height || !image.width) {
		return false;
	}

	// Don't translate small images.
	if (image.height < 300 || image.width < 300) {
		return false;
	}

	const isLoading = !image.complete || image.naturalHeight === 0;
	if (isLoading) {
		return false;
	}

	return true;
}

export function checkCanTranslateCanvas(canvas: HTMLCanvasElement) {
	if (!canvas.width || !canvas.height) {
		return false;
	}

	// Don't translate small canvases.
	if (canvas.height < 300 || canvas.width < 300) {
		return false;
	}

	return true;
}

export function checkCanTranslateBgImageElement(element: HTMLElement) {
	// Don't translate small elements.
	if (element.clientHeight < 300 || element.clientWidth < 300) {
		return false;
	}

	if (!getBackgroundUrl(element)) {
		return false;
	}

	return true;
}
