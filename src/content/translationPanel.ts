import { appConfig, defaults } from '../utils/appConfig';
import { createCtaButtonBar } from './utils/buttonBars';
import { createTranslationPanelSelector } from './translationPanelSelector';
import { fitText } from './utils/fitText';
import { postBackgroundMessage } from '../utils/chromeApi';
import { sleepMs } from './utils/utils';
import { TranslationResult } from '../utils/translation';
import { bangersRegular } from '../embeddedFonts/bangersRegular';
import { kalam } from '../embeddedFonts/kalam';
import { komikaJam } from '../embeddedFonts/komikaJam';
import { komikaSlim } from '../embeddedFonts/komikaSlim';
import { vtcLettererPro } from '../embeddedFonts/vtcLettererPro';
import { patrickHand } from '../embeddedFonts/patrickHand';
import { ccWildWords } from '../embeddedFonts/ccWildWords';

let config: { fontFamily: string; activeUrls: string[] } | undefined;
const translationPanelClassName = 'ichigo-reader-translation-panel';

// Clear existing translation panels.
for (const panel of document.getElementsByClassName(translationPanelClassName)) {
	panel.remove();
}

// Injecting styles this way is technical debt and bad temporal coupling, but works for now.
injectStyles();
function injectStyles(): void {
	const translationPanelStyles = document.createElement('style');
	translationPanelStyles.type = 'text/css';

	// Some fonts are embedded, others are not because it is unnecessary.
	// The embedded fonts are necessary to work in certain contexts, such as local HTML files and the `saveTranslatedImage` feature.
	translationPanelStyles.textContent = `
${patrickHand}
${kalam}
${komikaJam}
${komikaSlim}
${vtcLettererPro}
${bangersRegular}
${ccWildWords}

.ichigo-reader-fader {
    opacity: 0.3;
	filter: alpha(opacity = 20);
    background-color: #000;
    width: 100%;
    height:100%;
    z-index: 2147483646;
    top: 0;
    left: 0;
    position: fixed;
}

.ichigo-reader-fader-font {
	color: white;
	font-size: 30px;
	font-family: "${appConfig.getUIFontFamily()}";
	top: 0;
	left: 8px;
	position: fixed;
	z-index: 2147483647;
	pointer-events: none;
}

.ichigo-spinner {
	animation-name: ichigo-spin;
	animation-duration: 2000ms;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
}

@keyframes ichigo-spin {
	from {
		transform:rotate(0deg);
	}
	to {
		transform:rotate(360deg);
	}
}
`;
	document.head.append(translationPanelStyles);
}

