import { Controller, Get, Query } from "@nestjs/common";
import { ListMaterialsQuery } from "./list-materials.query";
import { MaterialStore } from "./material-store";
import { presentMaterial } from "./material.presenter";

@Controller("materials")
export class MaterialsController {
  constructor(private readonly materials: MaterialStore) {}

  @Get()
  async list(@Query() query: ListMaterialsQuery) {
    const rows = await this.materials.list(query.category);
    return rows.map(presentMaterial);
  }
}
