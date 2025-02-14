import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { MessageUserStore } from 'Stores/User/Message';

import { Capa, Scope } from 'Common/Enums';
import { settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { KeyboardShortcutsHelpPopupView } from 'View/Popup/KeyboardShortcutsHelp';
import { AccountPopupView } from 'View/Popup/Account';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { doc, Settings, leftPanelDisabled } from 'Common/Globals';

import { ThemeStore } from 'Stores/Theme';

export class AbstractSystemDropDownUserView extends AbstractViewRight {
	constructor(name) {
		super(name, 'SystemDropDown');

		this.allowAccounts = Settings.capa(Capa.AdditionalAccounts);
		this.allowSettings = Settings.capa(Capa.Settings);
		this.allowHelp = Settings.capa(Capa.Help);

		this.accountEmail = AccountUserStore.email;

		this.accounts = AccountUserStore.accounts;
		this.accountsLoading = AccountUserStore.loading;
		this.accountsUnreadCount = AccountUserStore.accountsUnreadCount;

		this.addObservables({
			currentAudio: '',
			accountMenuDropdownTrigger: false
		});

		this.allowContacts = AppUserStore.allowContacts();

		addEventListener('audio.stop', () => this.currentAudio(''));
		addEventListener('audio.start', e => this.currentAudio(e.detail));
	}

	stopPlay() {
		dispatchEvent(new CustomEvent('audio.api.stop'));
	}

	accountClick(account, event) {
		if (account && 0 === event.button) {
			AccountUserStore.loading(true);
			setTimeout(() => AccountUserStore.loading(false), 1000);
		}

		return true;
	}

	emailTitle() {
		return AccountUserStore.email();
	}

	settingsClick() {
		this.allowSettings && rl.route.setHash(settings());
	}

	settingsHelp() {
		this.allowHelp && showScreenPopup(KeyboardShortcutsHelpPopupView);
	}

	addAccountClick() {
		this.allowAccounts && showScreenPopup(AccountPopupView);
	}

	contactsClick() {
		this.allowContacts && showScreenPopup(ContactsPopupView);
	}

	layoutDesktop()
	{
		doc.cookie = 'rllayout=desktop';
		ThemeStore.isMobile(false);
		leftPanelDisabled(false);
//		location.reload();
	}

	layoutMobile()
	{
		doc.cookie = 'rllayout=mobile';
		ThemeStore.isMobile(true);
		leftPanelDisabled(true);
//		location.reload();
	}

	logoutClick() {
		rl.app.logout();
	}

	onBuild() {
		shortcuts.add('m,contextmenu', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (this.viewModelVisible) {
				MessageUserStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
				return false;
			}
		});

		// shortcuts help
		shortcuts.add('?,f1,help', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (this.viewModelVisible) {
				showScreenPopup(KeyboardShortcutsHelpPopupView);
				return false;
			}
		});
	}
}
