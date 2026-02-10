import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ProductVariation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string

    @Column('jsonb')
    info: any

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}