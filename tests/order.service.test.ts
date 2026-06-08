import "dotenv/config";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// 1. Define ESM mocks using unstable_mockModule BEFORE dynamic imports
jest.unstable_mockModule("../src/repositories/order.repository.js", () => ({
  orderRepository: {
    checkout: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/queues/email.queue.js", () => ({
  queueEmailJob: jest.fn(),
}));

jest.unstable_mockModule("../src/lib/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
  },
}));

// 2. Dynamically import the modules to get the mocked versions
const { orderService } = await import("../src/services/order.service.js");
const { orderRepository } = await import("../src/repositories/order.repository.js");
const { queueEmailJob } = await import("../src/queues/email.queue.js");
const { prisma } = await import("../src/lib/prisma.js");

describe("Order Service - Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder", () => {
    it("should process checkout, fetch details, and queue email job successfully", async () => {
      // Arrange
      const userId = "user-123";
      const email = "cust@example.com";
      const checkoutItems = [{ productId: "prod-1", quantity: 2 }];
      const orderInput = { items: checkoutItems };

      const mockOrder = {
        id: "order-123",
        userId,
        totalAmount: 179.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFullOrder = {
        ...mockOrder,
        user: { name: "Customer User", email },
        items: [
          {
            id: "item-1",
            productId: "prod-1",
            quantity: 2,
            priceAtPurchase: 89.99,
            product: { name: "Mechanical Keyboard", sku: "PROD-004" },
          },
        ],
      };

      // Set up mock implementations using jest.fn type assertion
      const mockCheckout = orderRepository.checkout as jest.Mock;
      const mockFindUnique = prisma.order.findUnique as jest.Mock;
      const mockQueueEmail = queueEmailJob as jest.Mock;

      mockCheckout.mockResolvedValue(mockOrder);
      mockFindUnique.mockResolvedValue(mockFullOrder);
      mockQueueEmail.mockResolvedValue(undefined);

      // Act
      const result = await orderService.createOrder(userId, email, orderInput);

      // Assert
      expect(mockCheckout).toHaveBeenCalledWith(userId, checkoutItems);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
        },
      });
      expect(mockQueueEmail).toHaveBeenCalledWith("order-confirmation", {
        orderId: mockOrder.id,
        email,
      });
      expect(result).toEqual(mockOrder);
    });
  });
});
