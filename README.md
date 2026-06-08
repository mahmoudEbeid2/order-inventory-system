# Order & Inventory Management System

A robust, production-ready REST API built with Node.js, Express.js, TypeScript, PostgreSQL, and Redis. It handles asynchronous order processing, database transaction integrity, strict inventory concurrency controls, token-based authentication (JWT), and automated HTML/PDF invoice generation.

---

## Tech Stack
* **Runtime**: Node.js
* **Language**: TypeScript
* **Framework**: Express.js
* **Database**: PostgreSQL
* **ORM**: Prisma Client
* **Task Queues**: Redis & BullMQ
* **Validation**: Zod
* **Authentication**: JWT (Access & Refresh tokens)
* **Testing**: Jest & Supertest

---

## Features

* **Transactional Integrity**: Atomically updates order items and deducts product stock in a single transaction block.
* **Concurrency Control**: Implements **Pessimistic Locking (`SELECT ... FOR UPDATE`)** with sorted IDs to prevent deadlocks and stock race conditions during peak concurrent checkouts.
* **Idempotency Keys**: Utilizes a Redis-backed middleware supporting the `X-Idempotency-Key` header to prevent double-charging or duplicate order creation.
* **Rate Limiting**: Protects order endpoints against denial-of-service and brute force with `express-rate-limit`.
* **Asynchronous PDF & Email Invoice Generation**: Uses BullMQ background worker queues to compile a beautiful PDF invoice using `pdfkit` and send an HTML formatted email via `nodemailer` asynchronously without blocking the user request.
* **Soft Deletion**: Supports soft-deleted products so historical orders remain valid, while removing them from active product searches.
* **Database Indexing**: Indexes frequently filtered fields (`sku` on products, `status` on orders) and utilizes a partial unique index on product SKU to prevent duplicates of active products.

---

## Project Structure

Below is the directory structure of the application with a brief description of each key directory and file:

```text
order-inventory-system/
├── prisma/
│   ├── migrations/      # Auto-generated SQL migration files for database schema history
│   ├── schema.prisma   # Prisma schema file defining database tables, relationships, and indexes
│   └── seed.ts         # Seeding script to initialize the admin user and test products
├── src/
│   ├── controllers/    # Express controllers responsible for mapping incoming requests and returning HTTP responses
│   ├── docs/           # OpenAPI/Swagger paths, reusable component schemas, and bundled API docs
│   ├── dtos/           # Data Transfer Objects defining expected data shapes for requests and responses
│   ├── lib/            # Clients initialization for external services (Prisma Client, Redis Connection)
│   ├── middlewares/    # Custom middlewares for JWT authentication, role guards, Zod validation, rate limiting, and idempotency
│   ├── queues/         # BullMQ queue configurations to register and queue background email jobs
│   ├── repositories/   # Data-access abstraction layer executing queries and transactional database locking
│   ├── routes/         # Express router files mapping paths to specific middleware/controller handlers
│   ├── services/       # Core business logic handlers orchestrating repositories, validation, and queue triggers
│   ├── utils/          # Helper modules including PDF invoice builders, logger wrappers, custom error classes, and JWT tools
│   ├── validators/     # Zod validation schemas for request bodies, query params, and URL path variables
│   ├── views/          # External HTML email view templates rendered at runtime for invoices
│   ├── workers/        # BullMQ worker listeners processing invoice generation and email deliveries asynchronously
│   ├── app.ts          # Express application setup registering global middlewares and primary routers
│   └── server.ts       # Application entry point starting the HTTP server, database, and background workers
├── tests/
│   ├── order.integration.test.ts  # Integration test suite simulating high concurrent transaction requests
│   └── order.service.test.ts      # Unit tests using ESM mocked modules to verify service logic isolation
├── Dockerfile          # Multi-stage Docker configuration for development and production running
├── docker-compose.yml  # Orchestrates PostgreSQL, Redis, Worker, and API containers together
├── package.json        # Node dependency package and script definitions
└── tsconfig.json       # TypeScript compiler settings
```

