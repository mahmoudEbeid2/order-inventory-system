import { prisma } from "../lib/prisma.js";
import { PrismaFeatures } from "../utils/prismaFeatures.js";
import { productRepository } from "../repositories/product.repository.js";
import { NotFoundError } from "../utils/errors.js";
import type { CreateProductInputDTO, UpdateProductInputDTO, ProductResponseDTO } from "../dtos/product.dto.js";

export const productService = {
  async createProduct(data: CreateProductInputDTO): Promise<ProductResponseDTO> {
    const product = await productRepository.create({
      sku: data.sku,
      name: data.name,
      price: data.price,
      stockQuantity: data.stockQuantity,
    });

    const { isDeleted, ...result } = product;
    return result;
  },

  async updateProduct(id: string, data: UpdateProductInputDTO): Promise<ProductResponseDTO> {
    const product = await productRepository.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundError("Product not found.");
    }

    const updated = await productRepository.update(id, data);
    const { isDeleted, ...result } = updated;
    return result;
  },

  async deleteProduct(id: string): Promise<void> {
    const product = await productRepository.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundError("Product not found.");
    }

    await productRepository.softDelete(id);
  },

  async getProducts(queryParams: any) {
    const query = new PrismaFeatures(prisma.product, queryParams);
    
    query.filter();
    // Enforce active products only
    query.queryOptions.where = {
      ...query.queryOptions.where,
      isDeleted: false,
    };
    
    query.search(["sku", "name"]);
    query.sort();
    query.paginate();

    const result = await query.exec();
    const data = result.data.map(({ isDeleted, ...product }) => product);

    return {
      data,
      meta: result.meta,
    };
  },

  async getArchivedProducts(queryParams: any) {
    const query = new PrismaFeatures(prisma.product, queryParams);
    
    query.filter();
    // Enforce archived products only
    query.queryOptions.where = {
      ...query.queryOptions.where,
      isDeleted: true,
    };
    
    query.search(["sku", "name"]);
    query.sort();
    query.paginate();

    const result = await query.exec();
    const data = result.data.map(({ isDeleted, ...product }) => product);

    return {
      data,
      meta: result.meta,
    };
  },

  async getProductById(id: string): Promise<ProductResponseDTO> {
    const product = await productRepository.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundError("Product not found.");
    }

    const { isDeleted, ...result } = product;
    return result;
  },
};
