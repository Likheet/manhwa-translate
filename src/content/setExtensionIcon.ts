import { postBackgroundMessage } from '../utils/chromeApi';

setExtensionIcon();

function setExtensionIcon() {
	postBackgroundMessage({
		kind: 'setExtensionIcon'
	});
}
