<?php
declare(strict_types=1);
namespace App;

final class HttpException extends \RuntimeException
{
    /** @param array<string,string> $fields per-field validation messages */
    public function __construct(public readonly int $status, string $message, public readonly array $fields = [])
    {
        parent::__construct($message);
    }
}
