import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CuttingOrderBodyDto } from "./cutting-order.dto";
import { presentCuttingOrder, toDraft } from "./cutting-order.presenter";
import { CuttingOrderStore } from "./cutting-order.store";

const MISSING = "Nie ma zaparkowanego rozkroju o tym identyfikatorze.";

const uuid = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException("Identyfikator rozkroju musi być UUID."),
});

@Controller("cutting-orders")
export class CuttingOrdersController {
  constructor(private readonly orders: CuttingOrderStore) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: CuttingOrderBodyDto) {
    const order = await this.orders.create(toDraft(body));
    return presentCuttingOrder(order);
  }

  @Get()
  async list() {
    const orders = await this.orders.list();
    return orders.map(presentCuttingOrder);
  }

  @Get(":id")
  async read(@Param("id", uuid) id: string) {
    const order = await this.orders.find(id);
    if (!order) throw new NotFoundException(MISSING);
    return presentCuttingOrder(order);
  }

  @Patch(":id")
  async update(@Param("id", uuid) id: string, @Body() body: CuttingOrderBodyDto) {
    const order = await this.orders.update(id, toDraft(body));
    if (!order) throw new NotFoundException(MISSING);
    return presentCuttingOrder(order);
  }
}
