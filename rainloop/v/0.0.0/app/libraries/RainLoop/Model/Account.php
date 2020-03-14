<?php

namespace RainLoop\Model;

class Account extends \RainLoop\Account // for backward compatibility
{
	/**
	 * @var string
	 */
	private $sEmail;

	/**
	 * @var string
	 */
	private $sLogin;

	/**
	 * @var int
	 */
	private $sPassword;

	/**
	 * @var string
	 */
	private $sProxyAuthUser;

	/**
	 * @var string
	 */
	private $sProxyAuthPassword;

	/**
	 * @var string
	 */
	private $sClientCert;

	/**
	 * @var string
	 */
	private $sSignMeToken;

	/**
	 * @var \RainLoop\Model\Domain
	 */
	private $oDomain;

	/**
	 * @var string
	 */
	private $sParentEmail;

	/**
	 * @param \RainLoop\Model\Domain $oDomain
	 *
	 */
	protected function __construct($sEmail, $sLogin, $sPassword, \RainLoop\Model\Domain $oDomain,
		$sSignMeToken = '', $sProxyAuthUser = '', $sProxyAuthPassword = '', $sClientCert = '')
	{
		$this->sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		$this->sLogin = \MailSo\Base\Utils::IdnToAscii($sLogin);
		$this->sPassword = $sPassword;
		$this->oDomain = $oDomain;
		$this->sSignMeToken = $sSignMeToken;
		$this->sProxyAuthUser = $sProxyAuthUser;
		$this->sProxyAuthPassword = $sProxyAuthPassword;
		$this->sClientCert = $sClientCert;
		$this->sParentEmail = '';
	}

	/**
	 * @param \RainLoop\Model\Domain $oDomain
	 *
	 * @return \RainLoop\Model\Account
	 */
	public static function NewInstance(string $sEmail, string $sLogin, string $sPassword, \RainLoop\Model\Domain $oDomain,
		string $sSignMeToken = '', string $sProxyAuthUser = '', string $sProxyAuthPassword = '', string $sClientCert = '')
	{
		return new self($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, $sProxyAuthUser, $sProxyAuthPassword, $sClientCert);
	}

	public static function GenerateTokensPassword(string $sAccessToken, string $sRefreshToken) : string
	{
		return APP_GOOGLE_ACCESS_TOKEN_PREFIX.\json_encode(array($sAccessToken, $sRefreshToken));
	}

	public static function ParseTokensPassword(string $sPassword) : array
	{
		$iGatLen = \strlen(APP_GOOGLE_ACCESS_TOKEN_PREFIX);
		if ($sPassword && APP_GOOGLE_ACCESS_TOKEN_PREFIX === \substr($sPassword, 0, $iGatLen))
		{
			$aTokens = @\json_decode(\substr($sPassword, $iGatLen));
			$sAccessToken = !empty($aTokens[0]) ? $aTokens[0] : '';
			$sRefreshToken = !empty($aTokens[1]) ? $aTokens[1] : '';

			if ($sAccessToken && $sRefreshToken)
			{
				return array($sAccessToken, $sRefreshToken);
			}
		}

		return array('', '');
	}

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function ParentEmail() : string
	{
		return $this->sParentEmail;
	}

	public function ProxyAuthUser() : string
	{
		return $this->sProxyAuthUser;
	}

	public function ProxyAuthPassword() : string
	{
		return $this->sProxyAuthPassword;
	}

	public function ParentEmailHelper() : string
	{
		return 0 < \strlen($this->sParentEmail) ? $this->sParentEmail : $this->sEmail;
	}

	public function IsAdditionalAccount() : string
	{
		return 0 < \strlen($this->sParentEmail);
	}

	public function IncLogin() : string
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->IncShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	public function IncPassword() : string
	{
		return $this->sPassword;
	}

	public function OutLogin() : string
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->OutShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	public function Login() : string
	{
		return $this->IncLogin();
	}

	public function Password() : string
	{
		return $this->IncPassword();
	}

	public function ClientCert() : string
	{
		return $this->sClientCert;
	}

