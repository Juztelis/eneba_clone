# Keyhub – digital game key marketplace (Eneba-style demo)

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router, TanStack Query |
| Backend | PHP 8.1+ (tested on 8.3), REST/JSON, no framework, PDO |
| Database | **PostgreSQL 14+** |

## Why PostgreSQL
* **Typo-tolerant search in the database itself**: the `pg_trgm` extension gives substring *and* trigram-similarity matching with a GIN index, so "wicther 3", "cybperunk" or "hogwart" still find the right game, with no separate search engine to run.
* **Safe digital-key delivery**: `SELECT … FOR UPDATE SKIP LOCKED` lets concurrent buyers each lock *different* keys inside one transaction. Verified with 8 simultaneous buyers for the last key: exactly one succeeded, the rest got `409`, one key was issued.
* Real transactions and constraints (money in integer cents, `CHECK`s, foreign keys), `JSONB` for block config, `citext` for case-insensitive e-mails.

## Run it
```bash
# 1. database (or create a DB yourself and run: psql -f database/schema.sql)
docker compose up -d db

# 2. backend  (needs PHP extensions: pdo_pgsql, mbstring, openssl, iconv)
cd backend
cp .env.example .env            # then change JWT_SECRET and APP_KEY
php bin/seed.php                # demo catalogue, sellers, offers, encrypted keys, homepage layout
php -S 127.0.0.1:8000 -t public public/index.php

# 3. frontend
cd ../frontend
npm install
npm run dev                     # http://localhost:5173  (Vite proxies /api to :8000)
```
Test cards (simulated payment, no real money): `4242 4242 4242 4242` approves, `4000 0000 0000 0002` is declined, `4000 0000 0000 9995` is "insufficient funds". Any future expiry and any CVC.

## Deploy on Render (free plan)
Render has no native PHP runtime, so the backend runs from the included `Dockerfile` (Apache + PHP). The same container also serves the built React app, so there is **one URL and no CORS**. `render.yaml` describes everything: one Docker web service and one Postgres database.

1. Push the project to a GitHub repository (the `.gitignore` keeps `backend/.env` and `node_modules` out):
   ```bash
   git init && git add . && git commit -m "Keyhub"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Sign up at render.com (GitHub login is easiest) and open **New → Blueprint**.
3. Connect the repository and click **Apply**. Render creates the database, wires its credentials into the web service, generates `JWT_SECRET` and `APP_KEY`, and builds the image (first build takes several minutes).
4. Watch **Logs**. A healthy first start prints `Creating database schema...`, `Loading demo data...`, `Bootstrap complete.`. Then open the `https://<name>.onrender.com` URL shown on the service page.

Every later `git push` redeploys automatically.

Things to know about the free plan:
* The web service sleeps after about 15 minutes without traffic; the first request afterwards takes up to a minute.
* The free Postgres database **expires 30 days after creation** (then a 14-day grace period to upgrade before it is deleted), and only one free database is allowed per workspace.
* The free plan has no shell, which is why `backend/bin/bootstrap.php` creates the schema and loads demo data on start (`AUTO_SEED=true`). Set `AUTO_SEED` to `false` in the Render dashboard once you have your own data; bootstrap never touches existing data either way.
* **Never change `APP_KEY` after the first deploy.** Stored game keys are encrypted with it. If it does not match, bootstrap stops the deploy with a clear message instead of starting a shop that cannot deliver keys.
* To connect to the database from your own machine, remove `ipAllowList: []` from `render.yaml` (or add your IP) and use `DB_SSLMODE=require`.

## How each requirement is met
| Requirement | Where |
|---|---|
| **Store**: browse all, filter (platform, region, genre, price), sort, search by name | `StorePage.tsx`, `ProductRepository::search()`. All state lives in the URL, so views are shareable and work with back/forward. |
| **Homepage** assembled from blocks, each fed by its own backend service, nothing hardcoded | `GET /api/home/layout` returns the ordered block list from table `home_blocks`. Each block has its own `data_url` and its own PHP class in `backend/src/Home/`. The frontend (`home/registry.ts`) only maps `type` → component and renders what arrives. Blocks load and fail independently. Changing the layout or a banner is a DB edit (verified). |
| **Search** from anywhere, typo/partial tolerant | `SearchBox.tsx` in the header (live suggestions, keyboard navigation) → `GET /api/search/suggest`; Enter opens `/store?q=`. Matching: `ILIKE` OR `pg_trgm` `%` / `<%`, ranked by similarity. Thresholds are set in `Db.php`. |
| **Product page** with offers from several sellers | `ProductPage.tsx`, `GET /api/products/{slug}`: offers sorted by price, region filter, sort by price/rating, best-price badge, stock, Buy / Add to cart. |
| **Checkout**: cart, pay, receive key | Cart in `localStorage` holds only offer ids and quantities; prices always come from the server (`POST /api/cart/quote`). `POST /api/checkout` runs in one transaction: lock keys → charge (simulated gateway) → create order → mark keys sold. A declined card changes nothing. Keys are shown (reveal/copy) right after payment and in order history. |
| **Authentication**, protected areas | Register/login (`password_hash`, HS256 JWT). `ProtectedRoute` guards `/checkout`, `/orders`, `/orders/:id`; the API enforces the same (`401`), and orders are scoped to their owner (another user gets `404`). |
| **Eneba styling** | `frontend/src/styles.css`: all colours, radii and type in `:root` tokens. |

## API
```
POST /api/auth/register | /api/auth/login        GET /api/auth/me          (Bearer token)
GET  /api/home/layout                            GET /api/home/blocks/{id}
GET  /api/filters                                GET /api/products?q&platform&region&genre&min_price&max_price&sort&page
GET  /api/products/{slug}                        GET /api/search/suggest?q=
POST /api/cart/quote                             POST /api/checkout        (auth)
GET  /api/orders                                 GET /api/orders/{id}      (auth)
```
Errors are always `{ "error": { "message", "fields": { field: message } } }`.

## Design notes and limits
* **Design reference**: none was attached, so the palette and typography approximate Eneba's dark-purple look from memory. Send screenshots or a Figma link and only `:root` in `styles.css` (plus a few component rules) needs adjusting. Covers are generated gradients (no copyrighted art); set `products.image_url` to show real artwork.
* **Keys** are stored AES-256-GCM encrypted (`Crypto.php`, key from `APP_KEY`). Card numbers are validated and discarded; only the last 4 digits are stored.
* **Payments** are behind the `PaymentGateway` interface. To use a provider's test mode (e.g. Stripe), implement it and swap it in `routes.php`; with a real provider you would reserve keys first and finalise from a webhook.
* Stock is not reserved while items sit in a cart; it is locked at payment time, and the cart reconciles itself with the server when stock changes.
* **Before production**: HTTPS, login rate-limiting, httpOnly-cookie sessions instead of a token in `localStorage`, a secrets manager for `APP_KEY`/`JWT_SECRET`, and `try_files $uri /index.php` (nginx/PHP-FPM) pointing at `backend/public`. Serve `frontend/dist` as static files and set `VITE_API_URL` / `CORS_ORIGINS` if the API is on another origin.
* The trigram thresholds (0.3) suit a small catalogue; raise them if a large catalogue returns too many loose matches.
