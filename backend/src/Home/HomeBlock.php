<?php
declare(strict_types=1);
namespace App\Home;

/** One landing-page block = one independent data source. */
interface HomeBlock
{
    /** @param array $config the block's JSON config from home_blocks.config */
    public function items(array $config): array;
}
