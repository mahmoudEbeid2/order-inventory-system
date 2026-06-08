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

## Multi-Container Architecture

To ensure high availability, scalability, and separation of concerns, the application is designed using a **Multi-Container Architecture**:
* **API Server Container (`app`)**: Handles all incoming HTTP requests (auth, product catalog, order checkout, rate limiting, and idempotency checks).
* **Background Worker Container (`worker`)**: Dedicated entirely to processing background jobs queued via BullMQ (generating PDF invoices and sending order confirmation emails).
* **Database Container (`postgres`)**: Relational database storage with transactional locking and partial unique indexing.
* **Cache/Queue Store Container (`redis`)**: In-memory data store orchestrating the message queue (BullMQ) and storing idempotency keys.

This decoupling ensures that heavy background tasks (like PDF rendering and SMTP email dispatch) do not consume the API server's CPU/memory resources, keeping the HTTP response times sub-millisecond even during high background activity.

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
│   ├── server.ts       # Application entry point starting the HTTP server
│   └── worker.ts       # Application entry point starting the background worker process
├── scripts/
│   ├── start.sh        # Container startup script for the API server (runs migrations & seeds)
│   └── start-worker.sh # Container startup script for the background worker
├── tests/
│   ├── order.integration.test.ts  # Integration test suite simulating high concurrent transaction requests
│   └── order.service.test.ts      # Unit tests using ESM mocked modules to verify service logic isolation
├── .env.example        # Environment variables configuration template file
├── Dockerfile          # Multi-stage Docker configuration for development and production running
├── docker-compose.yml  # Orchestrates PostgreSQL, Redis, Worker, and API containers together
├── package.json        # Node dependency package and script definitions
└── tsconfig.json       # TypeScript compiler settings
```

---

## Entity Relationship Diagram (ERD)

The database schema contains the following relationships:
* **User & Order**: A user can place multiple orders (`1-to-many` relationship, user is optional in order context).
* **Order & OrderItem**: An order contains one or more line items (`1-to-many` relationship, required for order).
* **Product & OrderItem**: A product can be referenced in multiple order items (`1-to-many` relationship, optional for product).

### Interactive Mermaid ERD

```mermaid
erDiagram
    User ||--o{ Order : "places"
    Product ||--o{ OrderItem : "contains"
    Order ||--|{ OrderItem : "contains"

    User {
        string id PK
        string name
        string email UK
        string password
        Role role
        string resetToken
        datetime createdAt
        datetime updatedAt
    }

    Product {
        string id PK
        string sku UK
        string name
        decimal price
        int stockQuantity
        boolean isDeleted
        datetime createdAt
        datetime updatedAt
    }

    Order {
        string id PK
        string userId FK
        OrderStatus status
        decimal totalAmount
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        int quantity
        decimal priceAtPurchase
    }
```

### Visual Diagram

<img src="./erd.png" alt="Entity Relationship Diagram" width="100%" />

---

## Docker Multi-Container Architecture & Entry Points

The Docker environment is configured to run the application in a highly decoupled, production-grade **Multi-Container Architecture** with separate entry points and startup flows:

### 1. Separate Entry Points
To achieve true decoupling, the codebase has two independent entry points:
* **API Server Entry Point ([src/server.ts](file:///E:/New%20folder%20(3)/order-inventory-system/src/server.ts))**: Boots up the Express.js application, listens on port `3000`, and handles HTTP traffic.
* **Background Worker Entry Point ([src/worker.ts](file:///E:/New%20folder%20(3)/order-inventory-system/src/worker.ts))**: Imports the background BullMQ worker configuration and starts listening to the Redis job queues. It does not run an HTTP server.

### 2. Isolated Container Startup Flows
To coordinate startup tasks (like Prisma client generation, migrations, and seeding) in a containerized environment safely:
* **API Container Startup ([scripts/start.sh](file:///E:/New%20folder%20(3)/order-inventory-system/scripts/start.sh))**:
  1. Runs `npx prisma generate` to build the Prisma Client.
  2. Runs `npx prisma migrate deploy` to safely apply database schema updates.
  3. Runs `npx prisma db seed` to initialize seed data.
  4. Starts the API server (`npm run dev` or `npm start`).
* **Worker Container Startup ([scripts/start-worker.sh](file:///E:/New%20folder%20(3)/order-inventory-system/scripts/start-worker.sh))**:
  1. Runs `npx prisma generate` to build the Prisma Client.
  2. Starts the background worker listener (`npm run dev:worker` or `npm run start:worker`).
  * *Note: The worker container does not run migrations or seeding scripts to prevent race conditions during parallel container startups.*

### 3. Docker Compose Orchestration
The environment is orchestrated using multi-stage builds (`Dockerfile`) and Docker Compose:
* **`app` Service**: Uses `Dockerfile` target `production`/`development` and boots via `scripts/start.sh` exposing port `3000`.
* **`worker` Service**: Uses the same built image but overrides the default command to use `scripts/start-worker.sh` to run the worker code separately.
* **`postgres` & `redis` Services**: Provide isolated relational data and caching layers.

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

## Soft Delete & Conditional Uniqueness

### The Conflict: Unique Constraints and Soft Deletes
The specifications dictate that:
1. Product **SKU** must be unique (`Unique, alphanumeric`).
2. Products must support **Soft Delete** (`isDeleted`) so that they remain in the database for historical order auditing, but are hidden from active searches and catalog listings.

Under a standard SQL unique constraint, soft-deleting a product with `SKU-A` blocks anyone from creating a new product with `SKU-A` in the future. The database will throw a unique constraint violation because the deleted row still occupies that SKU.

### The Solution: Partial Unique Index
To resolve this, we implemented a **Partial Unique Index** (Conditional Index) at the PostgreSQL database level (migration `20260608072700_add_partial_index`):
```sql
CREATE UNIQUE INDEX products_sku_active_key 
ON "products"("sku") 
WHERE "is_deleted" = false;
```
This architecture ensures:
* SKU uniqueness is enforced **only** among active products (`is_deleted = false`).
* When a product is soft-deleted, its SKU is instantly freed up, allowing a new active product to use it.
* Historical orders continue to link safely to the soft-deleted product ID.
* If a duplicate active SKU is attempted, PostgreSQL throws a code `P2002` error, which our global error handler captures and returns as a standard `409 Conflict` response.

---

## Why Database Seeding is Implemented

A database seeding script ([prisma/seed.ts](file:///E:/New%20folder%20(3)/order-inventory-system/prisma/seed.ts)) runs automatically on startup:
1. **Default Admin Account**: Generates a default administrator (`admin@example.com` / `admin123`) so you can authenticate role guards, manage catalog items, and view all system orders.
2. **Initial Test Products**: Generates initial catalog products with standard prices and stock quantities.
3. **Concurrency Test SKU**: Seeds a rare product with exactly `1` stock item (`LIMITED-001`) specifically for concurrent race-condition integration tests.

---

## Setup Instructions & Container Environment

This project utilizes a fully containerized setup using a multi-stage Docker build to separate development configurations (live reloading, source mounts) from production configurations (minimal assets, pre-compiled JavaScript).

### 1. Docker Compose Environments Overview

We support three Docker Compose orchestration configurations:

* **`docker-compose.yml` (Base Config)**:
  Defines the primary infrastructure services (`postgres` for database and `redis` for queues) and base settings for `app` (API server) and `worker` (background BullMQ worker).
* **`docker-compose.dev.yml` (Development Extension)**:
  Mounts the local `./src` directory directly into the containers. This allows changes in your local TypeScript files to trigger nodemon inside the container, hot-reloading the app and the worker immediately without having to rebuild the images. It targets the `development` stage of the Dockerfile.
* **`docker-compose.prod.yml` (Production Extension)**:
  Targets the minimal `production` stage in the Dockerfile, which omits dev dependencies, copies pre-compiled JavaScript from the builder stage, and executes the server/worker using native Node.

---

### 2. Configure Environment Variables

Create a `.env` file in the root directory and copy the following configuration:
```env
PORT=3000

# Database Connection (Prisma & Postgres)
POSTGRES_USER=orders_user
POSTGRES_PASSWORD=1234
POSTGRES_DB=orders_db
# Use "postgres" as host when running in Docker, "localhost" when running locally
DATABASE_URL=postgresql://orders_user:1234@postgres:5432/orders_db?schema=public

# Redis Connection (BullMQ & Idempotency)
# Use "redis" as host when running in Docker, "localhost" when running locally
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

# Email SMTP Credentials (e.g., Mailtrap)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password
```

---

### 3. Running with Docker Compose (Preferred)

#### Development Mode (With Hot-Reload & Local Mounts)
To start Postgres, Redis, the API server, and the background worker with live source code reloading:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
*   The API server will be available on `http://localhost:3000`.
*   Local changes to any file in `src/` will automatically reload the server and/or worker processes.

#### Production Mode
To start the production-grade minimal containers:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

#### Container Startup Orchestration
When launching Docker Compose:
1.  **PostgreSQL** container boots up and reports its health status via `healthcheck`.
2.  **Redis** container starts up.
3.  **`app` Service Container** starts after PostgreSQL is healthy. It runs `scripts/start.sh` which executes `npx prisma generate` (client generation), `npx prisma migrate deploy` (migration updates), `npx prisma db seed` (seeding the admin user and test data), and starts the Express server.
4.  **`worker` Service Container** starts and runs `scripts/start-worker.sh` which executes `npx prisma generate` and starts the BullMQ queue worker to wait for jobs.

---

### 4. Running Locally (Alternative)

If you have PostgreSQL and Redis installed and running locally, you can run the application using native npm scripts:

#### Installation
```bash
npm install
```

#### Database Migrations & Seeding
```bash
# Apply migrations local database
npx prisma migrate dev

# Seed database with admin user and test catalog
npx prisma db seed
```

#### Running Services
*   **Run API Server (Development)**: `npm run dev` (runs nodemon/tsx)
*   **Run Background Worker (Development)**: `npm run dev:worker`
*   **Run API Server (Production)**:
    ```bash
    npm run build
    npm start
    ```
*   **Run Background Worker (Production)**:
    ```bash
    npm run build
    npm run start:worker
    ```

#### Export Documentation & Postman Collection
```bash
npm run docs:export
```

#### Running Tests (Jest)
```bash
npm run test
```

---

## API Documentation & Refactoring Architecture

Instead of maintaining a single monolithic OpenAPI/Swagger file which becomes complex and error-prone, this project implements a **modular documentation structure** for clean separation of concerns and high readability.

### 1. Documentation Structure & Design

The API specifications under `src/docs` are organized as follows:
* **`swagger.yaml`**: The primary entry point containing general API metadata, server paths, global security configurations, and the entry registry of components.
* **`paths/`**: Modular directory where each file defines path routers for specific domains:
  - `auth.signup.yaml`, `auth.login.yaml`, `auth.refresh.yaml` for credentials.
  - `products.yaml` for listing/creating products, `products.archive.yaml` for soft-deleted archives, and `products.detail.yaml` for item details, updates, and deletes.
  - `orders.yaml` for order creations and paginated list details.
* **`components/`**: Modular schemas directory containing reusable wrappers and domain objects:
  - Domain objects: `product.yaml`, `order.yaml`.
  - Pagination wrappers: `paginated.products.yaml`, `paginated.orders.yaml`.
  - Success response wrappers: `single.product.yaml`, `single.order.yaml`, `auth.response.yaml`, `success.yaml`.
  - Common error format: `error.yaml`.

This ensures that endpoints automatically reference the exact same underlying schemas, making additions, modifications, and consistency checks extremely easy.

### 2. Bundling and Postman Export

To automate the compilation and validation of modular specifications, the project uses `@redocly/cli` to bundle the files into a single Swagger YAML schema, and then automatically exports it as a clean Postman Collection using `openapi2postmanv2`.

#### Export Script
To compile and regenerate the documentation artifacts, execute:
```bash
npm run docs:export
```
This runs:
1. `redocly bundle src/docs/swagger.yaml -o src/docs/bundled.yaml`: Combines all modular path and component references into a single self-contained OpenAPI file at [src/docs/bundled.yaml](file:///E:/New%20folder%20(3)/order-inventory-system/src/docs/bundled.yaml).
2. `openapi2postmanv2 -s src/docs/bundled.yaml -o src/docs/postman_collection.json ...`: Converts the bundled specification into a fully-configured Postman Collection file at [src/docs/postman_collection.json](file:///E:/New%20folder%20(3)/order-inventory-system/src/docs/postman_collection.json). You can import this file directly into Postman to instantly test all API routes, request bodies, and headers (including `X-Idempotency-Key` and JWT Bearer authorization tokens).

#### Manual Setup (Optional)
If you want to use the CLI tools globally on your machine, you can install them using:
```bash
npm install -g @redocly/cli openapi2postmanv2
```

### 3. Core Endpoints Overview
Interactive API documentation is served directly by the Express application:
* **Swagger UI URL**: `http://localhost:3000/api/docs`

#### Endpoint Summary
* **Authentication**:
  - `POST /api/auth/signup` - Customer registration.
  - `POST /api/auth/login` - Receives Access & Refresh JWT tokens.
  - `POST /api/auth/refresh` - Issue new access tokens.
* **Products**:
  - `GET /api/products` - Retrieve active catalog (paginated & filtered).
  - `GET /api/products/archive` - Retrieve soft-deleted product list (ADMIN only).
  - `GET /api/products/:id` - Fetch single active product details.
  - `POST /api/products` - Add new product (ADMIN only, requires `X-Idempotency-Key`).
  - `PUT /api/products/:id` - Update catalog price/stock (ADMIN only).
  - `DELETE /api/products/:id` - Soft delete a catalog item (ADMIN only).
* **Orders**:
  - `POST /api/orders` - Atomic checkout transaction (CUSTOMER only, rate-limited, requires `X-Idempotency-Key`).
  - `GET /api/orders` - Filtered & paginated order histories (ownership enforced).

---

## Testing

Jest unit and integration tests are configured. The integration tests run concurrent race condition checks (10 concurrent checkouts checking atomic locks).

Run the tests using:
```bash
npm run test
```
