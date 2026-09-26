import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";

export interface WarehouseFilters {
  manufacturer?: string[];
  thickness?: string[];
  structure?: string[];
  decorKind?: string[];
  format?: string[];
  waterResistance?: string[];
  brightness?: string[];
  decorType?: string[];
  shade?: string[];
  color?: string[];
  status?: string[];
}

function stringList({ value }: { value: unknown }): string[] | undefined {
  if (value == null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const cleaned = raw.filter((item): item is string => typeof item === "string" && item !== "");
  return cleaned.length === 0 ? undefined : cleaned;
}

export class WarehouseQuery implements WarehouseFilters {
  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manufacturer?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  thickness?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  structure?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  decorKind?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  format?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waterResistance?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brightness?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  decorType?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shade?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color?: string[];

  @Transform(stringList)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];
}
