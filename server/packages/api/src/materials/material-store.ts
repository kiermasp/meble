import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Material, ShopSectionSlug } from "@meble/domain";
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
      byKey.set(`${material.category}\0${material.mebleRefId}`, material);
    }
    const values = [...byKey.values()].map((material) => ({
      mebleRefId: material.mebleRefId,
      displayName: material.displayName,
      category: material.category,
      subtype: material.subtype,
      manufacturer: material.manufacturer,
      decorCode: material.decorCode,
      decorName: material.decorName,
      structure: material.structure,
      thicknessMm: material.thicknessMm,
      format: material.format,
      availability: material.availability,
      unitPriceAmount: material.unitPriceAmount,
      currency: material.currency,
      decorKind: material.decorKind,
      waterResistance: material.waterResistance,
      brightness: material.brightness,
      decorType: material.decorType,
      shade: material.shade,
      color: material.color,
      statuses: material.statuses,
      fetchedAt: material.fetchedAt,
    }));
    if (values.length === 0) return;
    await this.materials.upsert(values, {
      conflictPaths: ["category", "mebleRefId"],
      skipUpdateIfNoValuesChanged: false,
    });
  }

  async replaceCategory(category: ShopSectionSlug, materials: Material[]): Promise<void> {
    await this.upsertAll(materials);
    const codes = [...new Set(materials.map((material) => material.mebleRefId))];
    if (codes.length === 0) return;
    await this.materials
      .createQueryBuilder()
      .delete()
      .where("category = :category AND meble_ref_id NOT IN (:...codes)", { category, codes })
      .execute();
  }

  async deleteOtherCategories(keep: ShopSectionSlug[]): Promise<void> {
    if (keep.length === 0) return;
    await this.materials
      .createQueryBuilder()
      .delete()
      .where("category NOT IN (:...keep)", { keep })
      .execute();
  }

  async list(category?: ShopSectionSlug): Promise<Material[]> {
    const rows = await this.materials.find({
      where: category ? { category } : {},
      order: { category: "ASC", mebleRefId: "ASC" },
    });
    return rows.map(toMaterial);
  }

  count(): Promise<number> {
    return this.materials.count();
  }
}
