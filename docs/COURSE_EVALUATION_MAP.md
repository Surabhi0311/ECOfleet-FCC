# Course evaluation walkthrough

Use this sequence in a live evaluation to show the full syllabus stack in one project.

1. **Responsive UI (CO1/CO2):** Open the app at desktop and narrow/mobile widths. Inspect semantic HTML entry point, React components/hooks, forms, validation, CSS Grid/Flexbox and media queries.
2. **Authentication:** Sign in with `admin / Password@123`; demonstrate role-specific navigation and server-side permissions. Then sign in as `hospital_gen` and submit/cancel a multi-category request.
3. **REST APIs (CO3):** Import `postman/ECOfleet.postman_collection.json`, run Login, then dashboard/catalog/request/route/report requests with the saved bearer token.
4. **MongoDB (CO4):** Show the `users`, `generators`, `pickuprequests`, `routes`, `vehicles`, `facilities`, and `disposalrecords` collections. Explain the ObjectId references, embedded multi-category request items, unique indexes, and report aggregation queries.
5. **Unchanged operations flow:** As operator plan the request; as assigned driver arrive, complete with actual weights or skip with a reason; as operator record approved facility disposal; review operational reports.
6. **Node features:** Use `POST /api/files` with multipart form data; show `GET /api/diagnostics/url` for the Node URL module, explain route modules and filesystem storage. Configure SMTP variables and demonstrate `POST /api/admin/notify` if mail service is available.
7. **Git/Jenkins:** Push to Git and show `Jenkinsfile` installing dependencies, checking API syntax, and producing a Vite production build.
8. **Tomcat:** `scripts-tomcat.sh` packages the React static frontend as a WAR to demonstrate Tomcat static hosting. The Node/Express REST backend remains a separate service and the web client uses `VITE_API_BASE` to reach it.
9. **Render (CO5):** Deploy using `render.yaml`, set Atlas URI and `JWT_SECRET` in service environment, then verify `/api/health` and perform the workflow against the live URL.

The supplied course outline includes Tomcat setup in the DevOps lab, while its stated full-stack outcomes specify Node/Express and Render. This project uses Tomcat only for the optional static frontend demonstration; the API stays in the required Node/Express stack.

## Git, MongoDB Atlas and deployment notes

- Keep `main` as the release branch and create feature branches for API/UI work; Jenkins can be triggered on pushes or pull requests through the configured repository webhook.
- For the database demo, show the Atlas cluster connection URI in Render's protected environment settings (never expose its credentials in the app or Postman). Atlas handles the managed cluster's storage and replication; ECOfleet uses Mongoose and aggregation pipelines against that cluster.
- The Render service is the evaluated live deployment. The Tomcat WAR is an optional local lab artifact for demonstrating the unit's Tomcat setup alongside the project’s Node runtime.
