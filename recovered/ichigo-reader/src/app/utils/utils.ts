import { updateSessionHeaders } from '../../utils/chromeApi';

// A set of common functions that aren't worth grouping alone.
// Break module into multiple modules when it grows too large (800+ LOC).
export function sleepMs(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

const ModifyHeaders = 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS;
const SetHeader = 'set' as chrome.declarativeNetRequest.HeaderOperation.SET;
const Request = 'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST;

let id = 1;
function getId() {
	return id++;
}

export async function getImage(src: string) {
	let hostname;
	try {
		hostname = new URL(src).hostname;
	} catch {
		hostname = '';
	}

	// Check if hostname matches any of the referer header rule ids.
	const ruleValues = Object.values(rules);
	for (const rule of ruleValues) {
		if (hostname.includes(rule.condition.urlFilter)) {
			const clonedRule = { ...rule, id: getId() };
			updateSessionHeaders({ addRules: [clonedRule] });

			const result = await fetch(src);

			updateSessionHeaders({ removeRuleIds: [clonedRule.id] });
			return result;
		}
	}

	// Otherwise, return regular fetch request.
	return await fetch(src);
}

const rules = {
	pixiv: {
		id: getId(),
		priority: 1,
		action: {
			type: ModifyHeaders,
			requestHeaders: [
				{ header: 'referer', operation: SetHeader, value: 'https://www.pixiv.net/' }
			]
		},
		condition: {
			urlFilter: 'pximg.net',
			resourceTypes: [Request]
		}
	},
	manhuagui: {
		id: getId(),
		priority: 1,
		action: {
			type: ModifyHeaders,
			requestHeaders: [
				{
					header: 'referer',
					operation: SetHeader,
					value: 'https://www.manhuagui.com/'
				}
			]
		},
		condition: {
			urlFilter: 'i.hamreus.com',
			resourceTypes: [Request]
		}
	},
	hitomi: {
		id: getId(),
		priority: 1,
		action: {
			type: ModifyHeaders,
			requestHeaders: [
				{
					header: 'referer',
					operation: SetHeader,
					value: 'https://hitomi.la/'
				}
			]
		},
		condition: {
			urlFilter: 'hitomi.la',
			resourceTypes: [Request]
		}
	},
	klmanga: {
		id: getId(),
		priority: 1,
		action: {
			type: ModifyHeaders,
			requestHeaders: [
				{
					header: 'referer',
					operation: SetHeader,
					value: 'https://klmanga.com/'
				}
			]
		},
		condition: {
			urlFilter: 'klimv1.xyz',
			resourceTypes: [Request]
		}
	}
};