let requestNumber = 0;
async function onSelected({ top, left, width, height }) {
	// Load user's custom configuration.
	if (!config) {
		const fontFamily = await appConfig.getFontFamily();
		const activeUrls = await appConfig.getActiveUrls();

		config = {
			fontFamily,
			activeUrls
		};
	}

	const translationPanel = document.createElement('div') as HTMLDivElement & {
		toggleLoadingOn: any;
		toggleLoadingOff: any;
		addText: any;
	};
	translationPanel.style.all = 'initial';
	translationPanel.style.position = 'fixed';
	translationPanel.style.top = top;
	translationPanel.style.left = left;
	translationPanel.style.width = width;
	translationPanel.style.height = height;
	translationPanel.style.border = '2px dotted magenta';
	translationPanel.style.zIndex = '2147483647';
	translationPanel.style.pointerEvents = 'none';
	translationPanel.className = translationPanelClassName;

	const loadingSpinner = document.createElement('div');
	loadingSpinner.style.position = 'absolute';
	loadingSpinner.style.zIndex = '2147483647';
	loadingSpinner.style.top = '0px';
	loadingSpinner.className = `ichigo-spinner`;
	loadingSpinner.textContent = '🍓';
	translationPanel.toggleLoadingOn = () => {
		// Already toggled on.
		translationPanel.append(loadingSpinner);
	};
	translationPanel.toggleLoadingOff = () => {
		// Already toggled off.
		loadingSpinner.remove();
	};

	translationPanel.addText = (
		text: string,
		top: string,
		left: string,
		width: string,
		height: string,
		background: string,
		fontColor: string,
		fontStrokeColor: string,
		fontFamily: string,
		fontSize: number,
		isOutOfTranslations: boolean
	) => {
		const textBox = document.createElement('div');
		textBox.style.all = 'initial';
		textBox.style.display = 'grid';
		textBox.style.placeItems = 'center';
		textBox.style.textAlign = 'center';
		if (background) {
			textBox.style.background = `url(${background})`;
		} else {
			textBox.style.backgroundColor = 'white';
		}
		textBox.style.position = 'absolute';
		textBox.style.borderRadius = '8px';
		textBox.style.top = top;
		textBox.style.left = left;
		textBox.style.width = width;
		textBox.style.height = height;
		textBox.style.color = fontColor;
		textBox.style.textShadow = `calc(3px*1) calc(3px*0) 0 ${fontStrokeColor},
			calc(3px*0.924) calc(3px*0.383) 0 ${fontStrokeColor},
			calc(3px*0.707) calc(3px*0.707) 0 ${fontStrokeColor},
			calc(3px*0.383) calc(3px*0.924) 0 ${fontStrokeColor},
			calc(3px*0) calc(3px*1) 0 ${fontStrokeColor},
			calc(3px*-0.383) calc(3px*0.924) 0 ${fontStrokeColor},
			calc(3px*-0.707) calc(3px*0.707) 0 ${fontStrokeColor},
			calc(3px*-0.924) calc(3px*0.3827) 0 ${fontStrokeColor},
			calc(3px*-1) calc(3px*0) 0 ${fontStrokeColor},
			calc(3px*-0.924) calc(3px*-0.383) 0 ${fontStrokeColor},
			calc(3px*-0.707) calc(3px*-0.707) 0 ${fontStrokeColor},
			calc(3px*-0.383) calc(3px*-0.924) 0 ${fontStrokeColor},
			calc(3px*0) calc(3px*-1) 0 ${fontStrokeColor},
			calc(3px*0.383) calc(3px*-0.924) 0 ${fontStrokeColor},
			calc(3px*0.707) calc(3px*-0.707) 0 ${fontStrokeColor},
			calc(3px*0.924) calc(3px*-0.383) 0 ${fontStrokeColor}`;
		textBox.style.fontFamily = fontFamily;
		textBox.style.cursor = 'pointer';
		textBox.style.zIndex = '2147483647';
		textBox.style.pointerEvents = 'all';
		if (isOutOfTranslations) {
			fontSize = 30;

			// Manually setting textBox size is required for out of translations edge case.
			// This is because results are usually relative to the size of the picture.
			textBox.style.top = '6px';
			textBox.style.left = '6px';
			textBox.style.width = '200px';
			textBox.style.height = '200px';
			textBox.style.fontFamily = appConfig.getUIFontFamily();
			textBox.style.color = '#976353';
			textBox.textContent = 'Feed the server hamsters.';

			textBox.append(createCtaButtonBar());
		} else {
			textBox.textContent = text;
		}
		translationPanel.append(textBox);
		fitText([textBox], [fontSize]);
	};

	const debounceDelayMs = 1500;
	const translateSnapshot = debounce(async () => {
		requestNumber++;
		let currentRequestNumber = requestNumber;

		// Remove all old text boxes.
		translationPanel.innerHTML = '';

		// HACK: Add delay to let DOM refresh.
		// Otherwise the old text boxes are included as part of the screen snapshot.
		// Could probably use a lower delay.
		const screenClearDelayMs = 400;
		await sleepMs(screenClearDelayMs);

		translationPanel.toggleLoadingOn();

		const response: { translations: TranslationResult[]; zoomFactor: number } | undefined =
			await postBackgroundMessage({
				kind: 'translateSnapshot',
				dimensions: {
					top: parseInt(top),
					left: parseInt(left),
					width: parseInt(width),
					height: parseInt(height)
				},
				translateTo: await appConfig.getTranslateToLanguage(),
				translationModel: await appConfig.getTranslationModelId(),
				requestNumber: currentRequestNumber
			});

		// Another request was kicked off before completing.
		if (currentRequestNumber !== requestNumber) {
			return;
		}

		translationPanel.toggleLoadingOff();

		if (response == null) {
			return;
		}

		const zoomConstant = 1 / response.zoomFactor;

		// Place translated text on each image.
		// TODO: Change from px to percentages like in content.ts
		for (const textBox of response.translations) {
			const textBoxWidth =
				((textBox.maxX - textBox.minX) / translationPanel.clientWidth) * 100;
			const textBoxHeight =
				((textBox.maxY - textBox.minY) / translationPanel.clientHeight) * 100;
			const textBoxTop = (textBox.minY / translationPanel.clientHeight) * 100;
			const textBoxLeft = (textBox.minX / translationPanel.clientWidth) * 100;

			/** HACK: Special state for out of translations. */
			const isOutOfTranslations =
				textBox.translatedText ===
				'Out of translations. Server costs are expensive. Upgrade for more!';

			translationPanel.addText(
				textBox.translatedText,
				`${round(zoomConstant * textBoxTop)}%`,
				`${round(zoomConstant * textBoxLeft)}%`,
				`${round(zoomConstant * textBoxWidth)}%`,
				`${round(zoomConstant * textBoxHeight)}%`,
				textBox.background,
				textBox.fontColor ?? defaults.fontColor,
				textBox.fontStrokeColor,
				config.fontFamily,
				textBox.fontHeightPx,
				isOutOfTranslations
			);
		}
	}, debounceDelayMs);

	document.addEventListener('click', translateSnapshot);
	document.addEventListener('keydown', translateSnapshot);
	window.addEventListener('scroll', translateSnapshot);
	window.addEventListener('resize', translateSnapshot);

	document.body.append(translationPanel);

	translateSnapshot();
}

function debounce(func, milliseconds: number) {
	let timeoutId;
	return function debouncedFunc(...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), milliseconds);
	};
}

function round(num) {
	const m = Number((Math.abs(num) * 100).toPrecision(15));
	return (Math.round(m) / 100) * Math.sign(num);
}

createTranslationPanelSelector(onSelected);
