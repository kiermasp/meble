import { Controller, Get } from "@nestjs/common";
import {
  CategoryRow,
  DecorKindRow,
  ManufacturerRow,
} from "./lookup.rows";
import { ShopLookupStore } from "./shop-lookup.store";

@Controller()
export class LookupsController {
  constructor(private readonly lookups: ShopLookupStore) {}

  @Get("categories")
  categories() {
    return this.lookups.list(CategoryRow);
  }

  @Get("manufacturers")
  manufacturers() {
    return this.lookups.list(ManufacturerRow);
  }

  @Get("decor-kinds")
  decorKinds() {
    return this.lookups.list(DecorKindRow);
  }
}
