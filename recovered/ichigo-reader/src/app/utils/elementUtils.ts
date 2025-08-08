export function checkIsImageElement(node: Node): node is HTMLImageElement {
	return node.nodeName.toLowerCase() === 'img';
}

export function checkIsCanvasElement(node: Node): node is HTMLCanvasElement {
	return node.nodeName.toLowerCase() === 'canvas';
}

export function checkIsBgImageElement(node: Node): node is HTMLElement {
	if (!node || node.nodeType !== Node.ELEMENT_NODE || !(node instanceof HTMLElement)) {
		return false;
	}

	if (checkIsImageElement(node) || checkIsCanvasElement(node)) {
		return false;
	}

	const element = node as HTMLElement;

	// Computed styles.
	const computedStyle = window.getComputedStyle(element);
	const cbackgroundImage = computedStyle.getPropertyValue('background-image');
	const cbackground = computedStyle.getPropertyValue('background');

	// Inline styles.
	const style = element.style;
	const sbackgroundImage = style.backgroundImage;
	const sbackground = style.background;

	const hasCbackgroundUrl = cbackgroundImage.includes('url(') || cbackground.includes('url(');
	const hasSbackgroundUrl = sbackgroundImage.includes('url(') || sbackground.includes('url(');

	// Check if background-image or background contains a URL
	return hasCbackgroundUrl || hasSbackgroundUrl;
}

export function getBackgroundUrl(element: HTMLElement): string | undefined {
	// Check inline styles for background url.
	const backgroundImage = element.style.backgroundImage;
	const background = element.style.background;

	if (backgroundImage.includes('url(')) {
		const url = backgroundImage.match(/url\(([^)]+)\)/)[1];
		return stripOuterQuotes(url);
	} else if (background.includes('url(')) {
		const url = background.match(/url\(([^)]+)\)/)[1];
		return stripOuterQuotes(url);
	}

	// Check computed styles for background url.
	const computedStyle = window.getComputedStyle(element);
	const computedBackgroundImage = computedStyle.getPropertyValue('background-image');
	const computedBackground = computedStyle.getPropertyValue('background');

	if (computedBackgroundImage.includes('url(')) {
		const url = computedBackgroundImage.match(/url\(([^)]+)\)/)[1];
		return stripOuterQuotes(url);
	} else if (computedBackground.includes('url(')) {
		const url = computedBackground.match(/url\(([^)]+)\)/)[1];
		return stripOuterQuotes(url);
	}

	return undefined;
}

function stripOuterQuotes(str) {
	return str.replace(/^['"]|['"]$/g, '');
}
