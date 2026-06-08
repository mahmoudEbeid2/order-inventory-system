import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(3, "SKU must be at least 3 characters").regex(/^[a-zA-Z0-9_-]+$/, "SKU must be alphanumeric"),
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    price: z.number().positive("Price must be a positive number"),
    stockQuantity: z.number().int().nonnegative("Stock quantity must be a non-negative integer"),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(3, "SKU must be at least 3 characters").regex(/^[a-zA-Z0-9_-]+$/, "SKU must be alphanumeric").optional(),
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    price: z.number().positive("Price must be a positive number").optional(),
    stockQuantity: z.number().int().nonnegative("Stock quantity must be a non-negative integer").optional(),
  }),
});

export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, "Page must be a numeric string").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a numeric string").optional(),
    sort: z.string().optional(),
    search: z.string().optional(),
  }).catchall(z.any()), // Allow custom filtering fields
});
