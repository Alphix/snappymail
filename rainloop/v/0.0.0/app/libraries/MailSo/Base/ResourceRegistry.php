<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class ResourceRegistry
{
	/**
	 * @var array
	 */
	public static $Resources = array();

	/**
	 * @access private
	 */
	private function __construct()
	{
	}

	/**
	 * @staticvar bool $bInited
	 *
	 */
	private static function regResourcesShutdownFunc() : void
	{
		static $bInited = false;
		if (!$bInited)
		{
			$bInited = true;
			\register_shutdown_function(function () {
				if (\is_array(\MailSo\Base\ResourceRegistry::$Resources))
				{
					foreach (\array_keys(\MailSo\Base\ResourceRegistry::$Resources) as $sKey)
					{
						if (\is_resource(\MailSo\Base\ResourceRegistry::$Resources[$sKey]))
						{
							\MailSo\Base\Loader::IncStatistic('CloseMemoryResource');
							\fclose(\MailSo\Base\ResourceRegistry::$Resources[$sKey]);
						}
						\MailSo\Base\ResourceRegistry::$Resources[$sKey] = null;
					}
				}

				\MailSo\Base\ResourceRegistry::$Resources = array();
			});
		}
	}

	/**
	 *
	 * @return resource | bool
	 */
	public static function CreateMemoryResource(int $iMemoryMaxInMb = 5)
	{
		self::regResourcesShutdownFunc();

		$oResult = @\fopen('php://temp/maxmemory:'.($iMemoryMaxInMb * 1024 * 1024), 'r+b');
		if (\is_resource($oResult))
		{
			\MailSo\Base\Loader::IncStatistic('CreateMemoryResource');
			\MailSo\Base\ResourceRegistry::$Resources[(string) $oResult] = $oResult;
			return $oResult;
		}

		return false;
	}

	/**
	 *
	 * @return resource | bool
	 */
	public static function CreateMemoryResourceFromString(string $sString)
	{
		$oResult = self::CreateMemoryResource();
		if (\is_resource($oResult))
		{
			\fwrite($oResult, $sString);
			\rewind($oResult);
		}

		return $oResult;
	}

	/**
	 * @param resource $rResource
	 *
	 */
	public static function CloseMemoryResource(&$rResource) : void
	{
		if (\is_resource($rResource))
		{
			$sKey = (string) $rResource;
			if (isset(\MailSo\Base\ResourceRegistry::$Resources[$sKey]))
			{
				\fclose(\MailSo\Base\ResourceRegistry::$Resources[$sKey]);
				\MailSo\Base\ResourceRegistry::$Resources[$sKey] = null;
				unset(\MailSo\Base\ResourceRegistry::$Resources[$sKey]);
				\MailSo\Base\Loader::IncStatistic('CloseMemoryResource');
			}

			if (\is_resource($rResource))
			{
				\fclose($rResource);
			}

			$rResource = null;
		}
	}
}
