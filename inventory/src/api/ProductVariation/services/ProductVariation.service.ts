import { Injectable, Inject } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";
import { ProductVariation } from "../../../db/entities/ProductVariation.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CreateVariationDTO } from "../dto/ProductVariation.dto";

@Injectable()
export class ProductVariationService {
    constructor(
        @Inject(getRepositoryToken(ProductVariation))
        private readonly PVRepository: Repository<ProductVariation>
    ) {}

    async getAll(): Promise<ProductVariation[]> {
        return this.PVRepository.find();
    }

    async createVariation(data: CreateVariationDTO) {
        const variation = this.PVRepository.create(data);
        return this.PVRepository.save(variation);
    } 
}