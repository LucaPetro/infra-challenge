import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsDefined, ValidateNested } from 'class-validator'

export class InfoDTO {
    @IsString()
    category: string
}

export class CreateVariationDTO {
    @IsString()
    @IsNotEmpty()
    public name: string

    @IsDefined()
    @ValidateNested()
    @Type(() => InfoDTO)
    public info: InfoDTO
}