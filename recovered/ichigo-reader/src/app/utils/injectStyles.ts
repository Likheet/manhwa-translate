import { bangersRegular } from '../embeddedFonts/bangersRegular';
import { ccWildWords } from '../embeddedFonts/ccWildWords';
import { kalam } from '../embeddedFonts/kalam';
import { komikaJam } from '../embeddedFonts/komikaJam';
import { komikaSlim } from '../embeddedFonts/komikaSlim';
import { patrickHand } from '../embeddedFonts/patrickHand';
import { vtcLettererPro } from '../embeddedFonts/vtcLettererPro';

export function ensureStylesInjected(shadowDom: ShadowRoot | null): void {
	if (shadowDom == null || shadowDom.host == null) {
		return;
	}

	if (!hasFontStyleSheet(document.head)) {
		document.head.append(createFontStyleSheet());
	}

	if (!hasAnimationStyleSheet(document.head)) {
		document.head.append(createAnimationStyleSheet());
	}

	if (!hasAnimationStyleSheetShadow(shadowDom)) {
		shadowDom.prepend(createAnimationStyleSheet());
	}

	if (!hasAnimationStyleSheet(shadowDom.host as HTMLElement)) {
		shadowDom.host.prepend(createAnimationStyleSheet());
	}
}

function hasAnimationStyleSheetShadow(element: ShadowRoot) {
	if (element.getElementById('ichigo-reader-animations') != null) return true;

	const styleSheets = element.querySelectorAll('style');
	for (const styleSheet of styleSheets) {
		const hasAnimationName = styleSheet.textContent.includes('animation-name: spin;');
		const hasAnimationDuration = styleSheet.textContent.includes('animation-duration: 2000ms;');
		if (hasAnimationName && hasAnimationDuration) return true;
	}

	return false;
}

function hasAnimationStyleSheet(element: HTMLElement) {
	if (element.getElementsByClassName('ichigo-reader-animations').length !== 0) return true;

	// Backup check if className is somehow stripped.
	const styleSheets = element.getElementsByTagName('style');
	for (const styleSheet of styleSheets) {
		const hasAnimationName = styleSheet.textContent.includes('animation-name: spin;');
		const hasAnimationDuration = styleSheet.textContent.includes('animation-duration: 2000ms;');
		if (hasAnimationName && hasAnimationDuration) return true;
	}

	return false;
}

function hasFontStyleSheet(element: HTMLElement) {
	if (element.getElementsByClassName('ichigo-reader-fonts').length !== 0) return true;

	// Backup check if className is somehow stripped.
	const styleSheets = element.getElementsByTagName('style');
	for (const styleSheet of styleSheets) {
		const hasIchigoReaderFont = styleSheet.textContent.includes(patrickHand);
		if (hasIchigoReaderFont) return true;
	}

	return false;
}

function createAnimationStyleSheet() {
	const animations = document.createElement('style');
	animations.type = 'text/css';
	animations.textContent = `
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
	animations.className = 'ichigo-reader-animations';
	animations.id = 'ichigo-reader-animations';
	return animations;
}

function createFontStyleSheet() {
	const fonts = document.createElement('style');
	fonts.type = 'text/css';
	// The embedded fonts are necessary to work in certain contexts, such as local HTML files.
	fonts.textContent = `
${patrickHand}
${kalam}
${komikaJam}
${komikaSlim}
${vtcLettererPro}
${bangersRegular}
${ccWildWords}
`;
	fonts.className = 'ichigo-reader-fonts';
	return fonts;
}
