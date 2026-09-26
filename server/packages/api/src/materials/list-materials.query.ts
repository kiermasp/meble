import { MATERIAL_CATEGORIES, type MaterialCategory } from "@meble/domain";
import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export class ListMaterialsQuery {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsIn([...MATERIAL_CATEGORIES])
  category?: MaterialCategory;
}
