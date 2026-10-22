# ECOfleet — full stack waste operations

ECOfleet keeps the original operational lifecycle and role boundaries while replacing the Java/Swing/JDBC/MySQL implementation with the course stack: semantic HTML, responsive CSS, JavaScript, React, Node.js, Express REST APIs, MongoDB/Mongoose, Postman, Git/Jenkins, environment variables and Render deployment.

## Workflow contract

1. A generator signs in, submits a pickup request with one or more waste streams, a preferred date and notes, and may cancel a pending/planned request.
2. An operator reviews pending work and plans service routes. Requests stay attached to their generator and route; drivers see only assigned routes.
3. A driver starts each stop, records actual category weights on completion, or skips a stop with a reason.
4. An operator records verified disposal by route, facility, category and weight.
5. Admin/operator reports summarize status, recovered material, zone coverage and daily disposal. Admin manages zones, categories, vehicles, facilities and account activation.

Roles: ADMIN, OPERATOR, DRIVER, GENERATOR. API authorization is enforced server-side with expiring signed tokens.

## Local run

Requirements: Node.js 20+ and Docker Desktop (or another MongoDB 6+ server). Docker Compose is the easiest way to start the local database.

```sh
cp .env.example .env
docker compose up -d mongodb
npm install
npm run dev
```

Vite serves the React app at `http://localhost:5173`; Express runs at `http://localhost:5050` and serves `/api`. If an older `.env` still says `PORT=5000`, the server now switches to 5050 automatically on Mac. `npm run build` creates `client/dist`; `npm start` serves the built app and API from the same Render web service. MongoDB must be reachable before the server starts. Stop the database later with `docker compose down`.

The sign-in screen lets users select their account role; the API verifies the selected role against the authenticated account. Admins can create Operator and Driver accounts from Settings → Staff accounts. Generator organizations can register from the sign-in screen. New accounts are saved in MongoDB with a hashed password, sign in immediately after registration, and can sign in again later; their browser session is remembered for up to 12 hours. Demo users are seeded once into an empty database when `SEED_DEMO=true`. All demo accounts use `Password@123`:

| Username | Role |
|---|---|
| admin | ADMIN |
| operator1 | OPERATOR |
| driver1 | DRIVER |
| hospital_gen | GENERATOR |

Demo seed includes zones, six waste categories, generators, vehicles, disposal facilities and one pending mixed-waste request. For a real deployment set `SEED_DEMO=false` and provision credentials securely.

## API and Postman

Base path `/api`; login with `POST /auth/login`, then set `Authorization: Bearer <token>`. Import `postman/ECOfleet.postman_collection.json` into Postman. The collection includes health, login, dashboard, catalog, request list/create, route planning, routes, driver stop actions, disposal and reports.

Important endpoints:

- `GET /health` — server health (at `/api/health`)
- `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `GET /public/zones`
- `GET /dashboard`, `GET /catalog`, `GET /requests`, `POST /requests`, `PATCH /requests/:id/cancel`
- `POST /routes/plan`, `GET /routes`, `PATCH /routes/:routeId/stops/:stopId`
- `POST /disposals`, `GET /reports`
- `POST /admin/catalog/:type`, `GET /admin/users`, `PATCH /admin/users/:id/active`, `POST /files`, `POST /admin/notify`, `GET /diagnostics/url`

Uploads accept one file up to 5 MB. Email requires SMTP environment variables. API error responses use `{ "error": "..." }`.

## Syllabus evidence map

| Course concept | Where demonstrated |
|---|---|
| HTML5 semantics/forms | `client/index.html`, React form labels, required/min/date controls |
| CSS, Grid/Flexbox, mobile-first media queries | `client/src/styles.css` |
| JavaScript, DOM interaction, input safety | `client/src/components/`; constrained forms and React-escaped rendering |
| Node core, HTTP, URL routing, modules | Express server, modular router, `/api` endpoints |
| Events/files/uploads/email automation | Multer upload endpoint, filesystem rename, Nodemailer notification route |
| React components and hooks | `client/src/main.jsx`, `client/src/components/` |
| REST and Postman | `server/routes/api.js`, importable collection under `postman/` |
| MongoDB CRUD and relationships | Mongoose models and API; request-to-generator/category/route references |
| Aggregation and indexes | report aggregation pipelines; unique indexes on usernames, registration, zone/category names |
| Git / Jenkins | `.gitignore`, `Jenkinsfile` |
| Tomcat | Course is Node/Express; Tomcat is Java servlet container. Deployment runs on Node/Render. Jenkins CI configured for the actual project runtime. |
| Environment variables and Render | `.env.example`, `render.yaml`, deployment guide below |

MongoDB stores each request with embedded waste-stream quantities while ObjectId references connect users, generators, categories, vehicles, routes, stops, facilities and disposal records. Reports use MongoDB aggregation pipelines. This keeps multi-category requests intact and supports the original lifecycle.

## Render deployment

1. Push this directory to a Git repository.
2. Create a MongoDB Atlas database; allow Render egress (or use the provider's network access arrangement) and copy the connection string.
3. In Render create a Blueprint from `render.yaml` or create a Node web service with build `npm install && npm run build` and start `npm start`.
4. Set `MONGODB_URI`, `JWT_SECRET` (long random secret), `CLIENT_URL` (the deployed site origin), and `SEED_DEMO=false` for production. Optional email variables enable SMTP.
5. Deploy and verify `https://<service>.onrender.com/api/health`, then exercise login, requests, route actions, disposal and reports. Keep secrets in Render environment settings, never in Git.

## CI and verification

`Jenkinsfile` checks out the repo, installs dependencies, checks API syntax and runs the production Vite build. Use Node 20+ on the Jenkins agent. The API can be exercised via the provided Postman collection against local or deployed `/api` URL. MongoDB-backed end-to-end checks need a configured database.

For the course Tomcat lab, `npm run package:tomcat` packages the static React build as `target/ecofleet-frontend.war`. Deploy that WAR to local Tomcat; build with `VITE_API_BASE=http://localhost:5050` when Tomcat and Express run on separate origins. Tomcat serves the UI; Node/Express remains the API runtime.

## Understand and present the project

Start with [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md). It gives the exact five-minute walkthrough and explains how a click travels through React, Express and MongoDB. The UI is deliberately organized around the work stages so the demonstration stays easy to follow.
