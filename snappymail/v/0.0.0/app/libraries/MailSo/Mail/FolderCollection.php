<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
 */
class FolderCollection extends \MailSo\Base\Collection
{
	/**
	 * @var string
	 */
	public $Namespace;

	/**
	 * @var string
	 */
	public $FoldersHash;

	/**
	 * @var bool
	 */
	public $IsThreadsSupported;

	/**
	 * @var bool
	 */
	public $IsSortSupported;

	/**
	 * @var bool
	 */
	public $Optimized;

	/**
	 * @var array
	 */
	public $SystemFolders;

	function __construct($input = array())
	{
		parent::__construct($input);

		$this->Namespace = '';
		$this->FoldersHash = '';
		$this->SystemFolders = array();
		$this->IsThreadsSupported = false;
		$this->IsSortSupported = false;
		$this->Optimized = false;
	}

	public function append($oFolder, bool $bToTop = false) : void
	{
		assert($oFolder instanceof Folder);
		parent::append($oFolder, $bToTop);
	}

	public function GetByFullNameRaw(string $sFullNameRaw) : ?Folder
	{
		$mResult = null;
		foreach ($this as $oFolder)
		{
			if ($oFolder->FullNameRaw() === $sFullNameRaw)
			{
				$mResult = $oFolder;
				break;
			}
			else if ($oFolder->HasSubFolders())
			{
				$mResult = $oFolder->SubFolders(true)->GetByFullNameRaw($sFullNameRaw);
				if ($mResult)
				{
					break;
				}
			}
		}

		return $mResult;
	}

	public function CountRec() : int
	{
		$iResult = $this->Count();
		foreach ($this as $oFolder)
		{
			if ($oFolder)
			{
				$oSub = $oFolder->SubFolders();
				$iResult += $oSub ? $oSub->CountRec() : 0;
			}
		}

		return $iResult;
	}

	public function GetNamespace() : string
	{
		return $this->Namespace;
	}

	public function FindDelimiter() : string
	{
		$sDelimiter = '/';

		$oFolder = $this->GetByFullNameRaw('INBOX');
		if (!$oFolder && isset($this[0]))
		{
			$oFolder = $this[0];
		}

		if ($oFolder)
		{
			$sDelimiter = $oFolder->Delimiter();
		}

		return $sDelimiter;
	}

	public function SetNamespace(string $sNamespace) : self
	{
		$this->Namespace = $sNamespace;

		return $this;
	}

	public function InitByUnsortedMailFolderArray(array $aUnsortedMailFolders) : void
	{
		$this->Clear();

		$aSortedByLenImapFolders = array();
		foreach ($aUnsortedMailFolders as /* @var $oMailFolder Folder */ $oMailFolder)
		{
			$aSortedByLenImapFolders[$oMailFolder->FullNameRaw()] =& $oMailFolder;
			unset($oMailFolder);
		}
		unset($aUnsortedMailFolders);

		$aAddedFolders = array();
		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder Folder */ $oMailFolder)
		{
			$sDelimiter = $oMailFolder->Delimiter();
			$aFolderExplode = \explode($sDelimiter, $oMailFolder->FullNameRaw());

			if (1 < \count($aFolderExplode))
			{
				\array_pop($aFolderExplode);

				$sNonExistenFolderFullNameRaw = '';
				foreach ($aFolderExplode as $sFolderExplodeItem)
				{
					$sNonExistenFolderFullNameRaw .= (0 < \strlen($sNonExistenFolderFullNameRaw))
						? $sDelimiter.$sFolderExplodeItem : $sFolderExplodeItem;

					if (!isset($aSortedByLenImapFolders[$sNonExistenFolderFullNameRaw]))
					{
						try
						{
							$aAddedFolders[$sNonExistenFolderFullNameRaw] =
								Folder::NewNonExistenInstance($sNonExistenFolderFullNameRaw, $sDelimiter);
						}
						catch (\Throwable $oExc)
						{
							unset($oExc);
						}
					}
				}
			}
		}

		$aSortedByLenImapFolders = \array_merge($aSortedByLenImapFolders, $aAddedFolders);
		unset($aAddedFolders);

		\uasort($aSortedByLenImapFolders, function ($oFolderA, $oFolderB) {
			return \strnatcmp($oFolderA->FullNameRaw(), $oFolderB->FullNameRaw());
		});

		foreach ($aSortedByLenImapFolders as $oMailFolder)
		{
			$this->AddWithPositionSearch($oMailFolder);
			unset($oMailFolder);
		}

		unset($aSortedByLenImapFolders);
	}

	public function AddWithPositionSearch(Folder $oMailFolder) : bool
	{
		$oItemFolder = null;
		$bIsAdded = false;

		foreach ($this as $oItemFolder)
		{
			if ($oMailFolder instanceof Folder &&
				0 === \strpos($oMailFolder->FullNameRaw(), $oItemFolder->FullNameRaw().$oItemFolder->Delimiter()))
			{
				if ($oItemFolder->SubFolders(true)->AddWithPositionSearch($oMailFolder))
				{
					$bIsAdded = true;
				}

				break;
			}
		}

		if (!$bIsAdded && $oMailFolder instanceof Folder)
		{
			$bIsAdded = true;
			$this->append($oMailFolder);
		}

		return $bIsAdded;
	}

	public function SortByCallback(callable $fCallback) : void
	{
		if (\is_callable($fCallback))
		{
			$aList = $this->getArrayCopy();

			\usort($aList, $fCallback);

			foreach ($aList as $oItemFolder)
			{
				if ($oItemFolder->HasSubFolders())
				{
					$oItemFolder->SubFolders()->SortByCallback($fCallback);
				}
			}
		}
	}

	public function jsonSerialize()
	{
		return array_merge(parent::jsonSerialize(), array(
			'Namespace' => $this->GetNamespace(),
			'FoldersHash' => $this->FoldersHash ?: '',
			'IsThreadsSupported' => $this->IsThreadsSupported,
			'IsSortSupported' => $this->IsSortSupported,
			'Optimized' => $this->Optimized,
			'CountRec' => $this->CountRec(),
			'SystemFolders' => isset($this->SystemFolders) && \is_array($this->SystemFolders) ?
				$this->SystemFolders : array()
		));
	}
}
