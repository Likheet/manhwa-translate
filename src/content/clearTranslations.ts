import { ichigoReaderElementClassName } from './utils/createShadowOverlay';
import { checkIsImageElement, checkIsCanvasElement } from './utils/elementUtils';

{
	// Revert canvases and images to their original src.
	let tries = 0;
	while (document.querySelectorAll('[data-original-src]').length !== 0) {
		if (tries > 5) {
			break;
		}
		for (const element of document.querySelectorAll('[data-original-src]')) {
			if (checkIsCanvasElement(element)) {
				const originalSrc = element.getAttribute('data-original-src')!;
				const originalImage = new Image();
				originalImage.onload = () => {
					element.width = originalImage.width;
					element.height = originalImage.height;
					const context = element.getContext('2d');
					if (context) {
						context.drawImage(originalImage, 0, 0);
					}
					element.removeAttribute('data-original-src');
					element.removeAttribute('data-translated');
				};
				originalImage.src = originalSrc;
			} else if (checkIsImageElement(element)) {
				element.setAttribute('src', element.getAttribute('data-original-src')!);
				element.removeAttribute('data-original-src');
				element.removeAttribute('data-translated');
			} else {
				// Element with a background image.
				const originalSrc = element.getAttribute('data-original-src');
				if ((element as any)?.style?.backgroundImage && originalSrc) {
					(element as any).style.backgroundImage = `url("${originalSrc}")`;
					element.removeAttribute('data-original-src');
					element.removeAttribute('data-translated');
				}
			}
		}
		tries++;
	}
}

{
	// Remove any overlays or loading spinners.
	let tries = 0;
	while (document.getElementsByClassName(ichigoReaderElementClassName).length !== 0) {
		if (tries > 5) {
			break;
		}
		for (const element of document.getElementsByClassName(ichigoReaderElementClassName)) {
			element.remove();
		}
		tries++;
	}
}
