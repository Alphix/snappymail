<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class AttachmentCollection extends \MailSo\Base\Collection
{
	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();
	}

	/**
	 * @return \MailSo\Mime\AttachmentCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	public function LinkedAttachments() : array
	{
		return $this->FilterList(function ($oItem) {
			return $oItem && $oItem->IsLinked();
		});
	}

	public function UnlinkedAttachments() : array
	{
		return $this->FilterList(function ($oItem) {
			return $oItem && !$oItem->IsLinked();
		});
	}

	public function SizeOfAttachments() : int
	{
		$iResult = 0;
		$this->ForeachList(function ($oItem) use (&$iResult) {
			if ($oItem)
			{
				$iResult += $oItem->FileSize();
			}
		});

		return $iResult;
	}
}
