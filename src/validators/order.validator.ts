import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid("Invalid product ID format"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
      })
    ).nonempty("Order must contain at least one item"),
  }),
});

export const getOrdersQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, "Page must be a numeric string").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a numeric string").optional(),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
    minAmount: z.string().regex(/^\d+(\.\d+)?$/, "Minimum amount must be a number string").optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Start date must be a valid date string",
    }).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "End date must be a valid date string",
    }).optional(),
  }).catchall(z.any()),
});
