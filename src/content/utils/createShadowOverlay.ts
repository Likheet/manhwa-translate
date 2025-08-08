import { appConfig } from '../../utils/appConfig';
import { fitText } from './fitText';

const maxZindex = '2147483647';
export const ichigoReaderElementClassName = 'ichigoReaderElement';

// Necessary because TypeScript does not support this out of box yet.
declare class ResizeObserver {
	constructor(listener: any);
	observe: (element: any) => void;
}

export function createShadowOverlay(
	root: HTMLElement,
	element: HTMLElement,
	onRemoved: () => void,
	onChanged: () => void
) {
	if (!root) {
		throw new Error(`root not initialized. Element:\n ${element}`);
	}

	if (element == null) {
		return null;
	}

	const overlayTextListeners: (() => void)[] = [];
	const overlay: any = document.createElement('div');
	overlay.style.all = 'initial';
	overlay.style.position = 'absolute';
	overlay.style.zIndex = maxZindex;
	overlay.style.pointerEvents = 'none';
	setOverlayPosition(overlay, element);
	root.append(overlay);

	const updateOverlayPosition = () => {
		setOverlayPosition(overlay, element);
		for (const overlayTextListener of overlayTextListeners) {
			overlayTextListener();
		}

		onChanged();
	};

	const resizeObserver = new ResizeObserver(updateOverlayPosition);
	resizeObserver.observe(element);

	const intersectionObserver = new IntersectionObserver(updateOverlayPosition);
	intersectionObserver.observe(element);

	// Remove overlay if element is removed.
	const config = { attributes: true, childList: true, subtree: true };
	const mutationObserver = new MutationObserver(mutationList => {
		if (!document.body.contains(element)) {
			overlay.remove();
			onRemoved();
		}

		if (
			element.hidden ||
			element.style.visibility === 'hidden' ||
			element.style.display === 'none'
		) {
			overlay.remove();
			onRemoved();
		}

		for (const mutationRecord of mutationList) {
			if (mutationRecord.removedNodes) {
				for (const removedNode of mutationRecord.removedNodes) {
					if (element === removedNode) {
						overlay.remove();
						onRemoved();
					}
				}
			}
		}

		updateOverlayPosition();
	});
	// Null check required due to race conditions with DOM renders.
	mutationObserver.observe(document.body ?? document.head, config);

	// Remove overlay if element src changes.
	const elementObserver = new MutationObserver(changes => {
		// Extension changed the src.
		const isSrcChange = changes.some(change => change.attributeName === 'src');
		if (isSrcChange) {
			overlay.remove();
			onRemoved();
		}

		updateOverlayPosition();
	});
	elementObserver.observe(element, { attributes: true });

	window.addEventListener('resize', () => {
		setOverlayPosition(overlay, element);
	});

	const loadingSpinner = document.createElement('div');
	loadingSpinner.style.position = 'absolute';
	loadingSpinner.style.zIndex = maxZindex;
	loadingSpinner.style.top = '0px';
	loadingSpinner.style.fontSize = '30px';
	loadingSpinner.className = `ichigo-spinner ${ichigoReaderElementClassName}`;
	loadingSpinner.textContent = '🍓';
	let displayTimeout;
	overlay.setLoading = (value: boolean) => {
		if (value) {
			displayTimeout = setTimeout(() => {
				overlay.append(loadingSpinner);
			}, 500);
		} else {
			clearTimeout(displayTimeout);
			loadingSpinner.remove();
		}
	};

	const header = document.createElement('div');
	header.style.all = 'initial';
	header.style.position = 'absolute';
	header.style.zIndex = maxZindex;
	header.style.top = '8px';
	header.style.left = '45px';
	header.style.fontSize = '30px';
	header.className = `overlayHeader ${ichigoReaderElementClassName}`;
	overlay.displayHeaderMessage = (message: string, fontFamily: string) => {
		// Clear previous header message, if there was one.
		header.remove();

		header.style.color = 'black';
		header.style.fontFamily = fontFamily;
		header.style.webkitTextStroke = '1px white';
		header.textContent = message;
		overlay.append(header);
	};
	overlay.removeHeaderMessage = () => {
		header.remove();
	};

	overlay.addMessage = async (message: string, ...append: HTMLElement[]) => {
		const textBox = createTextBox();
		textBox.textContent = message;
		textBox.append(...append);

		overlay.append(textBox);
		const [_, updateTextSizes] = await fitText([textBox], [30]);
		overlayTextListeners.push(updateTextSizes);
	};

	overlay.addSystemMessage = async (message: string, ...append: HTMLElement[]) => {
		const textBox = createTextBox();
		textBox.style.width = 'initial';
		textBox.style.minWidth = '200px';
		textBox.style.maxWidth = '400px';

		const textBoxText = document.createElement('span');
		textBoxText.style.width = '200px';
		textBoxText.textContent = message;
		textBox.append(textBoxText);

		textBox.append(...append);

		overlay.append(textBox);
		const [_, updateTextSizes] = await fitText([textBox], [30]);
		overlayTextListeners.push(updateTextSizes);
	};

	return overlay as HTMLDivElement & {
		addMessage: (message: string, ...append: HTMLElement[]) => Promise<void>;
		addSystemMessage: (message: string, ...append: HTMLElement[]) => Promise<void>;
		setLoading: (value: boolean) => void;
		displayHeaderMessage: (message: string, fontFamily: string) => void;
		removeHeaderMessage: () => void;
	};
}

