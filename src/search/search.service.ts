import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';

interface MeiliSearchDoc {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  vendor: string;
  rating: number;
  views: number;
  inStock: boolean;
}

@Injectable()
export class SearchService {
  private meiliHost: string;
  private meiliKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.meiliHost = this.configService.get<string>('search.host') || 'http://localhost:7700';
    this.meiliKey = this.configService.get<string>('search.apiKey') || '';
  }

  private async meiliRequest(endpoint: string, method = 'GET', body?: any) {
    const url = `${this.meiliHost}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.meiliKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Meilisearch error: ${response.statusText}`);
    }

    return response.json();
  }

  async indexProduct(product: any) {
    const doc: MeiliSearchDoc = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.priceCurrent,
      category: product.category?.name || '',
      vendor: product.vendor?.storeName || '',
      rating: 0,
      views: product.views || 0,
      inStock: product.stockQuantity > 0,
    };

    return this.meiliRequest('/indexes/products/documents', 'POST', { documents: [doc] });
  }

  async deleteProduct(productId: string) {
    return this.meiliRequest(`/indexes/products/documents/${productId}`, 'DELETE');
  }

  async search(query: string, options?: {
    limit?: number;
    offset?: number;
    filter?: string[];
    sort?: string[];
  }) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.meiliRequest('/indexes/products/search', 'POST', {
        q: query,
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        filter: options?.filter,
        sort: options?.sort,
      });

      const results = {
        hits: response.hits,
        totalHits: response.estimatedTotalHits,
        query: response.query,
        processingTime: response.processingTimeMs,
      };

  await this.redis.setJson(cacheKey, results, 300);

      return results;
    } catch (error) {
      return this.fallbackSearch(query, options);
    }
  }

  private async fallbackSearch(query: string, options?: any) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: options?.limit || 20,
      include: {
        category: true,
        vendor: { select: { storeName: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    return {
      hits: products,
      totalHits: products.length,
      query,
      processingTime: 0,
      fallback: true,
    };
  }

  async facetSearch(facets: string[], query: string) {
    try {
      const response = await this.meiliRequest('/indexes/products/search', 'POST', {
        q: query,
        facets: facets,
      });

      return {
        hits: response.hits,
        facetDistribution: response.facetDistribution,
      };
    } catch {
      return { hits: [], facetDistribution: {} };
    }
  }

  async getRecommendations(productId: string, limit = 10) {
    const cacheKey = `recommendations:${productId}:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) return [];

    const recommendations = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        categoryId: product.categoryId,
        status: 'ACTIVE',
      },
      take: limit,
      orderBy: { views: 'desc' },
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    await this.redis.setJson(cacheKey, recommendations, 3600);

    return recommendations;
  }

  async getTrendingSearches(limit = 10) {
    const cacheKey = `trending:searches:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const trending = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: limit,
      orderBy: { views: 'desc' },
      select: { name: true, views: true },
    });

    const searches = trending.map(p => p.name);
    await this.redis.setJson(cacheKey, searches, 3600);

    return searches;
  }

  async trackSearch(query: string, _userId?: string) {
    const key = 'search:analytics:queries';
    const client = this.redis.getClient();
    await client.hincrby(key, query.toLowerCase(), 1);
  }

  async getSearchAnalytics() {
    const client = this.redis.getClient();
    const queries = await client.hgetall('search:analytics:queries');
    
    const sorted = Object.entries(queries)
      .map(([query, count]) => ({ query, count: parseInt(count as string) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return {
      topSearches: sorted,
      totalSearches: sorted.reduce((sum, q) => sum + q.count, 0),
    };
  }
}
