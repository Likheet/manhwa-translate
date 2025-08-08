/*!
 * FitText.js 1.0 jQuery free version
 *
 * Copyright 2011, Dave Rupert http://daverupert.com
 * Released under the WTFPL license
 * http://sam.zoy.org/wtfpl/
 * Modified by Slawomir Kolodziej http://slawekk.info
 *
 * Date: Tue Aug 09 2011 10:45:54 GMT+0200 (CEST)
 */
export const fitText = async function (
	elements: HTMLElement[],
	originalFontSizes: number[]
): Promise<[HTMLElement[], () => void]> {
	const fit = async function (elements) {
		const resizer = async function () {
			let tries = 0;

			for (const [i, element] of elements.entries()) {
				element.style.fontSize = `${Math.max(originalFontSizes[i], 14)}px`;
			}

			await waitForNextFrame();

			do {
				let isOverflowing = elements.some(checkIsOverflowing);
				if (!isOverflowing) {
					// Refresh to make sure.
					// Pragrammatically, it seems as though waiting two frames is required to be sure.
					await waitForNextFrame();
					await waitForNextFrame();
					isOverflowing = elements.some(checkIsOverflowing);
					if (!isOverflowing) {
						break;
					}
				}

				// Decrement font size.
				for (const element of elements) {
					if (!checkIsOverflowing(element)) continue;

					const fontSize = getFontSize(element);

					// If at the minimum font size, increase the element size.
					if (fontSize <= 14) {
						increaseSizeUntilFits(element);
					} else {
						element.style.fontSize = `${getFontSize(element) - 1}px`;
					}
				}

				tries++;
			} while (tries < 1000);
		};

		await resizer();
	};

	await fit(elements);

	// return set of elements
	return [elements, () => fit(elements)];
};

function increaseSizeUntilFits(element: HTMLElement) {
	let increaseTryCount = 0;
	const maxIncreaseTryCount = 20;
	while (checkIsOverflowing(element) && increaseTryCount < maxIncreaseTryCount) {
		element.style.width = `${getWidth(element) + 1}px`;
		element.style.height = `${getHeight(element) + 1}px`;
		increaseTryCount++;
	}
}
function checkIsOverflowing(el) {
	return el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
}

function waitForNextFrame() {
	return new Promise(resolve => {
		requestAnimationFrame(resolve);
	});
}

function getFontSize(element: HTMLElement) {
	return parseInt(element.style.fontSize, 10);
}

function getWidth(element: HTMLElement) {
	return parseInt(element.style.width, 10);
}

function getHeight(element: HTMLElement) {
	return parseInt(element.style.height, 10);
}
