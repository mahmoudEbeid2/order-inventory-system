import type { Prisma } from "@prisma/client";

export interface ProductResponseDTO {
  id: string;
  sku: string;
  name: string;
  price: Prisma.Decimal;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInputDTO {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

export interface UpdateProductInputDTO {
  sku?: string;
  name?: string;
  price?: number;
  stockQuantity?: number;
}
