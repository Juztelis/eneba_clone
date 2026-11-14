<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Db, HttpException, Jwt, Request};

final class AuthController
{
    public static function register(Request $req): array
    {
        $email = strtolower(trim((string) $req->input('email', '')));
        $username = trim((string) $req->input('username', ''));
        $password = (string) $req->input('password', '');

        $errors = [];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid e-mail address';
        if (!preg_match('/^[A-Za-z0-9_]{3,32}$/', $username)) $errors['username'] = 'Use 3–32 letters, numbers or underscores';
        if (strlen($password) < 8) $errors['password'] = 'Use at least 8 characters';
        if ($errors) throw new HttpException(422, 'Please fix the highlighted fields', $errors);

        if (Db::scalar('SELECT 1 FROM users WHERE email = :e', ['e' => $email])) {
            throw new HttpException(409, 'An account with this e-mail already exists', ['email' => 'This e-mail is already registered']);
        }
        $id = (int) Db::scalar(
            'INSERT INTO users (email, username, password_hash) VALUES (:e, :u, :h) RETURNING id',
            ['e' => $email, 'u' => $username, 'h' => password_hash($password, PASSWORD_DEFAULT)]
        );
        http_response_code(201);
        return self::session(['id' => $id, 'email' => $email, 'username' => $username]);
    }

    public static function login(Request $req): array
    {
        $email = strtolower(trim((string) $req->input('email', '')));
        $user = Db::one('SELECT id, email, username, password_hash FROM users WHERE email = :e', ['e' => $email]);
        // always run a hash check so response time does not reveal whether the e-mail exists
        $hash = $user['password_hash'] ?? '$2y$10$drIa1lRoOjASaF3.MExvhut5wvjdVF79CVQLXBBeiC.zuTeXXJFxi';
        if (!password_verify((string) $req->input('password', ''), $hash) || !$user) {
            throw new HttpException(401, 'Incorrect e-mail or password');
        }
        unset($user['password_hash']);
        return self::session($user);
    }

    public static function me(Request $req): array
    {
        return ['user' => $req->user];
    }

    private static function session(array $user): array
    {
        return ['token' => Jwt::encode(['sub' => $user['id']]), 'user' => $user];
    }
}
