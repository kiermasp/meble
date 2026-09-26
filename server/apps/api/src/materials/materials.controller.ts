import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { isMaterialCategory } from "@meble/domain";
import { MaterialStore } from "./material-store";
import { presentMaterial } from "./material.presenter";

@Controller("materials")
export class MaterialsController {
  constructor(private readonly materials: MaterialStore) {}

  @Get()
  async list(@Query("category") category?: string) {
    const selected = category && isMaterialCategory(category) ? category : undefined;
    if (category && !selected) {
      throw new BadRequestException(`Unknown category: ${category}`);
    }
    const rows = await this.materials.list(selected);
    return rows.map(presentMaterial);
  }
}
