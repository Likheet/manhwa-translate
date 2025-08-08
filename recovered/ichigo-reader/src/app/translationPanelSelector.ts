export function createTranslationPanelSelector(
	onSelected: (dimensions: { top: string; left: string; width: string; height: string }) => void
) {
	// Setup page cover.
	const fader = document.createElement('div');
	fader.className = 'ichigo-reader-fader';
	document.body.prepend(fader);

	// Setup explanatory instructions.
	const faderText = document.createElement('div');
	faderText.className = 'ichigo-reader-fader-font';
	faderText.innerText =
		'Click and drag to create a Translation Panel.\n All images underneath will be translated automatically.\n Cover the ENTIRE image not just the text bubbles!\n 100% browser zoom and operating system zoom should be used.';
	document.body.prepend(faderText);

	// Create the translation panel.
	const translationPanelSelection = document.createElement('div');
	translationPanelSelection.style.position = 'fixed';
	translationPanelSelection.style.backgroundColor = 'white';
	fader.append(translationPanelSelection);

	// Wait for the user to select the translation panels size.
	let xInit = 0;
	let yInit = 0;
	let isDragging = false;
	fader.addEventListener('mousedown', event => {
		xInit = Math.round(event.clientX);
		yInit = Math.round(event.clientY);
		translationPanelSelection.style.top = `${yInit}px`;
		translationPanelSelection.style.left = `${xInit}px`;
		isDragging = true;
	});
	fader.addEventListener('mousemove', event => {
		if (!isDragging) {
			return;
		}
		const width = event.clientX - xInit;
		const height = event.clientY - yInit;

		if (width < 0) {
			translationPanelSelection.style.left = `${event.clientX}px`;
		}
		if (height < 0) {
			translationPanelSelection.style.top = `${event.clientY}px`;
		}

		translationPanelSelection.style.width = `${Math.abs(width)}px`;
		translationPanelSelection.style.height = `${Math.abs(height)}px`;
	});
	fader.addEventListener('mouseup', event => {
		if (!isDragging) {
			return;
		}
		const width = event.clientX - xInit;
		const height = event.clientY - yInit;

		if (width < 0) {
			translationPanelSelection.style.left = `${event.clientX}px`;
		}
		if (height < 0) {
			translationPanelSelection.style.top = `${event.clientY}px`;
		}

		translationPanelSelection.style.width = `${Math.abs(width)}px`;
		translationPanelSelection.style.height = `${Math.abs(height)}px`;

		onSelected({
			top: translationPanelSelection.style.top,
			left: translationPanelSelection.style.left,
			width: translationPanelSelection.style.width,
			height: translationPanelSelection.style.height
		});

		translationPanelSelection.remove();
		fader.remove();
		faderText.remove();
	});
}
