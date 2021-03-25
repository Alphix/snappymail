import ko from 'ko';

import {
	Capa,
	Scope
} from 'Common/Enums';

import {
	ComposeType,
	FolderType,
	MessageSetAction
} from 'Common/EnumsUser';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import { doc, leftPanelDisabled, moveAction, Settings, SettingsGet } from 'Common/Globals';

import { computedPaginatorHelper, showMessageComposer } from 'Common/UtilsUser';
import { FileInfo } from 'Common/File';

import { mailBox, serverRequest } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n, initOnStartOrLangChange } from 'Common/Translator';

import {
	getFolderFromCacheList,
	MessageFlagsCache,
	hasRequestedMessage,
	addRequestedMessage
} from 'Common/Cache';

import { AppUserStore } from 'Stores/User/App';
import { QuotaUserStore } from 'Stores/User/Quota';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup, popupVisibilityNames } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { FolderClearPopupView } from 'View/Popup/FolderClear';
import { AdvancedSearchPopupView } from 'View/Popup/AdvancedSearch';

const
	canBeMovedHelper = () => MessageUserStore.hasCheckedOrSelected();

export class MessageListMailBoxUserView extends AbstractViewRight {
	constructor() {
		super('User/MailBox/MessageList', 'MailMessageList');

		this.sLastUid = null;
		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.iGoToUpUpOrDownDownTimeout = 0;

		this.newMoveToFolder = !!SettingsGet('NewMoveToFolder');

		this.allowReload = Settings.capa(Capa.Reload);
		this.allowSearch = Settings.capa(Capa.Search);
		this.allowSearchAdv = Settings.capa(Capa.SearchAdv);
		this.allowComposer = Settings.capa(Capa.Composer);
		this.allowMessageListActions = Settings.capa(Capa.MessageListActions);
		this.allowDangerousActions = Settings.capa(Capa.DangerousActions);

		this.popupVisibility = ko.computed(() => 0 < popupVisibilityNames().length);

		this.message = MessageUserStore.message;
		this.messageList = MessageUserStore.list;
		this.messageListDisableAutoSelect = MessageUserStore.listDisableAutoSelect;

		this.folderList = FolderUserStore.folderList;

		this.composeInEdit = AppUserStore.composeInEdit;
		this.leftPanelDisabled = leftPanelDisabled;

		this.selectorMessageSelected = MessageUserStore.selectorMessageSelected;
		this.selectorMessageFocused = MessageUserStore.selectorMessageFocused;
		this.isMessageSelected = MessageUserStore.isMessageSelected;
		this.messageListSearch = MessageUserStore.listSearch;
		this.messageListThreadUid = MessageUserStore.listThreadUid;
		this.messageListError = MessageUserStore.listError;
		this.folderMenuForMove = FolderUserStore.folderMenuForMove;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.mainMessageListSearch = MessageUserStore.mainMessageListSearch;
		this.messageListEndFolder = MessageUserStore.listEndFolder;
		this.messageListEndThreadUid = MessageUserStore.listEndThreadUid;

		this.messageListCheckedOrSelected = MessageUserStore.listCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageUserStore.listCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = MessageUserStore.listCompleteLoading;
		this.messageListCompleteLoadingThrottleForAnimation = MessageUserStore.listLoadingAnimation;

		initOnStartOrLangChange(() => this.emptySubjectValue = i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT'));

		this.userQuota = QuotaUserStore.quota;
		this.userUsageSize = QuotaUserStore.usage;
		this.userUsageProc = QuotaUserStore.percentage;

		this.addObservables({
			moveDropdownTrigger: false,
			moreDropdownTrigger: false,

			dragOverArea: null,
			dragOverBodyArea: null,

			inputMessageListSearchFocus: false
		});

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ throttle: 1 });
		this.dragOverEnter = ko.observable(false).extend({ throttle: 1 });

		this.sLastSearchValue = '';

