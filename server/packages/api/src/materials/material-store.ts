import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SHOP_SECTIONS, isShopSection, sectionLabel, type Material } from "@meble/domain";
import { In, Repository } from "typeorm";
import {
  BrightnessRow,
  CategoryRow,
  CollectionStatusRow,
  ColorRow,
  DecorKindRow,
  DecorTypeRow,
  ManufacturerRow,
  ShadeRow,
  WaterResistanceRow,
} from "../lookups/lookup.rows";
import { lookupId, mergeNamedTerms, ShopLookupStore } from "../lookups/shop-lookup.store";
import type { ListingDictionaries, LookupIndex, ShopTerm } from "../lookups/shop-term";
import { materialContentChanged, nextUpdatedAt } from "../catalog-updated-at";
import { toMaterial, type StoredMaterial } from "./material.mapper";
import { MaterialCollectionStatusRow, MaterialRow } from "./material.row";

const MATERIAL_RELATIONS = {
  category: true,
  manufacturer: true,
  decorKind: true,
  waterResistance: true,
  brightness: true,
  decorType: true,
  shade: true,
  color: true,
  collectionLinks: { status: true },
} as const;

@Injectable()
export class MaterialStore {
  constructor(
    @InjectRepository(MaterialRow)
    private readonly materials: Repository<MaterialRow>,
    @InjectRepository(MaterialCollectionStatusRow)
    private readonly statusLinks: Repository<MaterialCollectionStatusRow>,
    private readonly lookups: ShopLookupStore,
  ) {}

  async upsertAll(materials: Material[], dictionaries?: ListingDictionaries): Promise<void> {
    const indexes = await this.prepare(materials, dictionaries);
    await this.saveMaterials(materials, indexes);
  }

  async replaceCategory(category: string, materials: Material[], dictionaries?: ListingDictionaries): Promise<void> {
    const indexes = await this.prepare(materials, dictionaries);
    await this.saveMaterials(materials, indexes);
    const categoryId = indexes.categories.byCode.get(category);
    const codes = [...new Set(materials.map((material) => material.mebleRefId))];
    if (!categoryId || codes.length === 0) return;
    await this.materials
      .createQueryBuilder()
      .delete()
      .where("category_id = :categoryId AND meble_ref_id NOT IN (:...codes)", { categoryId, codes })
      .execute();
  }

  async deleteOtherCategories(keep: string[]): Promise<void> {
    if (keep.length === 0) return;
    const categories = await this.materials.manager.getRepository(CategoryRow).find({ where: { code: In(keep) } });
    const ids = categories.map((category) => category.id);
    if (ids.length === 0) {
      await this.materials.createQueryBuilder().delete().execute();
      return;
    }
    await this.materials.createQueryBuilder().delete().where("category_id NOT IN (:...ids)", { ids }).execute();
  }

  async list(category?: string): Promise<StoredMaterial[]> {
    const rows = await this.materials.find({
      relations: MATERIAL_RELATIONS,
      where: category ? { category: { code: category } } : {},
      order: { mebleRefId: "ASC" },
    });
    return rows.map(toMaterial);
  }

  count(): Promise<number> {
    return this.materials.count();
  }

  private async prepare(materials: Material[], dictionaries?: ListingDictionaries): Promise<PreparedLookups> {
    const categories = await this.lookups.upsert(CategoryRow, categoryTerms(materials, dictionaries));
    const manufacturers = await this.lookups.upsert(
      ManufacturerRow,
      mergeNamedTerms(dictionaries?.manufacturers ?? [], materials.map((material) => material.manufacturer)),
    );
    const decorKinds = await this.lookups.upsert(
      DecorKindRow,
      mergeNamedTerms(dictionaries?.decorKinds ?? [], materials.map((material) => material.decorKind)),
    );
    const waterResistances = await this.lookups.upsert(
      WaterResistanceRow,
      mergeNamedTerms(dictionaries?.waterResistances ?? [], materials.map((material) => material.waterResistance)),
    );
    const brightnesses = await this.lookups.upsert(
      BrightnessRow,
      mergeNamedTerms(dictionaries?.brightnesses ?? [], materials.map((material) => material.brightness)),
    );
    const decorTypes = await this.lookups.upsert(
      DecorTypeRow,
      mergeNamedTerms(dictionaries?.decorTypes ?? [], materials.map((material) => material.decorType)),
    );
    const shades = await this.lookups.upsert(
      ShadeRow,
      mergeNamedTerms(dictionaries?.shades ?? [], materials.map((material) => material.shade)),
    );
    const colors = await this.lookups.upsert(
      ColorRow,
      mergeNamedTerms(dictionaries?.colors ?? [], materials.map((material) => material.color)),
    );
    const collectionStatuses = await this.lookups.upsert(
      CollectionStatusRow,
      mergeNamedTerms(dictionaries?.collectionStatuses ?? [], materials.flatMap((material) => material.statuses)),
    );
    return { categories, manufacturers, decorKinds, waterResistances, brightnesses, decorTypes, shades, colors, collectionStatuses };
  }

