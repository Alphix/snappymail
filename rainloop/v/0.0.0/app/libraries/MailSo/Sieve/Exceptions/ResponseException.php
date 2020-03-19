<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Sieve\Exceptions;

/**
 * @category MailSo
 * @package Sieve
 * @subpackage Exceptions
 */
class ResponseException extends \MailSo\Sieve\Exceptions\Exception
{
	/**
	 * @var array
	 */
	private $aResponses;

	public function __construct(array $aResponses = array(), string $sMessage = '', int $iCode = 0, ?\Throwable $oPrevious = null)
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

	public function GetLastResponse() : ?\MailSo\Sieve\Response
	{
		return 0 < count($this->aResponses) ? $this->aResponses[count($this->aResponses) - 1] : null;
	}
}
