import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Edgeband } from "@meble/domain";
import { Repository } from "typeorm";
import { toEdgeband } from "./edgeband.mapper";
import { EdgebandRow } from "./edgeband.row";

@Injectable()
export class EdgebandStore {
  constructor(
    @InjectRepository(EdgebandRow)
    private readonly edgebands: Repository<EdgebandRow>,
  ) {}

  async replaceAll(edgebands: Edgeband[]): Promise<void> {
    const byCode = new Map<string, Edgeband>();
    for (const edgeband of edgebands) byCode.set(edgeband.externalCode, edgeband);
    const values = [...byCode.values()].map((edgeband) => ({
      externalCode: edgeband.externalCode,
      displayName: edgeband.displayName,
      code: edgeband.code,
      name: edgeband.name,
      manufacturer: edgeband.manufacturer,
      structure: edgeband.structure,
      widthMm: edgeband.widthMm,
      thicknessMm: edgeband.thicknessMm,
      availability: edgeband.availability,
      unitPriceAmount: edgeband.unitPriceAmount,
      currency: edgeband.currency,
      fetchedAt: edgeband.fetchedAt,
    }));
    if (values.length === 0) return;
    await this.edgebands.upsert(values, {
      conflictPaths: ["externalCode"],
      skipUpdateIfNoValuesChanged: false,
    });
    const codes = [...byCode.keys()];
    await this.edgebands
      .createQueryBuilder()
      .delete()
      .where("external_code NOT IN (:...codes)", { codes })
      .execute();
  }

  async list(): Promise<Array<Edgeband & { id: string }>> {
    const rows = await this.edgebands.find({ order: { code: "ASC", widthMm: "ASC", thicknessMm: "ASC" } });
    return rows.map(toEdgeband);
  }

  count(): Promise<number> {
    return this.edgebands.count();
  }
}
