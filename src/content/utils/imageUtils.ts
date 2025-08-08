import { debug } from '../../utils/ichigoApi';
import { getImage } from './utils';

export type ImageBase64 = string; // Eg 'data:image/png;base64,iVBORw0KGgo...'

export async function getBase64Data({
	src,
	resizedWidth,
	resizedHeight,
	originalHeight,
	originalWidth
}: {
	src: string;
	resizedWidth: number;
	resizedHeight: number;
	originalWidth: number;
	originalHeight: number;
	base64Data?: ImageBase64;
}): Promise<
	{ base64Data: ImageBase64; width: number; height: number } | 'FetchError' | 'SiteAccessError'
> {
	let imageData;
	try {
		imageData = await getImage(src);
	} catch (error) {
		// This can happen if the users sets Manga Translator's "Site Access" to "On click",
		// instead of "On all sites", due to CORS. It can also happen if referer is not properly set, on some domains.
		return 'SiteAccessError';
	}

	if (!validStatusCode(imageData.status)) {
		return 'FetchError';
	}

	const blob = await imageData.blob();
	const shouldResize = resizedWidth != originalWidth || resizedHeight != originalHeight;

	if (shouldResize) {
		debug(`resized: ${resizedWidth}/${originalWidth} : ${resizedHeight}/${originalHeight}`);
		const canvas = new OffscreenCanvas(resizedWidth, resizedHeight);
		const context = canvas.getContext('bitmaprenderer');
		const bitmap = await createImageBitmap(blob, {
			resizeWidth: resizedWidth,
			resizeHeight: resizedHeight,
			resizeQuality: 'high'
		});
		context.transferFromImageBitmap(bitmap);

		const resizedBlob = await canvas.convertToBlob();
		const base64Data = await blobToBase64(resizedBlob);

		return { base64Data, width: resizedWidth, height: resizedHeight };
	} else {
		const base64Data = await blobToBase64(blob);
		return { base64Data, width: originalWidth, height: originalHeight };
	}
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, _) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.readAsDataURL(blob);
	});
}

function validStatusCode(statusCode: number): boolean {
	// See: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
	return statusCode >= 200 && statusCode < 400;
}
