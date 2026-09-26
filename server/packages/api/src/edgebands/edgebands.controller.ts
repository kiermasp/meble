import { Controller, Get } from "@nestjs/common";
import { presentEdgeband } from "./edgeband.presenter";
import { EdgebandStore } from "./edgeband.store";

@Controller("edgebands")
export class EdgebandsController {
  constructor(private readonly edgebands: EdgebandStore) {}

  @Get()
  async list() {
    const rows = await this.edgebands.list();
    return rows.map(presentEdgeband);
  }
}
