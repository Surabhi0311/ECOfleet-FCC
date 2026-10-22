# ECOfleet demo guide

## Start the project

1. Open a terminal in the `ECOfleet` folder.
2. Start MongoDB. With Docker installed, run `docker compose up -d mongodb`.
3. Copy the environment template once: `cp .env.example .env`.
4. Install packages once: `npm install`.
5. Start the app: `npm run dev`.
6. Open `http://localhost:5173`. Express serves the API at `http://localhost:5050/api`. Port 5000 is avoided because macOS may reserve it for Control Center.

If the browser reports an unreadable API response, look in the terminal where the app is running. Make sure MongoDB started first, then stop and restart `npm run dev`.

## Five-minute walkthrough

### 1. Show a generator request

Sign in as `hospital_gen` with `Password@123`. Open **Pickup requests**, choose **New request**, add an Organic and a Recyclable waste stream, and submit. Point out the request is saved in MongoDB with its generator, date, and list of waste streams.

### 2. Plan a route

Sign out. Sign in as `operator1` with `Password@123`. Open **Route planning** and choose **Generate routes**. The API groups requests by zone and checks the vehicle capacity before saving routes and ordered stops.

### 3. Record collection

Sign out. Sign in as `driver1` with `Password@123`. Open **My routes**. For a stop, select **Arrived**, then **Complete and record weight**. Enter the real collected weights when prompted. The request moves to Collected.

### 4. Record disposal

Sign out and sign in as `operator1`. Open **Disposal**. Select the completed route, GreenCycle Recovery, and the matching material category. Save the received weight. The facility accepts Organic, Recyclable, and General waste.

### 5. Show the result

Open **Reports**. The charts are intentionally simple tables. They are computed from MongoDB records, so the request status and disposed material now reflect the work you just demonstrated.

## Explain how the code works

- `client/src/main.jsx` controls sign-in, navigation, and reloads the data shown on screen.
- `client/src/api.js` sends requests to Express and includes the sign-in token.
- `client/src/components/` contains a small component for each screen.
- `server/routes/api.js` checks role permissions and handles each user action.
- `server/models/index.js` defines the MongoDB collections and their references.
- `server/index.js` connects to MongoDB, seeds demo data in an empty database, then starts Express.

A screen submits a REST request; Express validates the action and role; Mongoose reads or updates MongoDB; Express returns JSON; React refreshes the screen. For example:

`New request button → POST /api/requests → PickupRequest model → MongoDB → refreshed request list`

## Demo accounts

All seeded users use password `Password@123`:

| Username | Role | Main screen to show |
|---|---|---|
| `hospital_gen` | Generator | Pickup requests |
| `operator1` | Operator | Route planning, disposal, reports |
| `driver1` | Driver | My routes |
| `admin` | Admin | All sections and system settings |
