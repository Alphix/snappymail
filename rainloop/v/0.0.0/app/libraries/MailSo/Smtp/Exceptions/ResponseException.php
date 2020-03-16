<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Smtp\Exceptions;

/**
 * @category MailSo
 * @package Smtp
 * @subpackage Exceptions
 */
class ResponseException extends \MailSo\Smtp\Exceptions\Exception
{
	/**
	 * @var array
	 */
	private $aResponses;

	/**
	 * @param \Exception $oPrevious = null
	 */
	public function __construct($aResponses = array(), $sMessage = '', $iCode = 0, $oPrevious = null)
	{
		parent::__construct($sMessage, $iCode, $oPrevious);

		if (is_array($aResponses))
		{
			$this->aResponses = $aResponses;
		}
	}

	public function GetResponses() : array
	{
		return $this->aResponses;
	}

	public function GetLastResponse() : ?\MailSo\Smtp\Response
	{
		return 0 < count($this->aResponses) ? $this->aResponses[count($this->aResponses) - 1] : null;
	}
}
