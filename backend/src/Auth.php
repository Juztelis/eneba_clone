<?php
declare(strict_types=1);
namespace App;

final class Auth
{
    /** Resolves the bearer token to a user or throws 401. Used by every protected route. */
    public static function authenticate(Request $req): void
    {
        $claims = ($t = $req->bearer()) ? Jwt::decode($t) : null;
        $user = $claims ? Db::one('SELECT id, email, username FROM users WHERE id = :id', ['id' => (int) $claims['sub']]) : null;
        if (!$user) throw new HttpException(401, 'Please sign in to continue');
        $req->user = $user;
    }
}
