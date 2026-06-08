import { prisma } from "../lib/prisma.js";
import type { Prisma, Product } from "@prisma/client";

export const productRepository = {
  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  },

  async findActiveBySku(sku: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { sku, isDeleted: false },
    });
  },

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({
      data,
    });
  },

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
  },
};
