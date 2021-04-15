import ko from 'ko';
import { Notification, UploadErrorCode } from 'Common/Enums';
import { langLink } from 'Common/Links';
import { doc, createElement } from 'Common/Globals';

let I18N_DATA = window.snappymailI18N || {};

export const trigger = ko.observable(false);

/**
 * @param {string} key
 * @param {Object=} valueList
 * @param {string=} defaulValue
 * @returns {string}
 */
export function i18n(key, valueList, defaulValue) {
	let path = key.split('/');
	if (!I18N_DATA[path[0]] || !path[1]) {
		return defaulValue || key;
	}
	let result = I18N_DATA[path[0]][path[1]] || defaulValue || key;
	if (valueList) {
		Object.entries(valueList).forEach(([key, value]) => {
			result = result.replace('%' + key + '%', value);
		});
	}
	return result;
}

const i18nToNode = element => {
	const key = element.dataset.i18n;
	if (key) {
		if ('[' === key.substr(0, 1)) {
			switch (key.substr(0, 6)) {
				case '[html]':
					element.innerHTML = i18n(key.substr(6));
					break;
				case '[place':
					element.placeholder = i18n(key.substr(13));
					break;
				case '[title':
					element.title = i18n(key.substr(7));
					break;
				// no default
			}
		} else {
			element.textContent = i18n(key);
		}
	}
},

	i18nKey = key => key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),

	getKeyByValue = (o, v) => Object.keys(o).find(key => o[key] === v);

/**
 * @param {Object} elements
 * @param {boolean=} animate = false
 */
export function i18nToNodes(element) {
	setTimeout(() =>
		element.querySelectorAll('[data-i18n]').forEach(item => i18nToNode(item))
	, 1);
}

/**
 * @param {Function} startCallback
 * @param {Function=} langCallback = null
 */
export function initOnStartOrLangChange(startCallback, langCallback = null) {
	startCallback && startCallback();
	startCallback && trigger.subscribe(startCallback);
	langCallback && trigger.subscribe(langCallback);
}

function getNotificationMessage(code) {
	let key = getKeyByValue(Notification, code);
	if (key) {
		key = i18nKey(key).replace('_NOTIFICATION', '_ERROR');
		return I18N_DATA.NOTIFICATIONS[key];
	}
}

/**
 * @param {number} code
 * @param {*=} message = ''
 * @param {*=} defCode = null
 * @returns {string}
 */
export function getNotification(code, message = '', defCode = 0) {
	code = parseInt(code, 10) || 0;
	if (Notification.ClientViewError === code && message) {
		return message;
	}

	return getNotificationMessage(code)
		|| getNotificationMessage(parseInt(defCode, 10))
		|| '';
}

/**
 * @param {*} code
 * @returns {string}
 */
export function getUploadErrorDescByCode(code) {
	let result = 'UNKNOWN';
	code = parseInt(code, 10) || 0;
	switch (code) {
		case UploadErrorCode.FileIsTooBig:
		case UploadErrorCode.FilePartiallyUploaded:
		case UploadErrorCode.NoFileUploaded:
		case UploadErrorCode.MissingTempFolder:
		case UploadErrorCode.OnSavingFile:
		case UploadErrorCode.FileType:
			result = i18nKey(getKeyByValue(UploadErrorCode, code));
			break;
	}
	return i18n('UPLOAD/ERROR_' + result);
}

/**
 * @param {boolean} admin
 * @param {string} language
 */
export function reload(admin, language) {
	return new Promise((resolve, reject) => {
		const script = createElement('script');
		script.onload = () => {
			// reload the data
			if (window.snappymailI18N) {
				I18N_DATA = window.snappymailI18N;
				i18nToNodes(doc);
				dispatchEvent(new CustomEvent('reload-time'));
				trigger(!trigger());
			}
			window.snappymailI18N = null;
			script.remove();
			resolve();
		};
		script.onerror = () => reject(new Error('Language '+language+' failed'));
		script.src = langLink(language, admin);
//		script.async = true;
		doc.head.append(script);
	});
}

/**
 *
 * @param {string} language
 * @param {boolean=} isEng = false
 * @returns {string}
 */
export function convertLangName(language, isEng = false) {
	return i18n(
		'LANGS_NAMES' + (true === isEng ? '_EN' : '') + '/' + language,
		null,
		language
	);
}
