import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminName = process.env.ADMIN_NAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error("Missing required environment variables: ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD");
  }

  console.log("Starting seeding process...");

  // 1. Seed Admin User
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log(`Admin user created: ${adminUser.email}`);
  } else {
    console.log(`Admin user already exists: ${existingAdmin.email}`);
  }

  // 2. Seed some initial products for testing
  const initialProducts = [
    {
      sku: "PROD-001",
      name: "Wireless Mouse",
      price: 25.99,
      stockQuantity: 100,
    },
    {
      sku: "PROD-002",
      name: "Mechanical Keyboard",
      price: 89.99,
      stockQuantity: 50,
    },
    {
      sku: "PROD-003",
      name: "Gaming Headset",
      price: 59.99,
      stockQuantity: 75,
    },
    {
      sku: "LIMITED-001",
      name: "Super Rare Limited Item",
      price: 999.99,
      stockQuantity: 1,
    },
  ];

  for (const product of initialProducts) {
    const existingProduct = await prisma.product.findFirst({
      where: { sku: product.sku },
    });

    if (!existingProduct) {
      const createdProduct = await prisma.product.create({
        data: {
          sku: product.sku,
          name: product.name,
          price: product.price,
          stockQuantity: product.stockQuantity,
        },
      });
      console.log(
        `Product seeded: ${createdProduct.name} (${createdProduct.sku})`,
      );
    } else {
      console.log(
        `Product already exists: ${existingProduct.name} (${existingProduct.sku})`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
