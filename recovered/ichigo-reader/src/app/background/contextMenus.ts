import { executeScript, getCurrentTab, setExtensionIcon } from '../../utils/chromeApi';
import { appConfig } from '../../utils/appConfig';

const m = chrome.i18n.getMessage;
const translatedPageMenuId = 'ichigo-translate-page';

export async function initContextMenus() {
	// Clear previous context menu to prevent "duplicate context menu" error.
	await removeContextMenu(translatedPageMenuId);

	chrome.contextMenus.create({
		id: translatedPageMenuId,
		title: m('toggleTranslationsContextMenu'),
		type: 'normal',
		contexts: ['all']
	});

	chrome.contextMenus.onClicked.addListener(async (context: chrome.contextMenus.OnClickData) => {
		if (context?.menuItemId !== translatedPageMenuId) {
			return;
		}
		const tab = await getCurrentTab();
		if (!tab) {
			return;
		}
		const configActiveUrls = await appConfig.getActiveUrls();
		const isToggledOn = configActiveUrls.includes(tab.getHostName());

		if (isToggledOn) {
			// Toggle off.
			await appConfig.removeActiveUrl(tab.getHostName());
			await setExtensionIcon({
				path: chrome.runtime.getURL('icons/128x128-disabled.png'),
				tabId: tab.id
			});

			await executeScript(tab.id, 'js/clearTranslations.js');
		} else {
			// Toggle on.
			await appConfig.addActiveUrl(tab.getHostName());
			await setExtensionIcon({
				path: chrome.runtime.getURL('icons/128x128.png'),
				tabId: tab.id
			});
		}
	});
}

function removeContextMenu(menuId: string) {
	return new Promise(resolve => {
		chrome.contextMenus.remove(menuId, () => {
			if (chrome.runtime.lastError) {
				// Do nothing if an error occurs. Can happen if menu item doesn't exist.
			}
			resolve(undefined);
		});
	});
}
