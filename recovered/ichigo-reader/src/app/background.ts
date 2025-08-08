/* Background process for the Ichigo extension.
 * This module should be used to process async work.
 * Handle failures in a robust manner and avoid the fail-fast pattern, unless in debug mode. */
import {
	captureVisibleTab,
	getCurrentTab,
	getZoomFactor,
	setExtensionIcon
} from '../utils/chromeApi';
import { appConfig } from '../utils/appConfig';
import { debug } from '../utils/ichigoApi';
import { translate } from './translateWithScaling';
import { initContextMenus } from './background/contextMenus';
import { fastHash } from './utils/fastHash';

initContextMenus();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	handleMessages(message, sender).then(sendResponse);
	return true;
});

const outgoingTranslationRequests = new Set<string>();

async function handleMessages(message, sender: chrome.runtime.MessageSender) {
	if (!message) {
		debug(`Message must not be empty.\n sender:\n ${JSON.stringify(sender)}`);
		return;
	}

	switch (message.kind) {
		case 'translateImage':
			const translateErrorMessage = validateImageMessage(message);
			if (translateErrorMessage) {
				debug(`${translateErrorMessage}\n message:\n ${JSON.stringify(message)}`);
				return;
			}

			const imageIdentity =
				message.translateTo +
				(message.translationModel ?? ':unknown:') +
				fastHash(message.image.src || message.image.base64Data);

			// Already translating the image.
			if (outgoingTranslationRequests.has(imageIdentity)) {
				return 'FullQueue';
			}

			if (outgoingTranslationRequests.size > 2) {
				return 'FullQueue';
			}

			try {
				outgoingTranslationRequests.add(imageIdentity);
				const translation = await translate(
					message.image,
					message.translateTo,
					message.translationModel,
					message.includeBase64Data
				);
				return translation;
			} finally {
				outgoingTranslationRequests.delete(imageIdentity);
			}

		case 'translateSnapshot':
			const snapshotErrorMessage = validateSnapshotMessage(message);
			if (snapshotErrorMessage) {
				debug(`${snapshotErrorMessage}\n message:\n ${JSON.stringify(message)}`);
				return;
			}

			const snapshot = await takeSnapshot(message.dimensions, sender.tab);
			if (!snapshot) {
				return;
			}

			const image = {
				src: snapshot.dataUrl,
				width: message.dimensions.width,
				height: message.dimensions.height
			};
			const snapshotTranslation = await translate(
				image,
				message.translateTo,
				message.translationModel
			);

			// Possibly free up memory. May not have any impact at all, but (probably) doesn't hurt.
			delete snapshot.dataUrl;

			return {
				translations: (snapshotTranslation as any).translations,
				zoomFactor: snapshot.zoomFactor
			};

		case 'setExtensionIcon':
			await doSetExtensionIcon();
			return;

		case 'openLoginPopup':
			const currentTab = await getCurrentTab();
			chrome.windows.create(
				{
					focused: true,
					width: 376,
					height: 440,
					type: 'popup',
					url: `loginPopup.html?refreshOnCompleteTabId=${currentTab.id}`,
					top: 0,
					left: 0
				},
				() => {}
			);
			return;

		case 'openSettings':
			chrome.tabs.create({
				url: `chrome://extensions/?id=${chrome.runtime.id}`
			});
			return;

		default:
			debug(
				`Unsupported message kind.\n sender:\n ${JSON.stringify(
					sender
				)}\n Received message: \n ${JSON.stringify(message)}`
			);
	}
}

// Returns an error message string on error.
// undefined means there are no errors.
function validateImageMessage(message: any) {
	let errorMessage = '';

	const image = message.image;
	if (!image) {
		return 'translateImage message must set image.';
	}

	if (!image.src && !image.base64Data) {
		errorMessage += 'translateImage message must set image.src or image.base64Data\n';
	}

	if (!image.height) {
		errorMessage += 'translateImage message must set image.height\n';
	}

	if (!image.width) {
		errorMessage += 'translateImage message must set image.width\n';
	}

	if (!message.translateTo) {
		errorMessage += 'translateImage message must set translateTo\n';
	}

	return errorMessage === '' ? undefined : errorMessage;
}

// Returns an error message string on error.
// undefined means there are no errors.
function validateSnapshotMessage(message: any) {
	let errorMessage = '';

	if (!message.translateTo) {
		errorMessage += 'Must supply translateTo.\n';
	}

	if (message.dimensions == null) {
		errorMessage += 'Must supply dimensions of top, left, width, and height.\n';
	} else {
		const dimensions = message.dimensions;
		if (!Number.isInteger(dimensions.top)) {
			errorMessage += 'top must be an integer.';
		}
		if (!Number.isInteger(dimensions.left)) {
			errorMessage += 'left must be an integer.';
		}
		if (!Number.isInteger(dimensions.width)) {
			errorMessage += 'width must be an integer.';
		}
		if (!Number.isInteger(dimensions.height)) {
			errorMessage += 'height must be an integer.';
		}
	}

	return errorMessage === '' ? undefined : errorMessage;
}

async function doSetExtensionIcon() {
	// Calculate if Manga Translator is active on the current tab.
	const activeTab = await getCurrentTab();
	const activeUrls = await appConfig.getActiveUrls();

	if (activeTab && activeUrls.includes(activeTab.getHostName())) {
		await setExtensionIcon({
			path: chrome.runtime.getURL('icons/128x128.png'),
			tabId: activeTab.id
		});
	}
}

async function takeSnapshot(
	{ top, left, height, width },
	tab?: chrome.tabs.Tab
): Promise<{ dataUrl: string; zoomFactor: number } | undefined> {
	if (tab == null) {
		return;
	}

	const dataUrl = await captureVisibleTab(tab.windowId);

	// Something went wrong. Possibly closed tab or refreshed.
	if (!dataUrl) {
		return;
	}

	const zoomFactor = await getZoomFactor(tab.id);
	const dataUrlFetch = await fetch(dataUrl);
	const visibleTabBlob = await dataUrlFetch.blob();

	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('bitmaprenderer');
	const bitmap = await createImageBitmap(
		visibleTabBlob,
		zoomFactor * left,
		zoomFactor * top,
		zoomFactor * width,
		zoomFactor * height
	);
	context.transferFromImageBitmap(bitmap);

	const snippetBlob = await canvas.convertToBlob();

	// WebP is faster than PNG and still lossless.
	return {
		dataUrl: await blobToBase64(snippetBlob),
		zoomFactor
	};
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, _) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.readAsDataURL(blob);
	});
}

// Workaround:
// https://stackoverflow.com/questions/71724980/chrome-extension-always-show-service-worker-inactive-after-browser-restart-if
chrome.runtime.onStartup.addListener(function () {
	console.log('ichigo-extension-startup');
});
