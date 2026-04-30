import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductVariantDto,
  ProductImageDto,
  ProductSpecificationDto,
  ProductQueryDto,
  ProductStatus,
  CreateCategoryDto,
} from './dto/product.dto';
import { Prisma, ProductImage } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  generateSKU(name: string) {
    const cleanName = name.replace(/\s+/g, '').toUpperCase().slice(0, 10);
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);

    return `${cleanName}-${random}-${timestamp}`;
  }

  async generateUniqueSKU(name: string): Promise<string> {
    let attempts = 0;

    while (attempts < 5) {
      const sku = this.generateSKU(name);

      const found = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (!found) {
        return sku;
      }

      attempts++;
    }

    throw new BadRequestException('Unable to generate unique SKU');
  }

  async createCat(createCategoryDto: CreateCategoryDto) {
    const slug = this.generateSlug(createCategoryDto.name);

    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        parentId: createCategoryDto.parentId,
        sortOrder: createCategoryDto.sortOrder || 0,
        isActive: createCategoryDto.isActive ?? true,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      include: {
        children: true,
      },
    });
  }

  async create(vendorId: string, createProductDto: CreateProductDto) {
    const slug = this.generateSlug(createProductDto.name);

    // ✅ Validate category
    if (createProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: createProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // 🔥 Generate UNIQUE SKU (always ignore user input)
    const sku = await this.generateUniqueSKU(createProductDto.name);

    try {
      const product = await this.prisma.product.create({
        data: {
          vendorId,
          name: createProductDto.name,
          slug,

          // ✅ ALWAYS GENERATED
          sku,

          description: createProductDto.description,
          shortDescription: createProductDto.shortDescription,
          priceCurrent: createProductDto.priceCurrent,
          priceOld: createProductDto.priceOld,
          costPrice: createProductDto.costPrice,
          currency: createProductDto.currency || 'USD',
          discountPct: createProductDto.discountPct || 0,
          type: createProductDto.type,
          stockQuantity: createProductDto.stockQuantity || 0,
          lowStockThreshold: createProductDto.lowStockThreshold || 10,
          categoryId: createProductDto.categoryId,

          // (keep your current approach OR switch to Json later)
          metaTitle: createProductDto.metaTitle
            ? JSON.stringify(createProductDto.metaTitle)
            : null,

          metaDescription: createProductDto.metaDescription
            ? JSON.stringify(createProductDto.metaDescription)
            : null,

          metaKeywords: createProductDto.metaKeywords || [],
          weight: createProductDto.weight,
          weightUnit: createProductDto.weightUnit,
          dimensions: createProductDto.dimensions,
          isFeatured: createProductDto.isFeatured || false,
          isTrending: createProductDto.isTrending || false,
          isNewArrival: createProductDto.isNewArrival || false,
          status: 'DRAFT' as ProductStatus,
        },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
            },
          },
        },
      });

      await this.redis.del('products:all');

      // ✅ Parse JSON before returning
      const parseJSON = (field: any) => {
        try {
          return field ? JSON.parse(field) : null;
        } catch {
          return field;
        }
      };

      product.metaTitle = parseJSON(product.metaTitle);
      product.metaDescription = parseJSON(product.metaDescription);

      return product;
    } catch (error) {
      // 🔥 Safety fallback (rare case)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Duplicate field detected (possibly SKU)',
        );
      }
      throw error;
    }
  }

  async findById(id: string) {
    const cached = await this.redis.getJson(`product:${id}`);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
          },
        },
        variants: true,
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        specifications: {
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { status: 'APPROVED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    await this.redis.setJson(`product:${id}`, product, 300);

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
          },
        },
        variants: true,
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        specifications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findAll(query: ProductQueryDto, user?: any) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      status,
      type,
      minPrice,
      maxPrice,
      isFeatured,
      isTrending,
      inStock,
      sortBy,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.ProductWhereInput = {};

    // 🔍 SEARCH
    if (search) {
      where.OR = [
        { name: { contains: 'insensitive', mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 📂 CATEGORY
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 🔥 ROLE-BASED ACCESS CONTROL (FINAL FIX)
    if (!user) {
      // ❌ Guest / Public → ONLY ACTIVE
      // where.status = 'ACTIVE';
    } else if (user.role === 'ADMIN') {
      // 👑 Admin → EVERYTHING
      if (status) {
        where.status = status;
      }
    } else if (user.role === 'VENDOR') {
      // 🏪 Vendor → ONLY THEIR PRODUCTS (NO STATUS RESTRICTION)
      where.vendorId = user.id;

      // Optional filter (but NOT forced)
      if (status) {
        where.status = status;
      }
    } else {
      // 👤 Normal user → ONLY ACTIVE
      // where.status = 'ACTIVE';
    }

    // 🧾 TYPE
    if (type) {
      where.type = type;
    }

    // 💰 PRICE FILTER
    if (minPrice || maxPrice) {
      where.priceCurrent = {};
      if (minPrice) where.priceCurrent.gte = Number(minPrice);
      if (maxPrice) where.priceCurrent.lte = Number(maxPrice);
    }

    // 📦 STOCK
    if (inStock) {
      where.stockQuantity = { gt: 0 };
    }

    // ⭐ FLAGS
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (isTrending !== undefined) {
      where.isTrending = isTrending;
    }

    // 🔽 SORTING
    let orderBy: Prisma.ProductOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (sortBy) {
      switch (sortBy) {
        case 'price_asc':
          orderBy = { priceCurrent: 'asc' };
          break;
        case 'price_desc':
          orderBy = { priceCurrent: 'desc' };
          break;
        case 'popular':
          orderBy = { views: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    // 🚀 QUERY
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForAdmin(query: ProductQueryDto) {
    return this.findAll(query, { role: 'ADMIN' });
  }

  //   async findAll(query: ProductQueryDto) {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     search,
  //     categoryId,
  //   } = query;

  //   const skip = (page - 1) * limit;

  //   // 🔍 Build filters
  //   const where: Prisma.ProductWhereInput = {
  //     ...(search && {
  //       OR: [
  //         { name: { contains: search, mode: 'insensitive' } },
  //         { description: { contains: search, mode: 'insensitive' } },
  //       ],
  //     }),
  //     ...(categoryId && { categoryId }),
  //   };

  //   // 🚀 Query DB
  //   const [products, total] = await this.prisma.$transaction([
  //     this.prisma.product.findMany({
  //       where,
  //       skip,
  //       take: Number(limit),
  //       orderBy: { createdAt: 'desc' },

  //       include: {
  //         category: true,
  //         vendor: {
  //           select: {
  //             id: true,
  //             storeName: true,
  //             storeSlug: true,
  //           },
  //         },
  //         images: {
  //           orderBy: { sortOrder: 'asc' }, // 🔥 IMPORTANT
  //         },
  //       },
  //     }),

  //     this.prisma.product.count({ where }),
  //   ]);

  //   // 📦 Return clean response
  //   return {
  //     data: products,
  //     meta: {
  //       total,
  //       page: Number(page),
  //       limit: Number(limit),
  //       totalPages: Math.ceil(total / limit),
  //     },
  //   };
  // }

  async update(
    id: string,
    vendorId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('You can only update your own products');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
          },
        },
      },
    });

    await this.redis.del(`product:${id}`);
    await this.redis.del('products:all');

    return updated;
  }

  async delete(id: string, vendorId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: 'DELETED' as ProductStatus },
    });

    await this.redis.del(`product:${id}`);
    await this.redis.del('products:all');

    return { message: 'Product deleted successfully' };
  }

  async adminUpdate(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
          },
        },
      },
    });

    await this.redis.del(`product:${id}`);
    await this.redis.del('products:all');

    return updated;
  }

  async adminDelete(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: 'DELETED' as ProductStatus },
    });

    await this.redis.del(`product:${id}`);
    await this.redis.del('products:all');

    return { message: 'Product deleted successfully' };
  }

  async addImage(
    productId: string,
    vendorId: string,
    imageDto: ProductImageDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only add images to your own products',
      );
    }

    if (imageDto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: imageDto.url,
        altText: imageDto.altText,
        isPrimary: imageDto.isPrimary || false,
      },
    });
  }

  async addMultipleImages(
    productId: string,
    vendorId: string,
    images: ProductImageDto[],
  ) {
    // ✅ Check product ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      throw new ForbiddenException('Product not found or not owned by you');
    }

    if (!images.length) {
      throw new BadRequestException('No images provided');
    }

    // 🔥 Check if any image is primary
    const hasPrimary = images.some((img) => img.isPrimary);

    // 🚀 Use TRANSACTION (very important)
    return this.prisma.$transaction(async (tx) => {
      // ✅ Reset previous primary ONCE
      if (hasPrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      // ✅ Prepare data
      const data = images.map((img, index) => ({
        productId,
        url: img.url,
        altText: img.altText || null,
        isPrimary: img.isPrimary || false,
        sortOrder: img.sortOrder ?? index, // 👈 IMPORTANT
      }));

      // ✅ Bulk insert (FAST)
      await tx.productImage.createMany({
        data,
      });

      // ✅ Return fresh images (ordered)
      return tx.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  async addVariant(
    productId: string,
    vendorId: string,
    variantDto: ProductVariantDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only add variants to your own products',
      );
    }

    const priceCurrent =
      product.priceCurrent + (variantDto.priceAdjustment || 0);

    return this.prisma.productVariant.create({
      data: {
        productId,
        name: variantDto.name,
        sku: variantDto.sku,
        color: variantDto.color,
        size: variantDto.size,
        storage: variantDto.storage,
        priceAdjustment: variantDto.priceAdjustment || 0,
        priceCurrent,
        stockQuantity: variantDto.stockQuantity || 0,
        image: variantDto.image,
      },
    });
  }

  async addSpecification(
    productId: string,
    vendorId: string,
    specDto: ProductSpecificationDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException(
        'You can only add specifications to your own products',
      );
    }

    const count = await this.prisma.productSpecification.count({
      where: { productId },
    });

    return this.prisma.productSpecification.create({
      data: {
        productId,
        name: specDto.name,
        value: specDto.value,
        sortOrder: count + 1,
      },
    });
  }

  async getTrending(limit = 10) {
    const cacheKey = `products:trending:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE' as ProductStatus,
        isTrending: true,
      },
      take: limit,
      orderBy: { views: 'desc' },
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    await this.redis.setJson(cacheKey, products, 600);
    return products;
  }

  async getFeatured(limit = 10) {
    const cacheKey = `products:featured:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE' as ProductStatus,
        isFeatured: true,
      },
      take: limit,
      orderBy: { unitsSold: 'desc' },
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    await this.redis.setJson(cacheKey, products, 600);
    return products;
  }

  async getNewArrivals(limit = 10) {
    const cacheKey = `products:new:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE' as ProductStatus,
        isNewArrival: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    await this.redis.setJson(cacheKey, products, 600);
    return products;
  }

  private generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return `${slug}-${Date.now()}`;
  }
}
