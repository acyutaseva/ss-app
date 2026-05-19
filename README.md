# Hare Krishan Sunday School Attendance App

Browser-based attendance system for Hare Krishan Sunday School with `admin` and `teacher` roles.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL

## Phase 1 Delivered
- Role-based login (`admin`, `teacher`)
- Student search screen
- Check-in and check-out endpoints
- Term aggregate attendance report (admin)
- Responsive modern UI for mobile/tablet/laptop

## Project Structure
- `backend/` API + PostgreSQL SQL schema
- `frontend/` React app

## Setup
1. Install dependencies
```bash
npm install
```
2. Create backend env file
```bash
cp backend/.env.example backend/.env
```
3. Create DB and run schema
```bash
createdb ss_app
psql -d ss_app -f backend/src/db/schema.sql
psql -d ss_app -f backend/src/db/seed.sql
```
4. Start both apps
```bash
npm run dev
```

5. Import students from registration CSV seed
```bash
cd backend
npx dotenv-cli -e .env -- sh -c 'psql "$DATABASE_URL" -f src/db/student-seed.sql'
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Default Login
- Admin: `admin@sundayschool.local` / `Admin@123`
- Teacher: `teacher1@sundayschool.local` / `Admin@123`

## Reset And Reseed Data
This removes all rows from app tables and inserts fresh seed data again.

```bash
cd backend
npm run db:reseed
```

Full reseed including student enrollments from CSV:

```bash
cd backend
npm run db:reseed:full
```

Individual commands:

```bash
cd backend
npm run db:reset
npm run db:seed
npm run db:student-seed
```

## Next Development Steps
1. Admin screens: manage students, guardians, teachers, groups.
2. Teacher group restriction in student queries.
3. Checkout modal with pickup type and conditional signature capture.
4. Attendance dashboard and export CSV.
5. PWA offline-first support for low-network Sundays.
