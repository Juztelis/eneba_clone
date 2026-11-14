<?php
declare(strict_types=1);
namespace App\Payment;

use App\HttpException;

/**
 * Fake card processor, no money moves. Behaves like a provider's test mode:
 *   4242 4242 4242 4242 -> approved      4000 0000 0000 0002 -> declined      4000 0000 0000 9995 -> insufficient funds
 * Any other Luhn-valid number is approved. Card data is validated and discarded; only the last 4 digits are kept.
 * To use a real provider (e.g. Stripe test mode) implement PaymentGateway and swap it in routes.php.
 */
final class SimulatedGateway implements PaymentGateway
{
    public function charge(int $amountCents, string $currency, array $card): PaymentResult
    {
        $number = preg_replace('/\D/', '', (string) ($card['number'] ?? ''));
        $month = (int) ($card['exp_month'] ?? 0);
        $year = (int) ($card['exp_year'] ?? 0);
        if ($year < 100) $year += 2000;

        $errors = [];
        if (!self::luhn($number)) $errors['card_number'] = 'Enter a valid card number';
        if ($month < 1 || $month > 12 || mktime(0, 0, 0, $month + 1, 1, $year) <= time()) $errors['expiry'] = 'Enter a valid, unexpired date';
        if (!preg_match('/^\d{3,4}$/', (string) ($card['cvc'] ?? ''))) $errors['cvc'] = 'Enter the 3 or 4 digit security code';
        if ($errors) throw new HttpException(422, 'Please check your card details', $errors);

        $last4 = substr($number, -4);
        return match ($number) {
            '4000000000000002' => new PaymentResult(false, '', $last4, 'Your card was declined'),
            '4000000000009995' => new PaymentResult(false, '', $last4, 'Your card has insufficient funds'),
            default            => new PaymentResult(true, 'sim_' . bin2hex(random_bytes(8)), $last4),
        };
    }

    private static function luhn(string $n): bool
    {
        if (!preg_match('/^\d{12,19}$/', $n)) return false;
        $sum = 0;
        foreach (array_reverse(str_split($n)) as $i => $d) {
            $d = (int) $d * ($i % 2 ? 2 : 1);
            $sum += $d > 9 ? $d - 9 : $d;
        }
        return $sum % 10 === 0;
    }
}
