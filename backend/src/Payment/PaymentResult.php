<?php
declare(strict_types=1);
namespace App\Payment;

final class PaymentResult
{
    public function __construct(
        public readonly bool $approved,
        public readonly string $reference,
        public readonly string $last4,
        public readonly string $message = '',
    ) {}
}
