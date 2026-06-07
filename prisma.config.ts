import "dotenv/config";
import { env } from "process";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env["DATABASE_URL"],
  },
});
