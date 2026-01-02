# Neights of Thunder ⚡🐴

A browser-based multiplayer horse racing autobattler built with Next.js, TypeScript, and WebSockets.

## Project Status

**Current Phase:** Initial Setup Complete

### Completed ✅
- Next.js 14+ project initialized with App Router
- TypeScript configuration
- Tailwind CSS setup
- Development tools installed (Biome, Vitest, Playwright, tsx, Zod)
- Prisma schema created with PostgreSQL
- Project structure established
- Docker setup for local development (app + database)
- Docker Compose configurations (full stack & database-only)
- Custom WebSocket server with native WebSocket support
- Game room management with 4-letter friend codes for private lobbies
- Zod message schemas for type-safe client/server communication
- 5 custom Claude Code skills for development efficiency
- **Race simulation engine** with all PRD stat formulas:
  - Derived stats calculation (base speed, stamina pool, burn rate, etc.)
  - Consistency formula (Temper/Weight interaction)
  - Strategy modifiers (burst, sprint, conserve, etc.)
  - Terrain and surface effects
  - Obstacle handling and stumble mechanics
  - Deterministic simulation (same seed = same result)
  - Comprehensive unit tests (all passing ✅)

### Planned 📋
- Frontend UI components
- NextAuth authentication
- Game logic implementation
- Digital Ocean deployment

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Rendering:** Pixi.js (for race animations)
- **Backend:** Custom Next.js server with native WebSockets
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (credentials provider)
- **State:** Zustand
- **Testing:** Vitest (unit), Playwright (E2E)
- **Tools:** Biome (linting), Zod (validation), Pino (logging)

## Project Structure

```
horse-racer/
├── .claude/
│   ├── skills/            # Custom Claude Code skills
│   └── plans/             # Implementation plans
├── app/                    # Next.js app router pages
├── components/             # React components
├── lib/                    # Shared utilities
├── game/                   # Game logic
│   ├── data/              # Horse/jockey/equipment data
│   └── simulation/        # Race simulation engine
├── server/                # WebSocket server and game rooms
├── types/                 # TypeScript type definitions
├── prisma/                # Database schema
├── public/
│   ├── sprites/           # Pixi.js sprite assets
│   └── audio/             # Sound effects
└── tests/
    ├── unit/              # Vitest unit tests
    └── e2e/               # Playwright E2E tests
```

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended) OR
- Node.js 18+ and PostgreSQL (for manual setup)

### Installation

#### Option 1: Using Docker (Recommended)

This runs both the app and database in containers:

```bash
# Start all services
docker-compose up

# In another terminal, run migrations
docker-compose exec app npx prisma db push

# Open browser to http://localhost:3000
```

#### Option 2: Database in Docker, App Locally

This is ideal for development - database in Docker, hot reload on your machine:

```bash
# Start only the database
docker-compose -f docker-compose.db.yml up -d

# Install dependencies
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

#### Option 3: Fully Local (No Docker)

1. **Install PostgreSQL** and create a database named `neights_of_thunder`

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

4. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
npm run dev          # Start development server with WebSocket
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Biome linter
npm run lint:fix     # Fix linting issues
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run type-check   # TypeScript type checking
```

## Environment Variables

Create `.env` based on `.env.example`.

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Public base URL (e.g. `https://yourdomain.com`)
- `NEXTAUTH_SECRET`: 32+ byte secret
- `NODE_ENV`: `production` in prod
- `PORT`: Server port (defaults to `3000`)

## Architecture Notes

- Custom Node server (`server.ts`) runs Next.js and a WebSocket server at `/ws`.
- WebSockets are proxied through Nginx with `Upgrade` headers enabled.
- Health check endpoint: `GET /api/health`.

## Deployment (DigitalOcean + PM2 + Nginx)

### One-time server bootstrap

1. **Create droplet** (Ubuntu 22.04 recommended) and add your SSH key.
2. **Install system deps**:
   ```bash
   sudo apt update
   sudo apt install -y git nginx certbot python3-certbot-nginx
   ```
