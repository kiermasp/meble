import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SHOP_SECTIONS, type Edgeband } from "@meble/domain";
import { Repository } from "typeorm";
import { CategoryRow, ManufacturerRow } from "../lookups/lookup.rows";
import { lookupId, mergeNamedTerms, ShopLookupStore } from "../lookups/shop-lookup.store";
import type { ListingDictionaries } from "../lookups/shop-term";
import { toEdgeband } from "./edgeband.mapper";
import { EdgebandRow } from "./edgeband.row";

@Injectable()
export class EdgebandStore {
  constructor(
    @InjectRepository(EdgebandRow)
    private readonly edgebands: Repository<EdgebandRow>,
    private readonly lookups: ShopLookupStore,
  ) {}

  async replaceAll(edgebands: Edgeband[], dictionaries?: ListingDictionaries): Promise<void> {
    const section = SHOP_SECTIONS.find((item) => item.slug === "obrzeza");
    const categoryTerm = dictionaries?.category ?? {
      mebleRefId: null,
      code: "obrzeza",
      name: section?.label ?? "Obrzeża",
      sortOrder: section ? SHOP_SECTIONS.indexOf(section) + 1 : 3,
    };
    const categories = await this.lookups.upsert(CategoryRow, [categoryTerm]);
    const categoryId = categories.byCode.get(categoryTerm.code);
    if (!categoryId) throw new Error(`Missing category ${categoryTerm.code}`);
    const manufacturers = await this.lookups.upsert(
      ManufacturerRow,
      mergeNamedTerms(dictionaries?.manufacturers ?? [], edgebands.map((edgeband) => edgeband.manufacturer)),
    );
    const byCode = new Map<string, Edgeband>();
    for (const edgeband of edgebands) byCode.set(edgeband.mebleRefId, edgeband);
    const values = [...byCode.values()].map((edgeband) => ({
      mebleRefId: edgeband.mebleRefId,
      displayName: edgeband.displayName,
      categoryId,
      code: edgeband.code,
      name: edgeband.name,
      manufacturerId: lookupId(manufacturers, edgeband.manufacturer),
      structure: edgeband.structure,
      widthMm: edgeband.widthMm,
      thicknessMm: edgeband.thicknessMm,
      availability: edgeband.availability,
      unitPriceAmount: edgeband.unitPriceAmount,
      currency: edgeband.currency,
      fetchedAt: edgeband.fetchedAt,
    }));
    if (values.length === 0) return;
    await this.edgebands.upsert(values, { conflictPaths: ["mebleRefId"], skipUpdateIfNoValuesChanged: false });
    const codes = [...byCode.keys()];
    await this.edgebands.createQueryBuilder().delete().where("meble_ref_id NOT IN (:...codes)", { codes }).execute();
  }

  async list(): Promise<Array<Edgeband & { id: string }>> {
    const rows = await this.edgebands.find({
      relations: { manufacturer: true, category: true },
      order: { code: "ASC", widthMm: "ASC", thicknessMm: "ASC" },
    });
    return rows.map(toEdgeband);
  }

  count(): Promise<number> {
    return this.edgebands.count();
  }
}
