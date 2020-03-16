<?php

namespace RainLoop\Providers\Files;

class FileStorage implements \RainLoop\Providers\Files\IFiles
{
	/**
	 * @var array
	 */
	private $aResources;

	/**
	 * @var string
	 */
	private $sDataPath;

	public function __construct(string $sStoragePath)
	{
		$this->aResources = array();
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
	}

	public function GenerateLocalFullFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string
	{
		return $this->generateFullFileName($oAccount, $sKey, true);
	}

	/**
	 * @param resource $rSource
	 */
	public function PutFile(\RainLoop\Model\Account $oAccount, string $sKey, $rSource) : bool
	{
		$bResult = false;
		if ($rSource)
		{
			$rOpenOutput = @\fopen($this->generateFullFileName($oAccount, $sKey, true), 'w+b');
			if ($rOpenOutput)
			{
				$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rSource, array($rOpenOutput)));
				@\fclose($rOpenOutput);
			}
		}
		return $bResult;
	}

	public function MoveUploadedFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sSource) : bool
	{
		return @\move_uploaded_file($sSource,
			$this->generateFullFileName($oAccount, $sKey, true));
	}

	/**
	 * @return resource|bool
	 */
	public function GetFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sOpenMode = 'rb')
	{
		$mResult = false;
		$bCreate = !!\preg_match('/[wac]/', $sOpenMode);

		$sFileName = $this->generateFullFileName($oAccount, $sKey, $bCreate);
		if ($bCreate || \file_exists($sFileName))
		{
			$mResult = @\fopen($sFileName, $sOpenMode);

			if (\is_resource($mResult))
			{
				$this->aResources[$sFileName] = $mResult;
			}
		}

		return $mResult;
	}

	public function GetFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string
	{
		$mResult = false;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = $sFileName;
		}

		return $mResult;
	}

	public function Clear(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		$mResult = true;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			if (isset($this->aResources[$sFileName]) && \is_resource($this->aResources[$sFileName]))
			{
				@\fclose($this->aResources[$sFileName]);
			}

			$mResult = @\unlink($sFileName);
		}

		return $mResult;
	}

	public function FileSize(\RainLoop\Model\Account $oAccount, string $sKey) : int
	{
		$mResult = false;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = \filesize($sFileName);
		}

		return $mResult;
	}

	public function FileExists(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		return @\file_exists($this->generateFullFileName($oAccount, $sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 < $iTimeToClearInHours)
		{
			\MailSo\Base\Utils::RecTimeDirRemove($this->sDataPath, 60 * 60 * $iTimeToClearInHours, \time());
			return true;
		}

		return false;
	}

	public function CloseAllOpenedFiles() : bool
	{
		if (\is_array($this->aResources) && 0 < \count($this->aResources))
		{
			foreach ($this->aResources as $sFileName => $rFile)
			{
				if (!empty($sFileName) && \is_resource($rFile))
				{
					@\fclose($rFile);
				}
			}
		}

		return true;
	}

	private function generateFullFileName(\RainLoop\Model\Account $oAccount, string $sKey, bool $bMkDir = false) : string
	{
		$sEmail = $sSubEmail = '';
		if ($oAccount instanceof \RainLoop\Model\Account)
		{
			$sEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $oAccount->ParentEmailHelper());
			if ($oAccount->IsAdditionalAccount())
			{
				$sSubEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $oAccount->Email());
			}
		}

		if (empty($sEmail))
		{
			$sEmail = '__unknown__';
		}

		$sKeyPath = \sha1($sKey);
		$sKeyPath = \substr($sKeyPath, 0, 2).'/'.\substr($sKeyPath, 2, 2).'/'.$sKeyPath;

		$sFilePath = $this->sDataPath.'/'.
			\str_pad(\rtrim(\substr($sEmail, 0, 2), '@'), 2, '_').'/'.$sEmail.'/'.
			(0 < \strlen($sSubEmail) ? $sSubEmail.'/' : '').
			$sKeyPath;

		if ($bMkDir && !empty($sFilePath) && !@\is_dir(\dirname($sFilePath)))
		{
			if (!@\mkdir(\dirname($sFilePath), 0755, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		return $sFilePath;
	}
}
