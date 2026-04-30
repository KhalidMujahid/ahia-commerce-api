import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Product variant ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: 'Quantity', default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class RemoveCartItemDto {
  @ApiProperty({ description: 'Cart item ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  cartItemId: string;
}