	public function SignMe() : bool
	{
		return 0 < \strlen($this->sSignMeToken);
	}

	public function SignMeToken() : string
	{
		return $this->sSignMeToken;
	}

	/**
	 * @return \RainLoop\Model\Domain
	 */
	public function Domain()
	{
		return $this->oDomain;
	}

	public function Hash() : string
	{
		return md5(APP_SALT.$this->Email().APP_SALT.$this->DomainIncHost().
			APP_SALT.$this->DomainIncPort().APP_SALT.$this->Password().APP_SALT.'0'.APP_SALT.$this->ParentEmail().APP_SALT);
	}

	public function SetPassword(string $sPassword) : void
	{
		$this->sPassword = $sPassword;
	}

	public function SetParentEmail(string $sParentEmail) : void
	{
		$this->sParentEmail = \trim(\MailSo\Base\Utils::IdnToAscii($sParentEmail, true));
	}

	public function SetProxyAuthUser(string $sProxyAuthUser) : void
	{
		$this->sProxyAuthUser = $sProxyAuthUser;
	}

	public function SetProxyAuthPassword(string $sProxyAuthPassword) : void
	{
		$this->sProxyAuthPassword = $sProxyAuthPassword;
	}

	public function DomainIncHost() : string
	{
		return $this->Domain()->IncHost();
	}

	public function DomainIncPort() : int
	{
		return $this->Domain()->IncPort();
	}

	public function DomainIncSecure() : int
	{
		return $this->Domain()->IncSecure();
	}

	public function DomainOutHost() : string
	{
		return $this->Domain()->OutHost();
	}

	public function DomainOutPort() : int
	{
		return $this->Domain()->OutPort();
	}

	public function DomainOutSecure() : int
	{
		return $this->Domain()->OutSecure();
	}

	public function DomainOutAuth() : bool
	{
		return $this->Domain()->OutAuth();
	}

	public function DomainSieveHost() : string
	{
		return $this->Domain()->SieveHost();
	}

	public function DomainSievePort() : int
	{
		return $this->Domain()->SievePort();
	}

	public function DomainSieveSecure() : int
	{
		return $this->Domain()->SieveSecure();
	}

	public function DomainSieveAllowRaw() : bool
	{
		return $this->Domain()->SieveAllowRaw();
	}

	public function GetAuthToken() : string
	{
		return \RainLoop\Utils::EncodeKeyValues(array(
			'token',										// 0
			$this->sEmail,								// 1
			$this->sLogin,								// 2
			$this->sPassword,							// 3
			\RainLoop\Utils::Fingerprint(),		// 4
			$this->sSignMeToken,						// 5
			$this->sParentEmail,						// 6
			\RainLoop\Utils::GetShortToken(),	// 7
			$this->sProxyAuthUser,					// 8
			$this->sProxyAuthPassword,				// 9
			0,												// 10 // lifetime
			$this->sClientCert						// 11
		));
	}

