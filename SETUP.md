# Setup Guide

Steps to get this app running from a fresh clone on Ubuntu (tested on 24.04).

## 1. Clone the repo

```bash
git clone https://github.com/loocurse/when2meetclone.git
cd when2meetclone
```

## 2. Install Node.js (v20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x
```

## 3. Install MongoDB

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod
```

## 4. Install dependencies

```bash
npm install
```

This installs only the backend dependencies. The pre-built frontend is
already committed in `backend/public/`, so this is enough to run the app —
you do **not** need to install or build the client unless you're changing
frontend code (see "Frontend development" below).

> Note: if you do install client deps, `vue-router` must stay pinned to
> `4.0.6` (set in `client/package.json`). Newer 4.x versions use syntax that
> the Vue CLI 4 / webpack 4 build can't parse.

## 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:

```
MONGO_DB_URI=mongodb://localhost:27017/when2meetclone
```

If you want the app to serve on the standard HTTP port (80) instead of the
default 3000, also add:

```
PORT=80
```

## 6. Run the app

```bash
node backend/server.js
```

Visit http://localhost:3000

## 7. Frontend development (optional)

Only needed if you're changing files in `client/src`.

```bash
cd client
npm install
```

### Hot-reload dev server

```bash
# Terminal 1: backend API
node backend/server.js

# Terminal 2: frontend dev server
cd client
npm run serve
```

Frontend dev server: http://localhost:8080
Backend API: http://localhost:3000/api/events

### Rebuilding for production

After making changes, rebuild and commit the output so other machines pick up
the change without needing to build themselves:

```bash
cd client
npm run build
cd ..
```

This outputs into `backend/public/`, which the Express server serves
directly. Commit the changed files in `backend/public/` (including
`index.html`, which references the new hashed filenames) along with your
source changes.

## 8. Running on port 80 without root

Ports below 1024 (like port 80) normally require root to bind. Instead of
running the whole app as root (risky — a compromised process would have root
access to the machine), grant the `node` binary a narrow capability that only
allows binding to privileged ports:

```bash
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
```

Verify it took effect:

```bash
getcap $(readlink -f $(which node))
```

Now run the app as your normal user (with `PORT=80` set in `.env` as above):

```bash
node backend/server.js
```

> Note: this capability is attached to the `node` binary file itself. If
> Node.js is reinstalled or upgraded (e.g. via `apt upgrade`), the binary is
> replaced and you'll need to re-run the `setcap` command.

## 9. Stop the app

If running in a foreground terminal, press `Ctrl+C` in each terminal running a process (backend and/or frontend dev server).

If running in the background, find and stop the processes:

```bash
pkill -f "node backend/server.js"
pkill -f "vue-cli-service"
```

### Stop MongoDB (optional)

MongoDB runs as a system service and can keep running in the background. To stop it:

```bash
sudo systemctl stop mongod
```

To also disable it from starting on boot:

```bash
sudo systemctl disable mongod
```
