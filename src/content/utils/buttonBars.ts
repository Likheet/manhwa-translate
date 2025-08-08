import { appConfig } from '../../utils/appConfig';
import { postBackgroundMessage } from '../../utils/chromeApi';

const m = chrome.i18n.getMessage;

// Creates the "Call to action" button bar in a translation box.
// In this case, to either login or upgrade.
export function createCtaButtonBar() {
	const loginButton = document.createElement('button');
	loginButton.style.all = 'initial';
	loginButton.style.height = '48px';
	loginButton.style.minWidth = '80px';
	loginButton.style.maxWidth = '200px';
	loginButton.style.fontSize = '22px';
	loginButton.style.borderRadius = '4px';
	loginButton.style.fontFamily = appConfig.getUIFontFamily();
	loginButton.style.border = '2px solid rgb(151, 99, 83)';
	loginButton.style.backgroundColor = 'white';
	loginButton.style.color = 'rgb(151, 99, 83)';
	loginButton.style.marginBottom = '4px';
	loginButton.style.marginTop = '-2px';
	loginButton.style.cursor = 'pointer';
	loginButton.style.textAlign = 'center';
	loginButton.textContent = m('logInButton');
	loginButton.onclick = async () => {
		await postBackgroundMessage({ kind: 'openLoginPopup' });
	};

	const upgradeButton = document.createElement('button');
	upgradeButton.style.all = 'initial';
	upgradeButton.style.height = '48px';
	upgradeButton.style.minWidth = '80px';
	upgradeButton.style.maxWidth = '200px';
	upgradeButton.style.fontSize = '22px';
	upgradeButton.style.borderRadius = '4px';
	upgradeButton.style.fontFamily = appConfig.getUIFontFamily();
	upgradeButton.style.border = '2px solid rgb(151, 99, 83)';
	upgradeButton.style.backgroundColor = 'rgb(151, 99, 83)';
	upgradeButton.style.color = 'white';
	upgradeButton.style.marginBottom = '4px';
	upgradeButton.style.marginTop = '-2px';
	upgradeButton.style.cursor = 'pointer';
	upgradeButton.style.textAlign = 'center';
	upgradeButton.textContent = m('upgradeButton');
	upgradeButton.onclick = () => {
		window.open('https://mangatranslator.ai/subscription', '_blank');
	};

	const buttonBar = document.createElement('div');
	buttonBar.style.all = 'initial';
	buttonBar.style.display = 'flex';
	buttonBar.style.columnGap = '8px';
	buttonBar.style.marginTop = '8px';
	buttonBar.append(upgradeButton);
	buttonBar.append(loginButton);

	return buttonBar;
}

export function createUnlockerDownloadButtonBar() {
	const downloadButton = document.createElement('button');
	downloadButton.style.all = 'initial';
	downloadButton.style.height = '48px';
	downloadButton.style.minWidth = '80px';
	downloadButton.style.maxWidth = '200px';
	downloadButton.style.fontSize = '22px';
	downloadButton.style.borderRadius = '4px';
	downloadButton.style.fontFamily = appConfig.getUIFontFamily();
	downloadButton.style.border = '2px solid rgb(151, 99, 83)';
	downloadButton.style.backgroundColor = 'rgb(151, 99, 83)';
	downloadButton.style.color = 'white';
	downloadButton.style.marginBottom = '4px';
	downloadButton.style.marginTop = '-2px';
	downloadButton.style.cursor = 'pointer';
	downloadButton.style.textAlign = 'center';
	downloadButton.textContent = m('downloadButton');
	downloadButton.onclick = () => {
		window.open('https://mangatranslator.ai/unlocker', '_blank');
	};

	const buttonBar = document.createElement('div');
	buttonBar.style.all = 'initial';
	buttonBar.style.display = 'flex';
	buttonBar.style.alignContent = 'center';
	buttonBar.style.justifyContent = 'center';
	buttonBar.style.marginTop = '8px';
	buttonBar.append(downloadButton);

	return buttonBar;
}

export function createSiteAccessButtonBar() {
	const settingsButton = document.createElement('button');
	settingsButton.style.all = 'initial';
	settingsButton.style.height = '48px';
	settingsButton.style.minWidth = '80px';
	settingsButton.style.maxWidth = '200px';
	settingsButton.style.fontSize = '22px';
	settingsButton.style.borderRadius = '4px';
	settingsButton.style.fontFamily = appConfig.getUIFontFamily();
	settingsButton.style.border = '2px solid rgb(151, 99, 83)';
	settingsButton.style.backgroundColor = 'white';
	settingsButton.style.color = 'rgb(151, 99, 83)';
	settingsButton.style.marginBottom = '4px';
	settingsButton.style.marginTop = '-2px';
	settingsButton.style.cursor = 'pointer';
	settingsButton.style.textAlign = 'center';
	settingsButton.textContent = m('settingsButton');
	settingsButton.onclick = async () => {
		await postBackgroundMessage({ kind: 'openSettings' });
	};

	const buttonBar = document.createElement('div');
	buttonBar.style.all = 'initial';
	buttonBar.style.display = 'flex';
	buttonBar.style.alignContent = 'center';
	buttonBar.style.justifyContent = 'center';
	buttonBar.style.marginTop = '8px';
	buttonBar.append(settingsButton);

	return buttonBar;
}