function setOverlayPosition(overlay: HTMLElement, referenceElement: HTMLElement): void {
	const boundingBox = getElementPosition(referenceElement);
	overlay.style.top = `${boundingBox.top}px`;
	overlay.style.left = `${boundingBox.left}px`;
	overlay.style.width = `${boundingBox.width}px`;
	overlay.style.height = `${boundingBox.height}px`;
}

function getElementPosition(element: HTMLElement) {
	let style = getComputedStyle(element);
	const absRec = getAbsoluteBoundingRect(element);
	let offsetWidth = element.offsetWidth;
	let offsetHeight = element.offsetHeight;
	let top = absRec.top;
	let left = absRec.left;
	let xPaddingSum = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	let yPaddingSum = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
	let width =
		offsetWidth -
		xPaddingSum -
		(parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
	let height =
		offsetHeight -
		yPaddingSum -
		(parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
	top += parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
	left += parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
	return { top: top, left: left, width: width, height: height };
}

function getAbsoluteBoundingRect(el) {
	let doc = document,
		win = window,
		body = doc.body,
		// pageXOffset and pageYOffset work everywhere except IE <9.
		offsetX =
			win.pageXOffset !== undefined
				? win.pageXOffset
				: ((doc.documentElement || body.parentNode || body) as any).scrollLeft,
		offsetY =
			win.pageYOffset !== undefined
				? win.pageYOffset
				: ((doc.documentElement || body.parentNode || body) as any).scrollTop,
		rect = el.getBoundingClientRect();

	if (el !== body) {
		let parent = el.parentNode;

		// The element's rect will be affected by the scroll positions of
		// *all* of its scrollable parents, not just the window, so we have
		// to walk up the tree and collect every scroll offset. Good times.
		while (parent && parent !== body) {
			offsetX += parent.scrollLeft;
			offsetY += parent.scrollTop;
			parent = parent.parentNode;
		}
	}

	return {
		bottom: rect.bottom + offsetY,
		height: rect.height,
		left: rect.left + offsetX,
		right: rect.right + offsetX,
		top: rect.top + offsetY,
		width: rect.width
	};
}

function createTextBox() {
	const textBox = document.createElement('div');
	textBox.className = ichigoReaderElementClassName;
	textBox.style.all = 'initial';
	textBox.style.display = 'grid';
	textBox.style.placeItems = 'center';
	textBox.style.textAlign = 'center';
	textBox.style.backgroundColor = 'white';
	textBox.style.padding = '8px';
	textBox.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
	textBox.style.position = 'absolute';
	textBox.style.borderRadius = '8px';
	textBox.style.zIndex = maxZindex;
	textBox.style.pointerEvents = 'all';
	textBox.style.textShadow =
		'calc(1.5px*1) calc(1.5px*0) 0 #fff,calc(1.5px*0.924) calc(1.5px*0.383) 0 #fff,calc(1.5px*0.707) calc(1.5px*0.707) 0 #fff,calc(1.5px*0.383) calc(1.5px*0.924) 0 #fff,calc(1.5px*0) calc(1.5px*1) 0 #fff,calc(1.5px*-0.383) calc(1.5px*0.924) 0 #fff,calc(1.5px*-0.707) calc(1.5px*0.707) 0 #fff,calc(1.5px*-0.924) calc(1.5px*0.3827) 0 #fff,calc(1.5px*-1) calc(1.5px*0) 0 #fff,calc(1.5px*-0.924) calc(1.5px*-0.383) 0 #fff,calc(1.5px*-0.707) calc(1.5px*-0.707) 0 #fff,calc(1.5px*-0.383) calc(1.5px*-0.924) 0 #fff,calc(1.5px*0) calc(1.5px*-1) 0 #fff,calc(1.5px*0.383) calc(1.5px*-0.924) 0 #fff,calc(1.5px*0.707) calc(1.5px*-0.707) 0 #fff,calc(1.5px*0.924) calc(1.5px*-0.383) 0 #fff';
	textBox.style.top = '6px';
	textBox.style.left = '6px';
	textBox.style.width = '200px';
	textBox.style.height = '200px';
	textBox.style.fontFamily = appConfig.getUIFontFamily();
	textBox.style.color = '#976353';
	return textBox;
}