		this.addComputables({
			messageListSearchDesc: () => {
				const value = MessageUserStore.listEndSearch();
				return value ? i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { SEARCH: value }) : ''
			},

			messageListPaginator: computedPaginatorHelper(MessageUserStore.listPage,
				MessageUserStore.listPageCount),

			checkAll: {
				read: () => 0 < MessageUserStore.listChecked().length,
				write: (value) => {
					value = !!value;
					MessageUserStore.list.forEach(message => message.checked(value));
				}
			},

			inputProxyMessageListSearch: {
				read: this.mainMessageListSearch,
				write: value => this.sLastSearchValue = value
			},

			isIncompleteChecked: () => {
				const c = MessageUserStore.listChecked().length;
				return c && MessageUserStore.list.length > c;
			},

			hasMessages: () => 0 < this.messageList.length,

			isSpamFolder: () => (FolderUserStore.spamFolder() || 0) === this.messageListEndFolder(),

			isSpamDisabled: () => UNUSED_OPTION_VALUE === FolderUserStore.spamFolder(),

			isTrashFolder: () => (FolderUserStore.trashFolder() || 0) === this.messageListEndFolder(),

			isDraftFolder: () => (FolderUserStore.draftFolder() || 0) === this.messageListEndFolder(),

			isSentFolder: () => (FolderUserStore.sentFolder() || 0) === this.messageListEndFolder(),

			isArchiveFolder: () => (FolderUserStore.archiveFolder() || 0) === this.messageListEndFolder(),

			isArchiveDisabled: () => UNUSED_OPTION_VALUE === FolderUserStore.archiveFolder(),

			isArchiveVisible: () => !this.isArchiveFolder() && !this.isArchiveDisabled() && !this.isDraftFolder(),

			isSpamVisible: () =>
				!this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder(),

			isUnSpamVisible: () =>
				this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder(),

			mobileCheckedStateShow: () => ThemeStore.isMobile() ? 0 < MessageUserStore.listChecked().length : true,

			mobileCheckedStateHide: () => ThemeStore.isMobile() ? !MessageUserStore.listChecked().length : true,

			messageListFocused: () => Scope.MessageList === AppUserStore.focusedState()
		});

		this.hasCheckedOrSelectedLines = MessageUserStore.hasCheckedOrSelected,

		this.quotaTooltip = this.quotaTooltip.bind(this);

		this.selector = new Selector(
			this.messageList,
			this.selectorMessageSelected,
			this.selectorMessageFocused,
			'.messageListItem .actionHandle',
			'.messageListItem .checkboxMessage',
			'.messageListItem.focused'
		);

		this.selector.on('onItemSelect', message => MessageUserStore.selectMessage(message));

		this.selector.on('onItemGetUid', message => (message ? message.generateUid() : ''));

		this.selector.on('onAutoSelect', () => this.useAutoSelect());

		this.selector.on('onUpUpOrDownDown', v => this.goToUpUpOrDownDown(v));

		addEventListener('mailbox.message-list.selector.go-down',
			e => this.selector.newSelectPosition('ArrowDown', false, e.detail)
		);

		addEventListener('mailbox.message-list.selector.go-up',
			e => this.selector.newSelectPosition('ArrowUp', false, e.detail)
		);

		addEventListener('mailbox.message.show', e => {
			const sFolder = e.detail.Folder, sUid = e.detail.Uid;

			const message = this.messageList.find(
				item => item && sFolder === item.folder && sUid === item.uid
			);

			if ('INBOX' === sFolder) {
				rl.route.setHash(mailBox(sFolder, 1));
			}

			if (message) {
				this.selector.selectMessageItem(message);
			} else {
				if ('INBOX' !== sFolder) {
					rl.route.setHash(mailBox(sFolder, 1));
				}

				MessageUserStore.selectMessageByFolderAndUid(sFolder, sUid);
			}
		});

		MessageUserStore.listEndHash.subscribe((() =>
			this.selector.scrollToFocused()
		).throttle(50));

		decorateKoCommands(this, {
			clearCommand: 1,
			reloadCommand: 1,
			multyForwardCommand: canBeMovedHelper,
			deleteWithoutMoveCommand: canBeMovedHelper,
			deleteCommand: canBeMovedHelper,
			archiveCommand: canBeMovedHelper,
			spamCommand: canBeMovedHelper,
			notSpamCommand: canBeMovedHelper,
			moveCommand: canBeMovedHelper,
			moveNewCommand: canBeMovedHelper,
		});
	}

	clearCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			showScreenPopup(FolderClearPopupView, [FolderUserStore.currentFolder()]);
		}
	}

	reloadCommand() {
		if (!MessageUserStore.listLoadingAnimation() && this.allowReload) {
			rl.app.reloadMessageList(false, true);
		}
	}

	multyForwardCommand() {
		showMessageComposer([
			ComposeType.ForwardAsAttachment,
			MessageUserStore.listCheckedOrSelected()
		]);
	}

	deleteWithoutMoveCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			rl.app.deleteMessagesFromFolder(
				FolderType.Trash,
				FolderUserStore.currentFolderFullNameRaw(),
				MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
				false
			);
		}
	}

	deleteCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Trash,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	archiveCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Archive,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	spamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Spam,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	notSpamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.NotSpam,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	moveCommand() {}

	moveNewCommand(vm, event) {
		if (this.newMoveToFolder && this.mobileCheckedStateShow()) {
			if (vm && event && event.preventDefault) {
				event.preventDefault();
				event.stopPropagation();
			}

			let b = moveAction();
			AppUserStore.focusedState(b ? Scope.MessageList : Scope.FolderList);
			moveAction(!b);
		}
	}

	hideLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(true);
	}

	showLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(false);
	}

	composeClick() {
		showMessageComposer();
	}

	goToUpUpOrDownDown(up) {
		if (MessageUserStore.listChecked().length) {
			return false;
		}

		clearTimeout(this.iGoToUpUpOrDownDownTimeout);
		this.iGoToUpUpOrDownDownTimeout = setTimeout(() => {
			let prev, next, temp, current;

			this.messageListPaginator().find(item => {
				if (item) {
					if (current) {
						next = item;
					}

					if (item.current) {
						current = item;
						prev = temp;
					}

					if (next) {
						return true;
					}

					temp = item;
				}

				return false;
			});

			if (!SettingsUserStore.usePreviewPane() && !this.message()) {
				this.selector.iFocusedNextHelper = up ? -1 : 1;
			} else {
				this.selector.iSelectNextHelper = up ? -1 : 1;
			}

			if (up ? prev : next) {
				this.selector.unselect();
				this.gotoPage(up ? prev : next);
			}
		}, 350);

		return true;
	}

	useAutoSelect() {
		return !this.messageListDisableAutoSelect()
			&& !/is:unseen/.test(this.mainMessageListSearch())
			&& SettingsUserStore.usePreviewPane();
	}

	searchEnterAction() {
		this.mainMessageListSearch(this.sLastSearchValue);
		this.inputMessageListSearchFocus(false);
	}

	cancelSearch() {
		this.mainMessageListSearch('');
		this.inputMessageListSearchFocus(false);
	}

	cancelThreadUid() {
		rl.route.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				MessageUserStore.listPageBeforeThread(),
				MessageUserStore.listSearch()
			)
		);
	}

	/**
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean} bCopy
	 * @returns {boolean}
	 */
	moveSelectedMessagesToFolder(sToFolderFullNameRaw, bCopy) {
		if (MessageUserStore.hasCheckedOrSelected()) {
			rl.app.moveMessagesToFolder(
				FolderUserStore.currentFolderFullNameRaw(),
				MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
				sToFolderFullNameRaw,
				bCopy
			);
		}

		return false;
	}

	getDragData(event) {
		const item = ko.dataFor(doc.elementFromPoint(event.clientX, event.clientY));
		item && item.checked && item.checked(true);
		const uids = MessageUserStore.listCheckedOrSelectedUidsWithSubMails();
		item && !uids.includes(item.uid) && uids.push(item.uid);
		return uids.length ? {
			copy: event.ctrlKey,
			folder: FolderUserStore.currentFolderFullNameRaw(),
			uids: uids
		} : null;
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 * @returns {void}
	 */
	setAction(sFolderFullNameRaw, iSetAction, aMessages) {
		rl.app.messageListAction(sFolderFullNameRaw, iSetAction, aMessages);
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {string} sThreadUid = ''
	 * @returns {void}
	 */
	setActionForAll(sFolderFullNameRaw, iSetAction, sThreadUid = '') {
		if (sFolderFullNameRaw) {
			let cnt = 0;
			const uids = [];

			let folder = getFolderFromCacheList(sFolderFullNameRaw);
			if (folder) {
				switch (iSetAction) {
					case MessageSetAction.SetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageUserStore.list.forEach(message => {
								if (message.isUnseen()) {
									++cnt;
								}

								message.isUnseen(false);
								uids.push(message.uid);
							});

							if (sThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() - cnt);
								if (0 > folder.messageCountUnread()) {
									folder.messageCountUnread(0);
								}
							} else {
								folder.messageCountUnread(0);
							}

							MessageFlagsCache.clearFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>{}, sFolderFullNameRaw, true, sThreadUid ? uids : null);
						break;
					case MessageSetAction.UnsetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageUserStore.list.forEach(message => {
								if (!message.isUnseen()) {
									++cnt;
								}

								message.isUnseen(true);
								uids.push(message.uid);
							});

							if (sThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() + cnt);
								if (folder.messageCountAll() < folder.messageCountUnread()) {
									folder.messageCountUnread(folder.messageCountAll());
								}
							} else {
								folder.messageCountUnread(folder.messageCountAll());
							}

							MessageFlagsCache.clearFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>{}, sFolderFullNameRaw, false, sThreadUid ? uids : null);
						break;
					// no default
				}

				rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	}

	listSetSeen() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listSetAllSeen() {
		this.setActionForAll(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			this.messageListEndThreadUid()
		);
	}

	listUnsetSeen() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetSeen,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listSetFlags() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetFlag,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listUnsetFlags() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetFlag,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	flagMessages(currentMessage) {
		const checked = this.messageListCheckedOrSelected();
		if (currentMessage) {
			const checkedUids = checked.map(message => message.uid);
			if (checkedUids.includes(currentMessage.uid)) {
				this.setAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[currentMessage]
				);
			}
		}
	}

	flagMessagesFast(bFlag) {
		const checked = this.messageListCheckedOrSelected();
		if (checked.length) {
			if (undefined === bFlag) {
				const flagged = checked.filter(message => message.isFlagged());
				this.setAction(
					checked[0].folder,
					checked.length === flagged.length ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					checked[0].folder,
					!bFlag ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			}
		}
	}

	seenMessagesFast(seen) {
		const checked = this.messageListCheckedOrSelected();
		if (checked.length) {
			if (undefined === seen) {
				const unseen = checked.filter(message => message.isUnseen());
				this.setAction(
					checked[0].folder,
					unseen.length ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			} else {
				this.setAction(
					checked[0].folder,
					seen ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			}
		}
	}

	gotoPage(page) {
		page && rl.route.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				page.value,
				MessageUserStore.listSearch(),
				MessageUserStore.listThreadUid()
			)
		);
	}

	gotoThread(message) {
		if (message && 0 < message.threadsLen()) {
			MessageUserStore.listPageBeforeThread(MessageUserStore.listPage());

			rl.route.setHash(
				mailBox(FolderUserStore.currentFolderFullNameHash(), 1, MessageUserStore.listSearch(), message.uid)
			);
		}
	}

	clearListIsVisible() {
		return (
			!this.messageListSearchDesc() &&
			!this.messageListError() &&
			!this.messageListEndThreadUid() &&
			this.messageList.length &&
			(this.isSpamFolder() || this.isTrashFolder())
		);
	}

	onBuild(dom) {
		const eqs = (ev, s) => ev.target.closestWithin(s, dom);

		this.selector.init(dom.querySelector('.b-content'), Scope.MessageList);

		dom.addEventListener('click', event => {
			ThemeStore.isMobile() && leftPanelDisabled(true);

			if (eqs(event, '.messageList .b-message-list-wrapper') && Scope.MessageView === AppUserStore.focusedState()) {
				AppUserStore.focusedState(Scope.MessageList);
			}

			let el = eqs(event, '.e-paginator .e-page');
			el && this.gotoPage(ko.dataFor(el));

			eqs(event, '.messageList .checkboxCheckAll') && this.checkAll(!this.checkAll());

			el = eqs(event, '.messageList .messageListItem .flagParent');
			el && this.flagMessages(ko.dataFor(el));

			el = eqs(event, '.messageList .messageListItem .threads-len');
			el && this.gotoThread(ko.dataFor(el));
		});

		dom.addEventListener('dblclick', event => {
			let  el = eqs(event, '.messageList .messageListItem .actionHandle');
			el && this.gotoThread(ko.dataFor(el));
		});

		this.initUploaderForAppend();
		this.initShortcuts();

		if (!ThemeStore.isMobile() && Settings.capa(Capa.Prefetch)) {
			ifvisible.idle(this.prefetchNextTick.bind(this));
		}
	}

	initShortcuts() {
		shortcuts.add('enter,open', '', Scope.MessageList, () => {
			if (this.message() && this.useAutoSelect()) {
				dispatchEvent(new CustomEvent('mailbox.message-view.toggle-full-screen'));
				return false;
			}

			return true;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// archive (zip)
			shortcuts.add('z', '', [Scope.MessageList, Scope.MessageView], () => {
				this.archiveCommand();
				return false;
			});

			// delete
			shortcuts.add('delete', 'shift', Scope.MessageList, () => {
				MessageUserStore.listCheckedOrSelected().length && this.deleteWithoutMoveCommand();
				return false;
			});
//			shortcuts.add('3', 'shift', Scope.MessageList, () => {
			shortcuts.add('delete', '', Scope.MessageList, () => {
				MessageUserStore.listCheckedOrSelected().length && this.deleteCommand();
				return false;
			});
		}

		if (Settings.capa(Capa.Reload)) {
			// check mail
			shortcuts.add('r', 'meta', [Scope.FolderList, Scope.MessageList, Scope.MessageView], () => {
				this.reloadCommand();
				return false;
			});
		}

		// check all
		shortcuts.add('a', 'meta', Scope.MessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		shortcuts.add('w,c,new', '', [Scope.MessageList, Scope.MessageView], () => {
			showMessageComposer();
			return false;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// important - star/flag messages
			shortcuts.add('i', '', [Scope.MessageList, Scope.MessageView], () => {
				this.flagMessagesFast();
				return false;
			});
		}

		shortcuts.add('t', '', [Scope.MessageList], () => {
			let message = this.selectorMessageSelected();
			if (!message) {
				message = this.selectorMessageFocused();
			}

			if (message && 0 < message.threadsLen()) {
				this.gotoThread(message);
			}

			return false;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// move
			shortcuts.add('insert', '', Scope.MessageList, () => {
				if (this.newMoveToFolder) {
					this.moveNewCommand();
				} else {
					this.moveDropdownTrigger(true);
				}

				return false;
			});
		}

		if (Settings.capa(Capa.MessageListActions)) {
			// read
			shortcuts.add('q', '', [Scope.MessageList, Scope.MessageView], () => {
				this.seenMessagesFast(true);
				return false;
			});

			// unread
			shortcuts.add('u', '', [Scope.MessageList, Scope.MessageView], () => {
				this.seenMessagesFast(false);
				return false;
			});
		}

		shortcuts.add('f,mailforward', 'shift', [Scope.MessageList, Scope.MessageView], () => {
			this.multyForwardCommand();
			return false;
		});

		if (Settings.capa(Capa.Search)) {
			// search input focus
			shortcuts.add('/', '', [Scope.MessageList, Scope.MessageView], () => {
				this.inputMessageListSearchFocus(true);
				return false;
			});
		}

		// cancel search
		shortcuts.add('escape', '', Scope.MessageList, () => {
			if (this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if (this.messageListEndThreadUid()) {
				this.cancelThreadUid();
				return false;
			}

			return true;
		});

		// change focused state
		shortcuts.add('tab', 'shift', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		shortcuts.add('arrowleft', '', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		shortcuts.add('tab,arrowright', '', Scope.MessageList, () => {
			this.message() && AppUserStore.focusedState(Scope.MessageView);
			return false;
		});

		shortcuts.add('arrowleft', 'meta', Scope.MessageView, ()=>false);
		shortcuts.add('arrowright', 'meta', Scope.MessageView, ()=>false);
	}

	prefetchNextTick() {
		if (!this.bPrefetch && !ifvisible.now() && this.viewModelVisible) {
			const message = this.messageList.find(
				item => item && !hasRequestedMessage(item.folder, item.uid)
			);
			if (message) {
				this.bPrefetch = true;

				addRequestedMessage(message.folder, message.uid);

				Remote.message(
					iError => {
						const next = !iError;
						setTimeout(() => {
							this.bPrefetch = false;
							next && this.prefetchNextTick();
						}, 1000);
					},
					message.folder,
					message.uid
				);
			}
		}
	}

	advancedSearchClick() {
		Settings.capa(Capa.SearchAdv)
			&& showScreenPopup(AdvancedSearchPopupView, [this.mainMessageListSearch()]);
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			SIZE: FileInfo.friendlySize(this.userUsageSize()),
			PROC: this.userUsageProc(),
			LIMIT: FileInfo.friendlySize(this.userQuota())
		});
	}

	initUploaderForAppend() {
		if (!Settings.app('allowAppendMessage') || !this.dragOverArea()) {
			return false;
		}

		const oJua = new Jua({
			action: serverRequest('Append'),
			name: 'AppendFile',
			queueSize: 1,
			multipleSizeLimit: 1,
			hidden: {
				Folder: () => FolderUserStore.currentFolderFullNameRaw()
			},
			dragAndDropElement: this.dragOverArea(),
			dragAndDropBodyElement: this.dragOverBodyArea()
		});

		this.dragOver.subscribe(value => value && this.selector.scrollToTop());

		oJua
			.on('onDragEnter', () => this.dragOverEnter(true))
			.on('onDragLeave', () => this.dragOverEnter(false))
			.on('onBodyDragEnter', () => this.dragOver(true))
			.on('onBodyDragLeave', () => this.dragOver(false))
			.on('onSelect', (sUid, oData) => {
				if (sUid && oData && 'message/rfc822' === oData.Type) {
					MessageUserStore.listLoading(true);
					return true;
				}

				return false;
			})
			.on('onComplete', () => rl.app.reloadMessageList(true, true));

		return !!oJua;
	}
}
