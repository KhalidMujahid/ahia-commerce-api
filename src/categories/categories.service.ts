import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description?: string; image?: string; parentId?: string }) {
    const slug = this.generateSlug(data.name);
    
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          include: {
            children: { where: { isActive: true } },
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, data: { name?: string; description?: string; image?: string; sortOrder?: number }) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updateData: any = { ...data };
    if (data.name && data.name !== category.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    return this.prisma.category.update({
      where: { id },
      data: updateData,
      include: { parent: true, children: true },
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.products.length > 0 || category.children.length > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.category.delete({ where: { id } });
  }

  async getBreadcrumb(id: string): Promise<any[]> {
    const breadcrumb: any[] = [];
    let current = await this.prisma.category.findUnique({ where: { id } });

    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name, slug: current.slug });
      if (current.parentId) {
        current = await this.prisma.category.findUnique({ where: { id: current.parentId } });
      } else {
        break;
      }
    }

    return breadcrumb;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
