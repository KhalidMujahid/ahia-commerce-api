import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}


  async getCart(userId: string) {
    const cachedCart = await this.redis.get(`cart:${userId}`);
    if (cachedCart) {
      return JSON.parse(cachedCart);
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                priceCurrent: true,
                priceOld: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                vendor: {
                  select: {
                    id: true,
                    storeName: true,
                  },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  priceCurrent: true,
                  priceOld: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                  vendor: {
                    select: {
                      id: true,
                      storeName: true,
                    },
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    await this.redis.set(`cart:${userId}`, JSON.stringify(cart), 300);

    return cart;
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        variants: dto.variantId ? { where: { id: dto.variantId } } : false,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('Product is not available');
    }

    let price = product.priceCurrent;
    if (dto.variantId && product.variants.length > 0) {
      const variant = product.variants[0];
      price = variant.priceAdjustment > 0 
        ? product.priceCurrent + variant.priceAdjustment 
        : product.priceCurrent;
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          total: price * newQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId || null,
          quantity: dto.quantity,
          price,
          total: price * dto.quantity,
        },
      });
    }

    await this.updateCartTotals(cart.id);

    await this.redis.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { where: { id: cartItemId } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    const item = cart.items[0];

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity: dto.quantity,
          total: item.price * dto.quantity,
        },
      });
    }

    await this.updateCartTotals(cart.id);

    await this.redis.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { where: { id: cartItemId } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });

    await this.updateCartTotals(cart.id);

    await this.redis.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        totalItems: 0,
        totalAmount: 0,
      },
    });

    await this.redis.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  async getCartItemCount(userId: string): Promise<number> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { totalItems: true },
    });

    return cart?.totalItems || 0;
  }

  async getCartSummary(userId: string) {
    const cart = await this.getCart(userId);

    const vendorGroups = new Map<string, any>();
    
    for (const item of cart.items) {
      const vendorId = item.product.vendor.id;
      const vendorName = item.product.vendor.storeName;
      
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, {
          vendorId,
          vendorName,
          items: [],
          subtotal: 0,
        });
      }
      
      const group = vendorGroups.get(vendorId);
      group.items.push(item);
      group.subtotal += item.total;
    }

    return {
      cart,
      vendors: Array.from(vendorGroups.values()),
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
    };
  }

  private async updateCartTotals(cartId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
    });

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        totalItems,
        totalAmount,
      },
    });
  }
}
