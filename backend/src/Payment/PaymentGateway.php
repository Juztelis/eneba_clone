<?php
declare(strict_types=1);
namespace App\Payment;

interface PaymentGateway
{
    /** Throws HttpException(422) for malformed card data; returns a result (approved or declined) otherwise. */
    public function charge(int $amountCents, string $currency, array $card): PaymentResult;
}