---

## Handling Concurrency & Race Conditions

In high-volume systems, multiple users checking out the same product simultaneously can cause a race condition, leading to **overselling** (stock falling below zero).

### 1. Pessimistic Locking
To prevent this, the checkout operation uses Postgres **Pessimistic Locking**:
1. When checking out, a database transaction is started.
2. For each product in the order, we execute a raw SQL query:
   ```sql
   SELECT id, price, stock_quantity, is_deleted, name FROM "products" WHERE id = $1 FOR UPDATE
   ```
3. The `FOR UPDATE` clause locks the matching product row. Any other concurrent transaction attempting to read or update this row will block and wait until the first transaction commits or rolls back.

### 2. Deadlock Prevention
Locks must always be acquired in a deterministic order. If Transaction A locks Product 1 and tries to lock Product 2, while Transaction B locks Product 2 and tries to lock Product 1, a **deadlock** occurs.
We prevent this by sorting product IDs alphabetically before starting the locking loop:
```typescript
const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
```

---

## Setup Instructions

### Prerequisites
* [Docker & Docker Compose](https://www.docker.com/) installed on your machine.
* *Or locally: Node.js (v18+), PostgreSQL, and Redis.*

### 1. Configure Environment Variables
Copy the env variables to a `.env` file in the root directory:
```env
PORT=3000

# Database
POSTGRES_USER=orders_user
POSTGRES_PASSWORD=1234
POSTGRES_DB=orders_db
DATABASE_URL=postgresql://orders_user:1234@postgres:5432/orders_db?schema=public

# Redis (used by BullMQ)
REDIS_URL=redis://redis:6379

# Admin Seeding Credentials
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# JWT Secrets
JWT_ACCESS_SECRET=supersecretaccesskey123
JWT_REFRESH_SECRET=supersecretrefreshkey456
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email SMTP (e.g. Mailtrap)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password
```
*(Note: Change `localhost` to `postgres` and `redis` inside database and Redis URLs when running through Docker Compose).*

### 2. Running with Docker Compose (Recommended)
Build and run the entire application stack (API Server, PostgreSQL, Redis, and Background Worker):
```bash
docker compose up --build
```
This command automatically:
1. Pulls and starts Postgres and Redis.
2. Runs database migrations (`prisma migrate deploy`).
3. Seeds the database with the Admin User and initial products.
4. Starts the API server on `http://localhost:3000` and the BullMQ background worker.

### 3. Running Locally (Alternative)
Ensure local PostgreSQL and Redis services are running, then:
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Run in development mode
npm run dev
```

---

## API Documentation

Interactive API documentation is generated via Swagger/OpenAPI.
* **Swagger UI URL**: `http://localhost:3000/api/docs`

### Core Endpoints

#### Authentication
* `POST /api/auth/signup` - Register a new customer.
* `POST /api/auth/login` - Authenticate user and receive Access and Refresh JWT tokens.
* `POST /api/auth/refresh` - Refresh access token using a valid refresh token.

#### Products
* `GET /api/products` - Retrieve list of active products (paginated/filtered).
* `GET /api/products/archive` - Retrieve list of soft-deleted products (ADMIN only).
* `GET /api/products/:id` - Get details of a single product.
* `POST /api/products` - Create a new product (CUSTOMER only).
  * *Requires `X-Idempotency-Key` header.*
* `PUT /api/products/:id` - Update price or stock of a product (ADMIN only).
* `DELETE /api/products/:id` - Soft delete a product (ADMIN only).

#### Orders
* `POST /api/orders` - Checkout order and update stock atomically (ADMIN / CUSTOMER).
  * *Requires `X-Idempotency-Key` header.*
  * *Rate limited to 10 requests per minute per IP.*
* `GET /api/orders` - List all orders (paginated/filtered). Customers only see their own orders.

---

## Testing

Jest unit and integration tests are configured. The integration tests run concurrent race condition checks (10 concurrent checkouts checking atomic locks).

Run the tests using:
```bash
npm run test
```
