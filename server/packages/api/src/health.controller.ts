import { Controller, Get } from "@nestjs/common";
import { MaterialStore } from "./materials/material-store";

@Controller("health")
export class HealthController {
  constructor(private readonly materials: MaterialStore) {}

  @Get()
  async health() {
    return {
      status: "ok",
      materials: await this.materials.count(),
    };
  }
}
