# ---------- 1) build the React app ----------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2) PHP + Apache: serves the API and the built frontend from one origin ----------
FROM php:8.3-apache
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev \
 && docker-php-ext-install pdo_pgsql \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/* \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && php -r 'foreach (["pdo_pgsql","mbstring","openssl","iconv"] as $e) { if (!extension_loaded($e)) { fwrite(STDERR, "PHP extension missing: $e\n"); exit(1); } }'

ENV APACHE_DOCUMENT_ROOT=/var/www/app/backend/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
COPY docker/app.conf /etc/apache2/conf-available/app.conf
RUN a2enconf app

COPY backend/ /var/www/app/backend/
COPY database/ /var/www/app/database/
COPY --from=web /web/dist/ /var/www/app/backend/public/
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PORT=10000
EXPOSE 10000
ENTRYPOINT ["entrypoint.sh"]
