# Devices API

This project implements a RESTful API for managing device resources, built with TypeScript, Elysia, Drizzle ORM, and PostgreSQL, running in Docker containers.

## Project Overview

The API allows clients to perform CRUD operations on device resources. Each device has the following attributes:

*   **Id:** Unique identifier (auto-generated)
*   **Name:** Unique name of the device (string, min 5 chars)
*   **Brand:** Brand of the device (enum: 'Apple', 'Samsung', 'Google', 'Sony', 'Huawei')
*   **State:** Current state of the device (enum: 'available', 'in-use', 'inactive')
*   **Creation time:** Timestamp when the device was created (auto-generated)

## Features

*   Create a new device.
*   Fully update (replace) an existing device (PUT).
*   Partially update an existing device (PATCH).
*   Fetch a single device by its ID.
*   Fetch all devices.
*   Fetch devices filtered by brand.
*   Fetch devices filtered by state.
*   Delete a single device.

## Domain Rules

*   `createdAt` timestamp cannot be updated.
*   `name` and `brand` cannot be updated if the device `state` is 'in-use'.
*   Devices with `state` 'in-use' cannot be deleted.

## Technology Stack

*   **Framework:** [Elysia.js](https://elysiajs.com/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Runtime:** [Bun](https://bun.sh/)
*   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
*   **Database:** [PostgreSQL](https://www.postgresql.org/)
*   **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
*   **API Documentation:** [Swagger UI](https://swagger.io/tools/swagger-ui/) (via `@elysiajs/swagger`)
*   **Validation:** [Zod](https://zod.dev/)
*   **Testing:** [Vitest](https://vitest.dev/)

## Prerequisites

*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd devices-api
    ```

2.  **Set up Environment Variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file and provide the necessary values, especially for the database connection (though defaults are provided for local Docker setup).

3.  **Run the Application:**
    *   Use the provided script to start the application using Docker Compose. This script handles selecting the correct `.env` file based on the `NODE_ENV` variable (defaults to `.env` if `NODE_ENV` is not set).
        ```bash
        sh scripts/main_entry.sh
        ```
    *   To run with a specific environment file (e.g., `.env.production`), set the `NODE_ENV` variable:
        ```bash
        NODE_ENV="production" sh scripts/main_entry.sh
        ```
    *   The API will be available at `http://localhost:3000` (or the port specified in your `.env` file).
    *   The PostgreSQL database will be accessible on port `5432` (or the port specified).

4.  **Stopping the Application:**
    ```bash
    docker-compose down
    ```

## API Documentation

API documentation is automatically generated using Swagger UI and is available at:

`http://localhost:3000/swagger`

## Testing

Run the unit/integration tests using Vitest:

```bash
# Ensure dependencies are installed locally if needed (or run inside the container)
# bun install
bun run test
```

## Potential Improvements

This section outlines areas where the API could be further enhanced for robustness, maintainability, and performance:
*   **Centralized Validation Logic:**
    *   **Current:** Input validation occurs partially at the route definition level (e.g., `GET` query params, `paramsWithId`) and partially within controller methods using Zod's `safeParse` ([src/controllers/deviceController.ts#L91-L106](/src/controllers/deviceController.ts?range=91-106), [src/controllers/deviceController.ts#L153-L170](/src/controllers/deviceController.ts?range=153-170)). Domain-specific rules (like preventing `createdAt` updates) are also checked directly in the controller ([src/controllers/deviceController.ts#L107-L119](/src/controllers/deviceController.ts?range=107-119)).
    *   **Improvement:** Leverage Elysia's built-in validation more consistently by defining the Zod schemas (`createDeviceSchema`, `updateDeviceSchema`, `fullUpdateDeviceSchema`) directly in the `body` property of the respective route definitions (`.post`, `.patch`, `.put` in [`src/routes/devices.ts`](/src/routes/devices.ts)). This allows Elysia to handle parsing and basic validation automatically, potentially removing the need for manual `safeParse` calls in the controllers. Move domain-specific validation logic (e.g., checking if `name`/`brand` can be updated based on `state`, preventing `createdAt` updates) entirely into the `deviceService` ([`src/services/deviceService.ts`](/src/services/deviceService.ts)) to keep controllers focused on HTTP concerns and services focused on business rules.

*   **Enhanced Test Coverage:**
    *   **Current:** Unit tests exist for validation ([`tests/deviceValidation.test.ts`](/tests/deviceValidation.test.ts)), services ([`tests/deviceService.test.ts`](/tests/deviceService.test.ts)), and controllers ([`tests/deviceController.test.ts`](/tests/deviceController.test.ts)), primarily using mocking.
    *   **Improvement:**
        *   **Integration Tests:** Implement tests that connect to a dedicated test database to verify the Drizzle ORM integration and repository logic ([`src/repositories/deviceRepository.ts`](/src/repositories/deviceRepository.ts)) more realistically.
        *   **End-to-End (E2E) Tests:** Add tests using tools like `supertest` or Elysia's testing utilities to make HTTP requests to the running application, verifying the complete flow from request to response, including routing and middleware.
        *   **Edge Cases & Failures:** Increase coverage for error scenarios, race conditions, database connection issues, and complex domain rule interactions.
        *   **Coverage Reporting:** Configure Vitest (`bun run test --coverage`) to track code coverage and identify untested areas.

*   **Clearer Error Handling & Messaging:**
    *   **Current:** The check preventing `createdAt` updates exists in the PATCH controller ([src/controllers/deviceController.ts#L107-L119](/src/controllers/deviceController.ts?range=107-119)) but not explicitly in the PUT controller ([src/controllers/deviceController.ts#L167-L194](/src/controllers/deviceController.ts?range=167-194)). While the service layer throws an error for this in `updateDevice` ([src/services/deviceService.ts#L60-L74](/src/services/deviceService.ts?range=60-74)), the message might not be consistently propagated or handled. General error handling relies on checking error messages ([src/controllers/deviceController.ts#L134-L142](/src/controllers/deviceController.ts?range=134-142), [src/controllers/deviceController.ts#L182-L190](/src/controllers/deviceController.ts?range=182-190)).
    *   **Improvement:**
        *   Implement custom error classes (e.g., `NotFoundError`, `ValidationError`, `BusinessRuleError`, `ConflictError`) thrown by the service/repository layers.
        *   Refactor controller `catch` blocks to check `instanceof` these custom errors, allowing for more specific status code mapping (404, 400, 409) and structured error responses.
        *   Ensure the `createdAt` update check is consistently handled in the service layer for both PATCH and PUT operations, throwing a specific `BusinessRuleError` with a clear message like "The 'createdAt' field cannot be updated." The controller should catch this specific error and return a 400 response with that message.

*   **Pagination for `GET /devices`:**
    *   **Current:** The `GET /devices` endpoint retrieves all devices ([src/controllers/deviceController.ts#L48-L54](/src/controllers/deviceController.ts?range=48-54)).
    *   **Improvement:** Implement pagination using query parameters (e.g., `limit`, `offset` or `page`, `pageSize`) to handle potentially large datasets efficiently and prevent performance degradation. Update the `deviceService.getAllDevices` and `deviceRepository.findAll` methods accordingly.

*   **Security Considerations:**
    *   **Rate Limiting:** Implement rate limiting (e.g., using `@elysiajs/rate-limit`) to protect against brute-force attacks and API abuse.
    *   **Authentication/Authorization:** If the API needs user-specific access control, implement an authentication mechanism (e.g., JWT) and authorization checks.

*   **Observability:**
    *   **Request Tracing:** Add unique request IDs to logs to facilitate tracing requests across different services or components.
    *   **Monitoring:** Integrate metrics collection (e.g., Prometheus) and potentially distributed tracing (e.g., OpenTelemetry) for better monitoring and debugging in production.

*   **Database Migrations:**
    *   **Current:** Migrations are raw SQL files ([`drizzle/migrations/0002_create_indexes.sql`](/drizzle/migrations/0002_create_indexes.sql)).
    *   **Improvement:** Utilize Drizzle Kit more effectively to generate migration files based on schema changes (`src/db/schema.ts`), improving maintainability and reducing manual SQL writing errors. Implement a clear strategy for applying and potentially rolling back migrations in different environments.

*   **CI/CD Pipeline:**
    *   **Current:** Manual steps for setup and running tests.
    *   **Improvement:** Set up a CI/CD pipeline (e.g., GitHub Actions, GitLab CI) to automate linting, testing, building Docker images, and deploying the application.