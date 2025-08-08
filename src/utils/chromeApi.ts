// Module for making working with the Chrome API easier.
// This may include making the API async, simplifying the interface, or more.
export function getCurrentTab(): Promise<
	(chrome.tabs.Tab & { getHostName: () => string }) | undefined
> {
	return new Promise<(chrome.tabs.Tab & { getHostName: () => string }) | undefined>(resolve => {
		chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
			if (chrome.runtime.lastError) {
				resolve(undefined);
				return;
			}

			const currentTab: any = tabs[0];
			if (!currentTab?.url) {
				resolve(undefined);
				return;
			}

			currentTab.getHostName = () => {
				try {
					return new URL(currentTab.url).hostname;
				} catch {
					return '';
				}
			};
			resolve(currentTab);
		});
	});
}

export function updateSessionHeaders(ruleOptions: chrome.declarativeNetRequest.UpdateRuleOptions) {
	return new Promise(resolve => {
		chrome.declarativeNetRequest.updateSessionRules(ruleOptions, resolve);
	});
}

// Window ID of tab to capture, eg getCurrentTab().windowId;
export function captureVisibleTab(windowId: number) {
	return new Promise<string>(resolve =>
		chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, resolve)
	);
}

export function getZoomFactor(tabId: number): Promise<number> {
	return new Promise<number>(resolve => chrome.tabs.getZoom(tabId, resolve));
}

export function setExtensionIcon(icon: chrome.browserAction.TabIconDetails): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		chrome.action.setIcon(icon, () => {
			resolve(true);
		});
	});
}

export function executeScript(
	tabId: number,
	filePath: string,
	allFrames?: boolean
): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		chrome.scripting.executeScript(
			{ target: { tabId, allFrames: allFrames ?? true }, files: [filePath] },
			() => {
				resolve(true);
			}
		);
	});
}

export function isAllowedFileSchemeAccess() {
	return new Promise(resolve => {
		chrome.extension.isAllowedFileSchemeAccess(resolve);
	});
}

export function postBackgroundMessage(message: any): any {
	const extensionId = undefined; // undefined means send to self, instead of another extension.
	const options = undefined;

	return new Promise(resolve => {
		chrome.runtime.sendMessage(extensionId, message, options, resolve);
	});
}

export function getStorageItem<T>(key: string): Promise<T | undefined> {
	const formattedKey = formatKey(key);
	return new Promise(resolve => {
		try {
			chrome.storage.local.get([formattedKey], function (result) {
				resolve(result[formattedKey]);
			});
		} catch {
			// Do nothing if cache fails.
			resolve(undefined);
		}
	});
}

export function setStorageItem<T>(key: string, value: T): Promise<boolean> {
	const formattedKey = formatKey(key);
	return new Promise(resolve => {
		try {
			chrome.storage.local.set({ [formattedKey]: value }, () => {
				resolve(true);
			});
		} catch {
			// Do nothing if cache fails.
			resolve(false);
		}
	});
}

function formatKey(key: string) {
	const keyPrefix = 'app';
	return `${keyPrefix}-${key}`;
}
