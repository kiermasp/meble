import {
  AVAILABILITY_STATUSES,
  MATERIAL_CATEGORIES,
  type AvailabilityStatus,
  type MaterialCategory,
} from "@meble/domain";
import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export class WarehouseQuery {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsIn([...MATERIAL_CATEGORIES])
  category?: MaterialCategory;

  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @IsIn([...AVAILABILITY_STATUSES])
  availability?: AvailabilityStatus;
}