	public function GetAuthTokenQ() : string
	{
		return \RainLoop\Utils::EncodeKeyValuesQ(array(
			'token',										// 0
			$this->sEmail,								// 1
			$this->sLogin,								// 2
			$this->sPassword,							// 3
			\RainLoop\Utils::Fingerprint(),		// 4
			$this->sSignMeToken,						// 5
			$this->sParentEmail,						// 6
			\RainLoop\Utils::GetShortToken(),	// 7
			$this->sProxyAuthUser,					// 8
			$this->sProxyAuthPassword,				// 9
			0,												// 10 // lifetime
			$this->sClientCert						// 11
		));
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Mail\MailClient $oMailClient
	 * @param \RainLoop\Application $oConfig
	 * @param callable|null $refreshTokenCallback = null
	 *
	 */
	public function IncConnectAndLoginHelper($oPlugins, $oMailClient, $oConfig, $refreshTokenCallback = null) : bool
	{
		$bLogin = false;

		$aImapCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainIncHost(),
			'Port' => $this->DomainIncPort(),
			'Secure' => $this->DomainIncSecure(),
			'Login' => $this->IncLogin(),
			'Password' => $this->Password(),
			'ProxyAuthUser' => $this->ProxyAuthUser(),
			'ProxyAuthPassword' => $this->ProxyAuthPassword(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'ClientCert' => $this->ClientCert(),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_plain', true),
			'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_cram_md5', true)
		);

		$oPlugins->RunHook('filter.imap-credentials', array($this, &$aImapCredentials));

		$oPlugins->RunHook('event.imap-pre-connect', array($this, $aImapCredentials['UseConnect'], $aImapCredentials));

		if ($aImapCredentials['UseConnect'])
		{
			$oMailClient
				->Connect($aImapCredentials['Host'], $aImapCredentials['Port'],
					$aImapCredentials['Secure'], $aImapCredentials['VerifySsl'],
					$aImapCredentials['AllowSelfSigned'], $aImapCredentials['ClientCert']);

		}

		$oPlugins->RunHook('event.imap-pre-login', array($this, $aImapCredentials['UseAuth'], $aImapCredentials));

		if ($aImapCredentials['UseAuth'])
		{
			if (0 < \strlen($aImapCredentials['ProxyAuthUser']) &&
				0 < \strlen($aImapCredentials['ProxyAuthPassword']))
			{
				$oMailClient
					->Login($aImapCredentials['ProxyAuthUser'], $aImapCredentials['ProxyAuthPassword'],
						$aImapCredentials['Login'], $aImapCredentials['UseAuthPlainIfSupported'], $aImapCredentials['UseAuthCramMd5IfSupported']);
			}
			else
			{
				$sPassword = $aImapCredentials['Password'];
				$aTokens = self::ParseTokensPassword($sPassword);

				$sAccessToken = $aTokens[0];
				$sRefreshToken = $aTokens[1];

				if ($sAccessToken && $sRefreshToken)
				{
					if ($refreshTokenCallback && \is_callable($refreshTokenCallback))
					{
						$sAccessToken = \call_user_func($refreshTokenCallback, $sAccessToken, $sRefreshToken);
					}

					$oMailClient->LoginWithXOauth2(
						\base64_encode('user='.$aImapCredentials['Login']."\1".'auth=Bearer '.$sAccessToken."\1\1"));
				}
				else
				{
					$oMailClient->Login($aImapCredentials['Login'], $aImapCredentials['Password'], '',
						$aImapCredentials['UseAuthPlainIfSupported'], $aImapCredentials['UseAuthCramMd5IfSupported']);
				}
			}

			$bLogin = true;
		}

		$oPlugins->RunHook('event.imap-post-login', array($this, $aImapCredentials['UseAuth'], $bLogin, $aImapCredentials));

		return $bLogin;
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Smtp\SmtpClient|null $oSmtpClient
	 * @param \RainLoop\Application $oConfig
	 * @param callable|null $refreshTokenCallback = null
	 *
	 */
	public function OutConnectAndLoginHelper($oPlugins, $oSmtpClient, $oConfig, $refreshTokenCallback = null, bool &$bUsePhpMail = false) : bool
	{
		$bLogin = false;

		$aSmtpCredentials = array(
			'UseConnect' => true,
			'UseAuth' => $this->DomainOutAuth(),
			'UsePhpMail' => $bUsePhpMail,
			'Ehlo' => \MailSo\Smtp\SmtpClient::EhloHelper(),
			'Host' => $this->DomainOutHost(),
			'Port' => $this->DomainOutPort(),
			'Secure' => $this->DomainOutSecure(),
			'Login' => $this->OutLogin(),
			'Password' => $this->Password(),
			'ProxyAuthUser' => $this->ProxyAuthUser(),
			'ProxyAuthPassword' => $this->ProxyAuthPassword(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'smtp_use_auth_plain', true),
			'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'smtp_use_auth_cram_md5', true)
		);

		$oPlugins->RunHook('filter.smtp-credentials', array($this, &$aSmtpCredentials));

		$bUsePhpMail = $aSmtpCredentials['UsePhpMail'];

		$oPlugins->RunHook('event.smtp-pre-connect', array($this, $aSmtpCredentials['UseConnect'], $aSmtpCredentials));

		if ($aSmtpCredentials['UseConnect'] && !$aSmtpCredentials['UsePhpMail'] && $oSmtpClient)
		{
			$oSmtpClient->Connect($aSmtpCredentials['Host'], $aSmtpCredentials['Port'], $aSmtpCredentials['Ehlo'],
				$aSmtpCredentials['Secure'], $aSmtpCredentials['VerifySsl'], $aSmtpCredentials['AllowSelfSigned']
			);
		}

		$oPlugins->RunHook('event.smtp-post-connect', array($this, $aSmtpCredentials['UseConnect'], $aSmtpCredentials));
		$oPlugins->RunHook('event.smtp-pre-login', array($this, $aSmtpCredentials['UseAuth'], $aSmtpCredentials));

		if ($aSmtpCredentials['UseAuth'] && !$aSmtpCredentials['UsePhpMail'] && $oSmtpClient)
		{
			$sPassword = $aSmtpCredentials['Password'];
			$aTokens = self::ParseTokensPassword($sPassword);

			$sAccessToken = $aTokens[0];
			$sRefreshToken = $aTokens[1];

			if ($sAccessToken && $sRefreshToken)
			{
				if ($refreshTokenCallback && \is_callable($refreshTokenCallback))
				{
					$sAccessToken = \call_user_func($refreshTokenCallback, $sAccessToken, $sRefreshToken);
				}

				$oSmtpClient->LoginWithXOauth2(
					\base64_encode('user='.$aSmtpCredentials['Login']."\1".'auth=Bearer '.$sAccessToken."\1\1"));
			}
			else
			{
				$oSmtpClient->Login($aSmtpCredentials['Login'], $aSmtpCredentials['Password'],
					$aSmtpCredentials['UseAuthPlainIfSupported'], $aSmtpCredentials['UseAuthCramMd5IfSupported']);
			}

			$bLogin = true;
		}

		$oPlugins->RunHook('event.smtp-post-login', array($this, $aSmtpCredentials['UseAuth'], $bLogin, $aSmtpCredentials));

		return $bLogin;
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Sieve\ManageSieveClient $oSieveClient
	 * @param \RainLoop\Application $oConfig
	 */
	public function SieveConnectAndLoginHelper($oPlugins, $oSieveClient, $oConfig)
	{
		$bLogin = false;

		$aSieveCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainSieveHost(),
			'Port' => $this->DomainSievePort(),
			'Secure' => $this->DomainSieveSecure(),
			'Login' => $this->IncLogin(),
			'Password' => $this->Password(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'InitialAuthPlain' => !!$oConfig->Get('ssl', 'sieve_auth_plain_initial', true)
		);

		$oPlugins->RunHook('filter.sieve-credentials', array($this, &$aSieveCredentials));

		$oPlugins->RunHook('event.sieve-pre-connect', array($this, $aSieveCredentials['UseConnect'], $aSieveCredentials));

		if ($oSieveClient)
		{
			$oSieveClient->__USE_INITIAL_AUTH_PLAIN_COMMAND = $aSieveCredentials['InitialAuthPlain'];

			if ($aSieveCredentials['UseConnect'])
			{
				$oSieveClient->Connect($aSieveCredentials['Host'], $aSieveCredentials['Port'],
					$aSieveCredentials['Secure'], $aSieveCredentials['VerifySsl'], $aSieveCredentials['AllowSelfSigned']
				);
			}
		}

		$oPlugins->RunHook('event.sieve-post-connect', array($this, $aSieveCredentials['UseConnect'], $aSieveCredentials));

		$oPlugins->RunHook('event.sieve-pre-login', array($this, $aSieveCredentials['UseAuth'], $aSieveCredentials));

		if ($aSieveCredentials['UseAuth'])
		{
			$oSieveClient->Login($aSieveCredentials['Login'], $aSieveCredentials['Password']);

			$bLogin = true;
		}

		$oPlugins->RunHook('event.sieve-post-login', array($this, $aSieveCredentials['UseAuth'], $bLogin, $aSieveCredentials));

		return $bLogin;
	}
}