3. **Install Node.js 20** (example using NodeSource):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```
5. **Clone repo** and install app dependencies:
   ```bash
   git clone git@github.com:YOUR_ORG/horse-racer.git
   cd horse-racer
   npm ci
   ```
6. **Create `.env`** (use `.env.example` as a guide). Make sure `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` are set.
7. **Set up Nginx**:
   - Copy `nginx.conf` into `/etc/nginx/sites-available/neights-of-thunder`
   - Replace `yourdomain.com` with your domain
   - Create ACME challenge directory:
     ```bash
     sudo mkdir -p /var/www/letsencrypt
     ```
   - Enable site:
     ```bash
     sudo ln -s /etc/nginx/sites-available/neights-of-thunder /etc/nginx/sites-enabled/neights-of-thunder
     sudo nginx -t
     sudo systemctl reload nginx
     ```
8. **SSL with Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
9. **Initial deploy**:
   ```bash
   ./deploy.sh
   ```
10. **Enable PM2 on boot**:
    ```bash
    pm2 startup systemd
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    pm2 save
    ```

### Optional hardening (deploy user, firewall)

1. **Create a deploy user**:
   ```bash
   sudo adduser deploy
   sudo usermod -aG sudo deploy
   sudo rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   ```
2. **Lock down SSH** (edit `/etc/ssh/sshd_config`):
   ```
   PasswordAuthentication no
   PermitRootLogin no
   ```
   Then:
   ```bash
   sudo systemctl reload ssh
   ```
3. **Enable UFW**:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```
4. **Optional: fail2ban**:
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable --now fail2ban
   ```

### DigitalOcean Managed Postgres (quick setup)

1. **Create a DO Postgres cluster** and allow inbound connections from your droplet IP.
2. **Get the connection string** from DO and set `DATABASE_URL` in `.env`. Include `sslmode=require` if it isn't already.
3. **Apply schema/migrations** from the droplet:
   ```bash
   npx prisma migrate deploy
   ```

### GitHub Actions deployment

The workflow in `.github/workflows/deploy.yml` deploys on every push to `main`.
Add these GitHub Secrets:

- `DO_HOST` (droplet IP/host)
- `DO_USER` (SSH user)
- `DO_SSH_KEY` (private key)
- `DO_APP_DIR` (absolute path to repo on droplet)
- `DO_SSH_PORT` (optional, default 22)

### Rollback behavior

If a deployment fails, the workflow resets the repo to the previous commit on the server,
re-runs `./deploy.sh`, and marks the workflow as failed so you can investigate.

### Operations cheatsheet

```bash
pm2 status
pm2 logs neights-of-thunder
pm2 restart neights-of-thunder
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backups and monitoring

- **Database backups:** enable DO managed backups or run `pg_dump` on a schedule.
- **Uptime monitoring:** point a monitor at `https://yourdomain.com/api/health`.
- **SSL renewals:** Certbot auto-renews via systemd timers; verify with `sudo certbot renew --dry-run`.

### Troubleshooting

- **502 from Nginx:** check `pm2 status` and ensure `PORT=3000` is set in `.env`.
- **WebSocket disconnects:** confirm Nginx proxy includes `Upgrade`/`Connection` headers.
- **Prisma errors on deploy:** run `npx prisma migrate deploy` and confirm `DATABASE_URL`.

## Next Steps

See the full implementation plan at: `.claude/plans/twinkly-roaming-mitten.md`

### Immediate Next Steps:
1. Create custom Next.js server with WebSocket support
2. Implement race simulation engine (core game logic)
3. Build custom Claude Code skills for development
4. Create frontend UI components
5. Set up authentication with NextAuth

## Documentation

- [Product Requirements Document](./prd.md) - Full game design specification
- [Implementation Plan](./.claude/plans/twinkly-roaming-mitten.md) - Detailed technical plan

## License

ISC
