import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { generateInvoicePDF } from "../utils/pdf.js";
import { emailService } from "../services/email.service.js";
import { logger } from "../utils/logger.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    const { orderId, email } = job.data;
    logger.info(`Processing email job for Order #${orderId}`);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!order) {
      logger.error(`Order #${orderId} not found. Skipping email job.`);
      return;
    }

    // Generate Invoice PDF
    const pdfPath = await generateInvoicePDF(order);

    // Send Email
    await emailService.sendOrderConfirmation(email, order, pdfPath);
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  logger.info(`Email job ${job.id} completed successfully.`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Email job ${job?.id} failed: ${err.message}`);
});
