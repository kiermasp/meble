import { SHOP_SECTION_SLUGS, type ShopSectionSlug } from "@meble/domain";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

export class WarehouseQuery {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsIn([...SHOP_SECTION_SLUGS])
  category?: ShopSectionSlug;

  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsString()
  availability?: string;
}
