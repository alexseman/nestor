### Installation

-   `docker compose build`
-   `docker compose up`
-   (entering the API container) `docker exec -it nestor_api sh`
-   `cd /app`
-   `cp .env.example .env`
-   `npm run build`
-   `npm run db:migrations:up`
-   `chmod -R +x dist/database/seeders/`
-   `npm run db:seed`
-   `npm run dev`

### Remaining:

-   ~~endpoint for "All the persons under a group, including all the groups
    under that group, with the ability to filter by job title or first name."~~;
-   ~~caching for "GET" "/api/groups";~~
-   ~~unified API response;~~
-   ~~employment of logger;~~
-   ~~DB seeding;~~
-   ~~job title for persons;~~
-   API docs (w/ `swagger-ui-express`);
-   E2E tests for endpoints (w/ `supertest`);
-   project is too in "development" mode (e.g.: Dockerfile for API);
-   GH pipeline;
-   abstract persons & group DB insertion so same functionality can be used by both the repositories & seeders;
-   soft delete;
-   instead of cascade person delete upon group delete: if group is not root
    assign persons to parent group;
-   Git hook for committing only when linting rules pass; 
