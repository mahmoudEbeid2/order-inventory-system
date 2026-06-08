import { prisma } from "../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

export const orderRepository = {
  async checkout(userId: string, items: CheckoutItem[]) {
    // Sort items by productId to prevent deadlocks when locking rows concurrently
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of sortedItems) {
        // 1. Lock the row (Pessimistic Locking)
        const products = await tx.$queryRawUnsafe<any[]>(
          `SELECT id, price, stock_quantity, is_deleted, name FROM "products" WHERE id = $1 FOR UPDATE`,
          item.productId
        );

        const product = products[0];

        if (!product || product.is_deleted) {
          throw new NotFoundError(`Product not found.`);
        }

        // 2. Validate stock quantity
        if (product.stock_quantity < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for product '${product.name}'. Requested: ${item.quantity}, Available: ${product.stock_quantity}`
          );
        }

        // 3. Deduct stock quantity atomically
        await tx.$executeRawUnsafe(
          `UPDATE "products" SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
          item.quantity,
          item.productId
        );

        const price = Number(product.price);
        totalAmount += price * item.quantity;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: price,
        });
      }

      // 4. Create the Order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      return order;
    });
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  },
};
