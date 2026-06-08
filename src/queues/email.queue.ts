import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection as any,
});

export const queueEmailJob = async (jobName: string, data: { orderId: string; email: string }) => {
  await emailQueue.add(jobName, data, {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // 5 seconds initial delay
    },
  });
};
