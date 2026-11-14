#!/bin/sh
set -e
PORT="${PORT:-10000}"                      # Render tells the container which port to listen on
sed -ri "s/^Listen [0-9]+$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf
php /var/www/app/backend/bin/bootstrap.php   # schema + optional demo data; exits non-zero if the DB is unreachable
exec apache2-foreground