  private async saveMaterials(materials: Material[], indexes: PreparedLookups): Promise<void> {
    const byKey = new Map<string, Material>();
    for (const material of materials) byKey.set(`${material.category}\0${material.mebleRefId}`, material);
    const existing = await this.materials.find({ relations: MATERIAL_RELATIONS });
    const previousByKey = new Map(existing.map((row) => [`${row.category.code}\0${row.mebleRefId}`, toMaterial(row)]));
    const values = [...byKey.values()].map((material) => {
      const categoryId = indexes.categories.byCode.get(material.category);
      if (!categoryId) throw new Error(`Missing category ${material.category}`);
      const previous = previousByKey.get(`${material.category}\0${material.mebleRefId}`);
      return {
        mebleRefId: material.mebleRefId,
        displayName: material.displayName,
        categoryId,
        subtype: material.subtype,
        manufacturerId: lookupId(indexes.manufacturers, material.manufacturer),
        decorCode: material.decorCode,
        decorName: material.decorName,
        structure: material.structure,
        thicknessMm: material.thicknessMm,
        format: material.format,
        availability: material.availability,
        unitPriceAmount: material.unitPriceAmount,
        currency: material.currency,
        decorKindId: lookupId(indexes.decorKinds, material.decorKind),
        waterResistanceId: lookupId(indexes.waterResistances, material.waterResistance),
        brightnessId: lookupId(indexes.brightnesses, material.brightness),
        decorTypeId: lookupId(indexes.decorTypes, material.decorType),
        shadeId: lookupId(indexes.shades, material.shade),
        colorId: lookupId(indexes.colors, material.color),
        fetchedAt: material.fetchedAt,
        updatedAt: nextUpdatedAt(previous, material.fetchedAt, previous ? materialContentChanged(previous, material) : true),
      };
    });
    if (values.length === 0) return;
    await this.materials.upsert(values, { conflictPaths: ["categoryId", "mebleRefId"], skipUpdateIfNoValuesChanged: false });
    const saved = await this.materials.find({
      select: { id: true, mebleRefId: true, categoryId: true },
      where: values.map((value) => ({ categoryId: value.categoryId, mebleRefId: value.mebleRefId })),
    });
    const idByKey = new Map(saved.map((row) => [`${row.categoryId}\0${row.mebleRefId}`, row.id]));
    const materialIds = saved.map((row) => row.id);
    if (materialIds.length > 0) await this.statusLinks.delete({ materialId: In(materialIds) });
    const links: MaterialCollectionStatusRow[] = [];
    for (const material of byKey.values()) {
      const categoryId = indexes.categories.byCode.get(material.category);
      const materialId = categoryId ? idByKey.get(`${categoryId}\0${material.mebleRefId}`) : undefined;
      if (!materialId) continue;
      const seen = new Set<string>();
      for (const status of material.statuses) {
        const collectionStatusId = lookupId(indexes.collectionStatuses, status);
        if (!collectionStatusId || seen.has(collectionStatusId)) continue;
        seen.add(collectionStatusId);
        const link = new MaterialCollectionStatusRow();
        link.materialId = materialId;
        link.collectionStatusId = collectionStatusId;
        links.push(link);
      }
    }
    if (links.length > 0) await this.statusLinks.insert(links);
  }
}

interface PreparedLookups {
  categories: LookupIndex;
  manufacturers: LookupIndex;
  decorKinds: LookupIndex;
  waterResistances: LookupIndex;
  brightnesses: LookupIndex;
  decorTypes: LookupIndex;
  shades: LookupIndex;
  colors: LookupIndex;
  collectionStatuses: LookupIndex;
}

function categoryTerms(materials: Material[], dictionaries?: ListingDictionaries): ShopTerm[] {
  const terms = new Map<string, ShopTerm>();
  if (dictionaries) terms.set(dictionaries.category.code, dictionaries.category);
  for (const material of materials) {
    if (terms.has(material.category)) continue;
    const index = SHOP_SECTIONS.findIndex((section) => section.slug === material.category);
    terms.set(material.category, {
      mebleRefId: null,
      code: material.category,
      name: isShopSection(material.category) ? sectionLabel(material.category) : material.category,
      sortOrder: index >= 0 ? index + 1 : 100,
    });
  }
  return [...terms.values()];
}
