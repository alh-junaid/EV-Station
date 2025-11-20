# Environment variables for local development

This project uses environment variables to configure the server, Stripe, and the database.

Create a `.env` file in the project root (copy `.env.example`) with values for:

- NODE_ENV - development or production
- PORT - server port (defaults to 5000)
- STRIPE_SECRET_KEY - your Stripe secret key (server)
- VITE_STRIPE_PUBLIC - your Stripe publishable key (client)
- DATABASE_URL - Postgres connection string, used by Drizzle / your app
- SESSION_SECRET - random secret to sign session cookies

Example of starting the dev server in Windows (PowerShell):

```powershell
# Install dependencies
npm i

# Copy .env example
copy .env.example .env
# Edit .env to add your secrets

# Start dev server
npm run dev
```

Notes:
- The repository now includes an `.env.example` to make it easy to create a local `.env`.
- The `.env` file is added to `.gitignore` to prevent committing secrets.
- For production, use a managed secrets store and a persistent session store like Redis or Postgres.
- Stripe in INR: make sure your Stripe account supports `INR` and test with Stripe test keys first.
