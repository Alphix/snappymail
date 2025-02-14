const
	htmlre = /[&<>"']/g,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	};

/**
 * @param {string} text
 * @returns {string}
 */
export function encodeHtml(text) {
	return (text && text.toString ? text.toString() : ''+text).replace(htmlre, m => htmlmap[m]);
}

export class HtmlEditor {
	/**
	 * @param {Object} element
	 * @param {Function=} onBlur
	 * @param {Function=} onReady
	 * @param {Function=} onModeChange
	 */
	constructor(element, onBlur = null, onReady = null, onModeChange = null) {
		this.blurTimer = 0;

		this.onBlur = onBlur;
		this.onReady = onReady ? [onReady] : [];
		this.onModeChange = onModeChange;

		this.resize = (() => {
			try {
				this.editor && this.editor.resize(element.clientWidth, element.clientHeight);
			} catch (e) {} // eslint-disable-line no-empty
		}).throttle(100);

		if (element) {
			let editor;

			const onReady = () => {
				this.editor = editor;
				this.resize();
				this.onReady.forEach(fn => fn());
			};

			if (rl.createWYSIWYG) {
				editor = rl.createWYSIWYG(element, onReady);
			}
			if (!editor) {
				editor = new SquireUI(element);
				setTimeout(onReady,1);
			}

			editor.on('blur', () => this.blurTrigger());
			editor.on('focus', () => this.blurTimer && clearTimeout(this.blurTimer));
			editor.on('mode', () => {
				this.blurTrigger();
				this.onModeChange && this.onModeChange(!this.isPlain());
			});
		}
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.onBlur && this.onBlur(), 200);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isHtml() {
		return this.editor ? !this.isPlain() : false;
	}

	/**
	 * @returns {boolean}
	 */
	isPlain() {
		return this.editor ? 'plain' === this.editor.mode : false;
	}

	/**
	 * @returns {void}
	 */
	clearCachedSignature() {
		const fn = () => this.editor.execCommand('insertSignature', {
			clearCache: true
		});
		this.editor ? fn() : this.onReady.push(fn);
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 * @returns {void}
	 */
	setSignature(signature, html, insertBefore = false) {
		const fn = () => this.editor.execCommand('insertSignature', {
			isHtml: html,
			insertBefore: insertBefore,
			signature: signature
		});
		this.editor ? fn() : this.onReady.push(fn);
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getData(wrapIsHtml = false) {
		let result = '';
		if (this.editor) {
			try {
				if (this.isPlain() && this.editor.plugins.plain && this.editor.__plain) {
					result = this.editor.__plain.getRawData();
				} else {
					result = wrapIsHtml
						? '<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
						  this.editor.getData() +
						  '</div>'
						: this.editor.getData();
				}
			} catch (e) {} // eslint-disable-line no-empty
		}

		return result;
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getDataWithHtmlMark(wrapIsHtml = false) {
		return (this.isHtml() ? ':HTML:' : '') + this.getData(wrapIsHtml);
	}

	modeWysiwyg() {
		try {
			this.editor && this.editor.setMode('wysiwyg');
		} catch (e) { console.error(e); }
	}
	modePlain() {
		try {
			this.editor && this.editor.setMode('plain');
		} catch (e) { console.error(e); }
	}

	setHtmlOrPlain(text) {
		if (':HTML:' === text.substr(0, 6)) {
			this.setHtml(text.substr(6));
		} else {
			this.setPlain(text);
		}
	}

	setData(mode, data) {
		const fn = () => {
			const editor = this.editor;
			this.clearCachedSignature();
			try {
				editor.setMode(mode);
				if (this.isPlain() && editor.plugins.plain && editor.__plain) {
					editor.__plain.setRawData(data);
				} else {
					editor.setData(data);
				}
			} catch (e) { console.error(e); }
		};
		this.editor ? fn() : this.onReady.push(fn);
	}

	setHtml(html) {
		this.setData('wysiwyg', html/*.replace(/<p[^>]*><\/p>/gi, '')*/);
	}

	setPlain(txt) {
		this.setData('plain', txt);
	}

	focus() {
		try {
			this.editor && this.editor.focus();
		} catch (e) {} // eslint-disable-line no-empty
	}

	hasFocus() {
		try {
			return this.editor && !!this.editor.focusManager.hasFocus;
		} catch (e) {
			return false;
		}
	}

	blur() {
		try {
			this.editor && this.editor.focusManager.blur(true);
		} catch (e) {} // eslint-disable-line no-empty
	}

	clear() {
		this.setHtml('');
	}
}
