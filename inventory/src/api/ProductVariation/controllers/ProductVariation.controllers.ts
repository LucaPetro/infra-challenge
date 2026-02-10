import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { ProductVariationService } from "../services/ProductVariation.service";
import { CreateVariationDTO } from "../dto/ProductVariation.dto";

@Controller('productVariation')
export class ProductVariationController {
    constructor(
        @Inject(ProductVariationService)
        private readonly PVService: ProductVariationService
    ) {}

    @Get()
    async getVariations() {
        return this.PVService.getAll()
    }

    @Post('create')
    async createVariation(
        @Body() body: CreateVariationDTO,
    ) {
        return this.PVService.createVariation(body)
    }
}