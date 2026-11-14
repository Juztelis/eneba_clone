-- PostgreSQL 14+.  pg_trgm gives us typo-tolerant + partial-name search, citext gives case-insensitive e-mails.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         CITEXT      NOT NULL UNIQUE,
  username      VARCHAR(32) NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platforms (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE regions   (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE genres    (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);

CREATE TABLE products (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  platform_id  INT     NOT NULL REFERENCES platforms(id),
  genre_id     INT     REFERENCES genres(id),
  publisher    TEXT,
  description  TEXT,
  release_date DATE,
  rrp_cents    INT     NOT NULL CHECK (rrp_cents > 0),      -- recommended retail price, used for "-xx%" badges
  sales_count  INT     NOT NULL DEFAULT 0,                  -- denormalised popularity counter
  cover_from   TEXT,                                        -- CSS colours for the generated cover
  cover_to     TEXT,
  image_url    TEXT                                         -- optional real artwork
);
CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX products_platform_idx ON products(platform_id);

CREATE TABLE sellers (
  id          SERIAL PRIMARY KEY,
  name        TEXT          NOT NULL UNIQUE,
  rating      NUMERIC(2,1)  NOT NULL DEFAULT 5.0,
  sales_count INT           NOT NULL DEFAULT 0
);

-- one offer = one seller selling one product for one region at one price
CREATE TABLE offers (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id   INT     NOT NULL REFERENCES sellers(id),
  region_id   INT     NOT NULL REFERENCES regions(id),
  price_cents INT     NOT NULL CHECK (price_cents > 0),
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (product_id, seller_id, region_id)
);

-- the digital goods themselves; key_enc is AES-256-GCM ciphertext, never plain text
CREATE TABLE game_keys (
  id       BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  key_enc  TEXT   NOT NULL,
  status   TEXT   NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold'))
);
CREATE INDEX game_keys_available_idx ON game_keys(offer_id) WHERE status = 'available';

CREATE VIEW v_offers AS
SELECT o.*, (SELECT COUNT(*) FROM game_keys k WHERE k.offer_id = o.id AND k.status = 'available') AS stock
FROM offers o WHERE o.active;

CREATE TABLE orders (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users(id),
  total_cents  INT         NOT NULL,
  currency     CHAR(3)     NOT NULL DEFAULT 'EUR',
  payment_ref  TEXT        NOT NULL,
  card_last4   CHAR(4),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders(user_id, created_at DESC);

-- one row per purchased key
CREATE TABLE order_items (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  offer_id         BIGINT NOT NULL REFERENCES offers(id),
  key_id           BIGINT NOT NULL UNIQUE REFERENCES game_keys(id),
  unit_price_cents INT    NOT NULL
);

-- ---- homepage content (the frontend renders whatever these tables say) ----
CREATE TABLE banners (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  cta_label  TEXT NOT NULL,
  cta_url    TEXT NOT NULL,
  cover_from TEXT,
  cover_to   TEXT,
  image_url  TEXT,
  position   INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true
);

-- layout of the landing page: which blocks, in what order, fed by which backend source
CREATE TABLE home_blocks (
  id       SERIAL PRIMARY KEY,
  type     TEXT  NOT NULL,                 -- how the frontend draws it: hero_banner | product_carousel | platform_tiles
  source   TEXT  NOT NULL,                 -- which backend service supplies the data
  title    TEXT,
  link_url TEXT,
  config   JSONB NOT NULL DEFAULT '{}',
  position INT   NOT NULL DEFAULT 0,
  active   BOOLEAN NOT NULL DEFAULT true
);
