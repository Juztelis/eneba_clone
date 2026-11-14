export interface Cover { from: string | null; to: string | null; image_url: string | null }

export interface ProductCardData {
  id: number; slug: string; name: string; publisher: string | null; release_date: string | null; genre: string | null;
  platform: { slug: string; name: string };
  price_cents: number | null; rrp_cents: number; discount_pct: number; offers_count: number;
  cover: Cover;
}
export interface ProductList { items: ProductCardData[]; total: number; page: number; per_page: number; pages: number; sort: string }

export interface Offer {
  id: number; price_cents: number; stock: number;
  region: { code: string; name: string };
  seller: { id: number; name: string; rating: number; sales: number };
}
export interface ProductDetail { product: ProductCardData & { description: string | null }; offers: Offer[] }

export interface FacetOption { slug: string; name: string; count: number }
export interface Filters {
  platforms: FacetOption[]; genres: FacetOption[]; regions: { code: string; name: string }[];
  price: { min: number; max: number };
}

export interface HomeBlockMeta { id: number; type: string; title: string | null; link_url: string | null; data_url: string }
export interface Banner { id: number; title: string; subtitle: string | null; cta_label: string; cta_url: string; cover: Cover }
export interface PlatformTile { slug: string; name: string; count: number; link_url: string }

export interface User { id: number; email: string; username: string }
export interface AuthResponse { token: string; user: User }

export interface QuoteLine {
  offer_id: number; qty: number; requested_qty: number; stock: number; unit_price_cents: number;
  seller: string; region: string;
  product: { slug: string; name: string; platform: string; cover: Cover };
}
export interface Quote { lines: QuoteLine[]; total_cents: number; currency: string; unavailable: number[] }

export interface OrderItem {
  id: number; unit_price_cents: number; seller: string; region: string; key: string;
  product: { slug: string; name: string; platform: string; cover: Cover };
}
export interface Order { id: number; total_cents: number; currency: string; card_last4: string | null; created_at: string; items: OrderItem[] }
export interface OrderSummary { id: number; total_cents: number; currency: string; created_at: string; items_count: number; product_names: string }
