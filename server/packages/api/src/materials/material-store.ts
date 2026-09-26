import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Material, MaterialCategory } from "@meble/domain";
import { Repository } from "typeorm";
import { toMaterial } from "./material.mapper";
import { MaterialRow } from "./material.row";

@Injectable()
export class MaterialStore {
  constructor(
    @InjectRepository(MaterialRow)
    private readonly materials: Repository<MaterialRow>,
  ) {}

  async upsertAll(materials: Material[]): Promise<void> {
    const byKey = new Map<string, Material>();
    for (const material of materials) {
      byKey.set(`${material.category}\0${material.externalCode}`, material);
    }
    const values = [...byKey.values()].map((material) => ({
      externalCode: material.externalCode,
      displayName: material.displayName,
      category: material.category,
      structure: material.structure,
      thicknessMm: material.thicknessMm,
      availability: material.availability,
      fetchedAt: material.fetchedAt,
    }));
    if (values.length === 0) return;
    await this.materials.upsert(values, {
      conflictPaths: ["category", "externalCode"],
      skipUpdateIfNoValuesChanged: false,
    });
  }

  async list(category?: MaterialCategory): Promise<Material[]> {
    const rows = await this.materials.find({
      where: category ? { category } : {},
      order: { category: "ASC", externalCode: "ASC" },
    });
    return rows.map(toMaterial);
  }

  count(): Promise<number> {
    return this.materials.count();
  }
}
