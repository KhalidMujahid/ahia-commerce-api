import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('breadcrumb/:id')
  @ApiOperation({ summary: 'Get category breadcrumb' })
  @ApiResponse({ status: 200, description: 'Breadcrumb retrieved' })
  async getBreadcrumb(@Param('id') id: string) {
    return this.categoriesService.getBreadcrumb(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (Admin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() data: { name: string; description?: string; image?: string; parentId?: string }) {
    return this.categoriesService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async update(@Param('id') id: string, @Body() data: { name?: string; description?: string; image?: string; sortOrder?: number }) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Admin)' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
