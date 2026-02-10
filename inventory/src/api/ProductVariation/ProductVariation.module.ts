import { Module } from "@nestjs/common";
import { ProductVariationService } from "./services/ProductVariation.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductVariation } from "@/db/entities/ProductVariation.entity";
import { ProductVariationController } from "./controllers/ProductVariation.controllers";

@Module({
    imports: [TypeOrmModule.forFeature([
        ProductVariation
    ])],
    providers: [
        ProductVariationService
    ],
    controllers: [
        ProductVariationController
    ],
    // No other modules exist for this challenge, 
    // so there's no need to export
})

export class ProductVariationModule {}