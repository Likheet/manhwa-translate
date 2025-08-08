import { TranslationResult } from './translation';
import { appConfig } from './appConfig';
import { LanguageCode } from './locales';
import { TranslationModelData } from './models';

// If set to true, use local implementations and turn on logging.
const isDebug = false;
export const baseUrl = isDebug ? 'http://localhost:8080' : 'https://ichigoreader.com';

enum StatusCode {
	Ok = 200,
	Created = 201,
	NoContent = 204,
	BadRequest = 400,
	Forbidden = 403,
	NotFound = 404,
	TooManyRequests = 429,
	InternalServerError = 500
}

export interface User {
	email?: string; // Unregistered users have no email. They are tracked by IP.
	subscriptionTier: 'free' | 'tier-1' | 'tier-2';
}

export async function getCurrentUser(): Promise<User> {
	const clientUuid = await appConfig.getClientUuid();
	const request = await fetch(
		`${baseUrl}/metrics?clientUuid=${clientUuid}&fingerprint=${getFingerprint()}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				// Use the new subscription types.
				'Client-Version': '1.0.1'
			}
		}
	);

	if (request.status !== StatusCode.Ok) {
		throw new Error('Failed to retrieve user.');
	}

	return (await request.json()) as {
		email?: string;
		subscriptionTier: 'free' | 'tier-1' | 'tier-2';
	};
}

export enum LoginStatus {
	Unknown, // Various network errors, if server is on high load, etc. Not worth handling at this time.
	UnknownEmail,
	BadPassword,
	InvalidEmail,
	Success
}

export async function login(email: string, password: string): Promise<LoginStatus> {
	const request = await fetch(`${baseUrl}/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email, password })
	});

	if (request.status === StatusCode.BadRequest) {
		const json = await request.json();
		switch (json.detail.kind) {
			case 'emptyEmail':
				return LoginStatus.InvalidEmail;
			case 'userNotFound':
				return LoginStatus.UnknownEmail;
			default:
				return LoginStatus.Unknown;
		}
	}

	if (request.status === StatusCode.Forbidden) {
		return LoginStatus.BadPassword;
	}

	return request.status === StatusCode.Ok ? LoginStatus.Success : LoginStatus.Unknown;
}

export async function logout(): Promise<boolean> {
	const request = await fetch(`${baseUrl}/auth/logout`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	return request.status === StatusCode.NoContent;
}

export enum SignupStatus {
	Unknown, // Various network errors, if server is on high load, etc. Not worth handling at this time.
	Success,
	EmailTaken
}

export async function signup(email: string, password: string): Promise<SignupStatus> {
	const request = await fetch(`${baseUrl}/signup`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email, password })
	});

	if (request.status === StatusCode.Forbidden) {
		return SignupStatus.EmailTaken;
	}

	return request.status === StatusCode.Created ? SignupStatus.Success : SignupStatus.Unknown;
}

export async function submitFeedback(text: string): Promise<boolean> {
	const request = await fetch(`${baseUrl}/feedback`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ text })
	});

	return request.status === StatusCode.Created;
}

export async function getTranslationModels(): Promise<TranslationModelData> {
	const request = await fetch(`${baseUrl}/translate/models/extension`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	return await request.json();
}

export async function translateImage(
	translateTo: LanguageCode,
	base64Image: string,
	translationModel?: string
): Promise<{ translations: TranslationResult[]; errorMessage?: string }> {
	const clientUuid = await appConfig.getClientUuid();
	const request = await fetch(`${baseUrl}/translate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			base64Images: [base64Image],
			translationModel,
			targetLangCode: translateTo,
			fingerprint: getFingerprint(),
			clientUuid
		})
	});

	if (request.status === StatusCode.InternalServerError) {
		const errorMessage = 'Server is down or experiencing issues. Sorry for the inconvenience.';
		return {
			errorMessage,
			translations: [
				{
					originalLanguage: 'Unknown',
					translatedText: errorMessage,
					minX: 0,
					minY: 0,
					maxX: 200,
					maxY: 200
				}
			]
		};
	}

	if (request.status === StatusCode.TooManyRequests) {
		const errorMessage = 'Out of translations. Server costs are expensive. Upgrade for more!';
		return {
			errorMessage,
			translations: [
				{
					originalLanguage: 'Unknown',
					translatedText: errorMessage,
					minX: 0,
					minY: 0,
					maxX: 200,
					maxY: 200
				}
			]
		};
	}

	const results = await request.json();

	return {
		translations: results.images[0] as TranslationResult[]
	};
}

export function debug(message) {
	if (isDebug) {
		console.log(message);
	}
}

let fingerprint: string = null; // Do not access this directly, use getFingerprint().
function getFingerprint() {
	if (fingerprint) {
		return fingerprint;
	}

	// Initialize fingerprint.
	const webGlRenderer = getWebGlRenderer();
	const hardware = getHardware();
	const connectionString = getConnectionString();
	const timezoneCode = new Date().getTimezoneOffset();
	fingerprint = btoa(`${webGlRenderer}-${hardware}-${connectionString}-${timezoneCode}`);

	return fingerprint;
}

function getWebGlRenderer() {
	const gl = new OffscreenCanvas(0, 0).getContext('webgl');
	if (!gl) {
		return 'none';
	}
	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
	return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
}

function getHardware() {
	const hardwareConcurrency = navigator?.hardwareConcurrency;
	const deviceMemory = navigator['deviceMemory'];
	return `${hardwareConcurrency}-${deviceMemory}`;
}

function getConnectionString() {
	const type = navigator['connection']?.type;
	const rtt = navigator['connection']?.rtt;
	const downlinkMax = navigator['connection']?.downlinkMax;
	const effectiveType = navigator['connection']?.effectiveType;
	const saveData = navigator['connection']?.saveData;
	return `${type}-${rtt}-${downlinkMax}-${effectiveType}-${saveData}`;
}
