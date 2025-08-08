export function getOriginalFontSize(fontFamily: string, fontHeightPx?: number): number | undefined {
	if (!fontHeightPx) {
		return undefined;
	}

	// All formulas are a best fit regression line from measuring the font heights in pixels converted to CSS font size.
	if (fontFamily === 'Kalam') {
		return Math.trunc(1.3887 * fontHeightPx + 2.307);
	} else if (fontFamily === 'Komika Jam') {
		return Math.trunc(1.1685 * fontHeightPx + 2.8405);
	} else if (fontFamily === 'Komika Slim') {
		return Math.trunc(1.4908 * fontHeightPx + 2.25);
	} else if (fontFamily === 'VTC Letterer Pro') {
		return Math.trunc(1.6876 * fontHeightPx + 0.9447);
	} else if (fontFamily == 'Bangers Regular') {
		return Math.trunc(1.4474 * fontHeightPx - 0.7746);
	} else if (fontFamily == 'CC Wild Words') {
		return Math.trunc(1.2094 * fontHeightPx + 0.2395);
	}

	return Math.trunc(1.2094 * fontHeightPx + 0.2395);
}
