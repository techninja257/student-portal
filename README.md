# Student Portal

A minimal web application for managing and distributing student academic results.

## Features
- Admin manages departments, levels, semesters, and students
- Admin uploads PDF results tagged to specific students and semesters
- Students log in via email + OTP (passwordless authentication)
- Students view and download their uploaded results
- Student profile photos
- Searchable student selection for result uploads
- Paginated admin tables

## Tech Stack
- **Backend:** Node.js, Express, PostgreSQL (Supabase)
- **Frontend:** React, Vite, Tailwind CSS
- **Storage:** Cloudinary (PDFs + profile photos)
- **Email:** Resend (OTP delivery)
- **Hosting:** Render (API) + Vercel (Frontend)

## Local Development

### Prerequisites
- Node.js 18+
- Supabase account (free)
- Cloudinary account (free)
- Resend account (free)

### Setup
1. Clone the repo
2. Copy env files:
   ```
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
3. Fill in `server/.env` with your credentials
4. Install dependencies:
   ```
   cd server && npm install
   cd ../client && npm install
   ```
5. Run migrations and seed:
   ```
   cd server
   npm run migrate
   npm run seed
   ```
6. Start development:
   ```
   # Terminal 1:
   cd server && npm run dev
   # Terminal 2:
   cd client && npm run dev
   ```
7. Open http://localhost:5173

### Default Admin
- Email: admin@portal.com
- Password: admin123
- ⚠️ Change this before deploying to production!

## Deployment

### Backend (Render)
1. Push to GitHub
2. Create new Web Service on Render
3. Connect repo, set root directory to `server`
4. Build: `npm install && npm run migrate && npm run seed`
5. Start: `npm start`
6. Add environment variables (DATABASE_URL, JWT_SECRET, etc.)

### Frontend (Vercel)
1. Import repo on Vercel
2. Set root directory to `client`
3. Add `VITE_API_URL` environment variable pointing to your Render URL
4. Deploy

## Environment Variables

### Server
| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| DATABASE_URL | Supabase PostgreSQL connection string |
| JWT_SECRET | Secret key for JWT signing |
| RESEND_API_KEY | Resend API key for OTP emails |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Cloudinary API key |
| CLOUDINARY_API_SECRET | Cloudinary API secret |
| CLIENT_URL | Frontend URL for CORS |

### Client
| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend API URL |
