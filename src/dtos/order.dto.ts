import type { Prisma } from "@prisma/client";

export interface CheckoutItemDTO {
  productId: string;
  quantity: number;
}

export interface CreateOrderInputDTO {
  items: CheckoutItemDTO[];
}

export interface OrderItemResponseDTO {
  id: string;
  productId: string;
  quantity: number;
  priceAtPurchase: Prisma.Decimal;
  product?: {
    name: string;
    sku: string;
  };
}

export interface OrderResponseDTO {
  id: string;
  userId: string;
  status: string;
  totalAmount: Prisma.Decimal;
  items: OrderItemResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}
