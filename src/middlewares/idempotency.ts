import type { Request, Response, NextFunction } from "express";
import { redisConnection } from "../lib/redis.js";
import { BadRequestError, ConflictError } from "../utils/errors.js";

export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  // Only apply to POST requests
  if (req.method !== "POST") {
    return next();
  }

  const key = req.headers["x-idempotency-key"];

  if (!key) {
    return next(new BadRequestError("X-Idempotency-Key header is required for POST requests."));
  }

  if (typeof key !== "string") {
    return next(new BadRequestError("Invalid X-Idempotency-Key header format."));
  }

  const redisKey = `idempotency:${key}`;

  try {
    // Check if key already exists in Redis
    const cached = await redisConnection.get(redisKey);

    if (cached) {
      if (cached === "PROCESSING") {
        // Request is already being processed, conflict!
        return next(new ConflictError("A request with this idempotency key is currently being processed."));
      }

      // Return the cached response
      const cachedResponse = JSON.parse(cached);
      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }

    // Lock the key by setting it to "PROCESSING" with an expiry (5 minutes)
    await redisConnection.set(redisKey, "PROCESSING", "EX", 300);

    // Override res.json to capture the response and cache it
    const originalJson = res.json;

    res.json = function (body: any): Response {
      // Restore original json method
      res.json = originalJson;

      // Only cache successful or non-5xx responses to avoid caching transient server errors
      if (res.statusCode < 500) {
        const responseToCache = {
          statusCode: res.statusCode,
          body,
        };
        // Save to Redis with 24 hours TTL
        redisConnection.set(redisKey, JSON.stringify(responseToCache), "EX", 86400).catch((err) => {
          console.error("Failed to cache idempotency response in Redis:", err);
        });
      } else {
        // If it's a 5xx error, delete the key so the client can retry
        redisConnection.del(redisKey).catch((err) => {
          console.error("Failed to delete idempotency key from Redis on error:", err);
        });
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
