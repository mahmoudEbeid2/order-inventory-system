import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "../src/lib/prisma.js";
import { orderRepository } from "../src/repositories/order.repository.js";
import { BadRequestError } from "../src/utils/errors.js";
import { redisConnection } from "../src/lib/redis.js";

describe("Order Transaction - Integration Tests (Race Conditions & Concurrency)", () => {
  let testUser: any;
  let testProduct: any;

  beforeAll(async () => {
    // 1. Create a test user for integration testing
    testUser = await prisma.user.create({
      data: {
        name: "Concurrency Test User",
        email: `concurrency-${Date.now()}@example.com`,
        password: "password123",
      },
    });

    // 2. Create a test product with exactly 5 stock
    testProduct = await prisma.product.create({
      data: {
        sku: `CONC-SKU-${Date.now()}`,
        name: "Concurrent Test Product",
        price: 99.99,
        stockQuantity: 5,
      },
    });
  });

  afterAll(async () => {
    // Clean up created test data
    await prisma.orderItem.deleteMany({
      where: { productId: testProduct.id },
    });
    await prisma.order.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.product.delete({
      where: { id: testProduct.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
    // Close Redis connection to allow Jest to exit cleanly
    await redisConnection.quit();
  });

  it("should handle 10 concurrent requests for a product with 5 stock: 5 succeed, 5 fail, and stock is exactly 0", async () => {
    const concurrentRequestsCount = 10;
    const itemsToBuy = [{ productId: testProduct.id, quantity: 1 }];

    // Trigger 10 checkouts concurrently
    const promises = Array.from({ length: concurrentRequestsCount }).map(() =>
      orderRepository.checkout(testUser.id, itemsToBuy)
    );

    const results = await Promise.allSettled(promises);

    // Count successes and failures
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    console.log(`Successes: ${successes.length}, Failures: ${failures.length}`);

    // Assertions
    expect(successes.length).toBe(5);
    expect(failures.length).toBe(5);

    // Assert that the failures were indeed due to insufficient stock
    failures.forEach((failure) => {
      expect(failure.status).toBe("rejected");
      const reason = (failure as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(BadRequestError);
      expect(reason.message).toContain("Insufficient stock");
    });

    // Fetch product stock from database to verify it is exactly 0
    const updatedProduct = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });

    expect(updatedProduct?.stockQuantity).toBe(0);
  });

  it("should handle 10 concurrent requests for a product with stock 1: exactly 1 succeeds, 9 fail, and stock is exactly 0", async () => {
    // Create a temporary test product with stock 1
    const testProductLimit1 = await prisma.product.create({
      data: {
        sku: `CONC-LIMIT-${Date.now()}`,
        name: "Super Rare Concurrency Test Product",
        price: 499.99,
        stockQuantity: 1,
      },
    });

    const concurrentRequestsCount = 10;
    const itemsToBuy = [{ productId: testProductLimit1.id, quantity: 1 }];

    // Trigger 10 checkouts concurrently
    const promises = Array.from({ length: concurrentRequestsCount }).map(() =>
      orderRepository.checkout(testUser.id, itemsToBuy)
    );

    const results = await Promise.allSettled(promises);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    console.log(`[Limit 1 Stock] Successes: ${successes.length}, Failures: ${failures.length}`);

    // Assertions
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(9);

    failures.forEach((failure) => {
      const reason = (failure as PromiseRejectedResult).reason;
      expect(reason.message).toContain("Insufficient stock");
    });

    const updatedProduct = await prisma.product.findUnique({
      where: { id: testProductLimit1.id },
    });
    expect(updatedProduct?.stockQuantity).toBe(0);

    // Cleanup the test data for this product
    await prisma.orderItem.deleteMany({ where: { productId: testProductLimit1.id } });
    await prisma.product.delete({ where: { id: testProductLimit1.id } });
  });
});
