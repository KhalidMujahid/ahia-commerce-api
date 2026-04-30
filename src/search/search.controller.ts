import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchProducts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: boolean,
  ) {
    const filters: string[] = [];
    if (category) filters.push(`category = "${category}"`);
    if (minPrice) filters.push(`price >= ${minPrice}`);
    if (maxPrice) filters.push(`price <= ${maxPrice}`);
    if (inStock) filters.push('inStock = true');

    await this.searchService.trackSearch(query);

    return this.searchService.search(query, {
      limit: limit || 20,
      offset: offset || 0,
      filter: filters.length > 0 ? filters : undefined,
    });
  }

  @Get('facets')
  @ApiOperation({ summary: 'Faceted search' })
  @ApiResponse({ status: 200, description: 'Faceted results retrieved' })
  async facetSearch(@Query('q') query: string) {
    return this.searchService.facetSearch(['category', 'vendor', 'price'], query);
  }

  @Get('recommendations/:productId')
  @ApiOperation({ summary: 'Get product recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  async getRecommendations(@Param('productId') productId: string, @Query('limit') limit?: number) {
    return this.searchService.getRecommendations(productId, limit || 10);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending searches' })
  @ApiResponse({ status: 200, description: 'Trending searches retrieved' })
  async getTrendingSearches(@Query('limit') limit?: number) {
    return this.searchService.getTrendingSearches(limit || 10);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getSearchAnalytics() {
    return this.searchService.getSearchAnalytics();
  }
}
