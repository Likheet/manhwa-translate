export function fastHash(str: string): string {
	let hash = '';
	const len = str.length;
	const selectCount = 150;

	// Select the first 150 characters.
	for (let i = 0; i < selectCount && i < len; i++) {
		hash += str.charCodeAt(i);
	}

	// Select the last 150 characters.
	for (let i = len - selectCount; i < len; i++) {
		if (i >= 0) {
			hash += str.charCodeAt(i);
		}
	}

	// Loop through the entire string, increasing the index by a slice of 1/1000th the total length
	const step = Math.ceil(len / 1000) + 1;
	for (let i = 0; i < len; i += step) {
		hash += str.charCodeAt(i);
	}

	return hash;
}
