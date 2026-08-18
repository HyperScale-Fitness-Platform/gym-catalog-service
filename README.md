# Gym Catalog Service

Catalog service manages products for the gym e-commerce/inventory domain.

## Features

- Express API server
- PostgreSQL persistence via `pg`
- SQL-based migrations in `src/db/migrations`
- Local Docker Compose support for database setup
- Unit and integration tests with Jest + Supertest using `pg-mem`
- Kubernetes manifests for app deployment and PostgreSQL StatefulSet

## Local development

1. Install packages:

```bash
npm install
```

2. Copy example env file:

```bash
cp .env.example .env
```

3. Start local Postgres for development (docker-compose):

```bash
docker compose up -d
```

4. Apply migrations:

```bash
npm run migrate
```

5. Start the app:

```bash
npm run dev
```

API base: `http://localhost:3000/api/products`

## Tests

Run tests (uses `pg-mem` for in-memory DB):

```bash
npm test -- --runInBand
```

## Docker

Build the app image:

```bash
docker build -t gym-catalog-service .
```

Run the container with a database connection string:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/gym_catalog" \
  gym-catalog-service
```

## Kubernetes

Manifests are in `k8s/`.
