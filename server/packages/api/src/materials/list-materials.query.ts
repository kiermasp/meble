import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ListMaterialsQuery {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}
