import { SHOP_SECTION_SLUGS, type ShopSectionSlug } from "@meble/domain";
import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export class ListMaterialsQuery {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsIn([...SHOP_SECTION_SLUGS])
  category?: ShopSectionSlug;
}
