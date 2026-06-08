import { prisma } from "../lib/prisma.js";
import { PrismaFeatures } from "../utils/prismaFeatures.js";
import { orderRepository } from "../repositories/order.repository.js";
import { queueEmailJob } from "../queues/email.queue.js";
import type { CreateOrderInputDTO } from "../dtos/order.dto.js";

export const orderService = {
  async createOrder(userId: string, email: string, data: CreateOrderInputDTO) {
    // 1. Process order checkout with database transaction and pessimistic locks
    const order = await orderRepository.checkout(userId, data.items);

    // 2. Query full order details with user information to ensure correct email contents
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
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

    // 3. Queue the background email worker job
    if (fullOrder) {
      await queueEmailJob("order-confirmation", {
        orderId: fullOrder.id,
        email: email,
      });
    }

    return order;
  },

  async getOrders(userId: string, userRole: string, queryParams: any) {
    // Separate custom range/amount filters from standard exact filters
    const { minAmount, startDate, endDate, ...standardParams } = queryParams;

    const query = new PrismaFeatures(prisma.order, standardParams);

    // 1. Enforce ownership: customers can only see their own orders
    query.queryOptions.where = {
      ...query.queryOptions.where,
    };
    if (userRole !== "ADMIN") {
      query.queryOptions.where.userId = userId;
    }

    // 2. Apply standard filters (like status), search, sort, and pagination
    query.filter();
    query.sort();
    query.paginate();

    // 3. Apply custom minimum amount range filter
    if (minAmount) {
      query.queryOptions.where.totalAmount = {
        gte: parseFloat(minAmount),
      };
    }

    // 4. Apply custom date range filter
    if (startDate || endDate) {
      query.queryOptions.where.createdAt = {};
      if (startDate) {
        query.queryOptions.where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        query.queryOptions.where.createdAt.lte = new Date(endDate);
      }
    }

    // 5. Eager load items and products details
    query.queryOptions.include = {
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
    };

    const result = await query.exec();

    return result;
  },
};
