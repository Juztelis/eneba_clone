import type { ComponentType } from 'react';
import { HeroBanner } from './HeroBanner';
import { PlatformTiles } from './PlatformTiles';
import { ProductCarousel } from './ProductCarousel';
import type { BlockProps } from './useBlockItems';

/** block.type (sent by the backend) => component that knows how to draw it. Unknown types are skipped, not fatal. */
export const blockRegistry: Record<string, ComponentType<BlockProps>> = {
  hero_banner: HeroBanner,
  product_carousel: ProductCarousel,
  platform_tiles: PlatformTiles,
};
