# Deploying when2meetclone on Ubuntu AWS EC2

## 1. Connect to your instance (Ubuntu 24.04)

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
```

## 2. Update system & install Node.js

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git
node -v && npm -v
```

## 3. Install MongoDB

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

printf 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse\n' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Verify it's a single unbroken line
cat /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

> If `apt update` fails with "Malformed entry" again, remove the file
> (`sudo rm /etc/apt/sources.list.d/mongodb-org-7.0.list`) and recreate it
> with the `printf` command above — the line must not contain a literal
> newline/wrap.

## 4. Clone & build the app

```bash
cd ~
git clone https://github.com/loocurse/when2meetclone.git
cd when2meetclone

# Backend deps
npm install

# Frontend deps + build (outputs into backend/public)
cd client
npm install
npm run build
cd ..
```

## 5. Configure environment variables

```bash
cd backend
nano .env
```
Add:
```
MONGO_DB_URI=mongodb://localhost:27017/when2meet
PORT=80
```

> **Port 80 is the standard recommendation** — the app serves HTTP directly, so
> visitors reach it at `http://<your-ec2-ip>` with no extra proxy. Port 80 is a
> privileged port (< 1024), so grant Node permission to bind it without running
> as root (done in the next step). If you'd rather front the app with Nginx
> (e.g. for HTTPS or multiple sites), set `PORT=3000` instead and see the
> optional Nginx section below.

## 6. Allow Node to bind to port 80

Port 80 is privileged, so grant the Node binary the capability to bind low
ports. This lets PM2 run the app on port 80 **without running as root**:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

> Re-run this command after any Node upgrade (it applies to the specific binary).

## 7. Run the app with PM2

```bash
sudo npm install -g pm2
cd ~/when2meetclone
pm2 start backend/server.js --name when2meet
pm2 save
pm2 startup   # run the command it prints to enable on boot
```

Check it's running:
```bash
pm2 status
curl http://localhost      # port 80
```

## 8. Open port in AWS Security Group

In the AWS console, go to your instance's Security Group → Inbound rules → add:
- HTTP (80) from 0.0.0.0/0  ← this is the port the app listens on
- HTTPS (443) from 0.0.0.0/0  *(only if you add HTTPS/Nginx below)*
- (SSH 22 should already be open to your IP)

## 9. Verify

Visit `http://<your-ec2-ip>` in a browser — you should see the when2meet app.
That's the complete standard deployment. The sections below are **optional**.

## (Optional) Front the app with Nginx

Only needed if you want HTTPS, a custom domain, or to host multiple sites on the
instance. If you take this path, set `PORT=3000` in `backend/.env`, restart
(`pm2 restart when2meet`), and skip the `setcap` step from section 6 (Nginx
binds port 80 instead).

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/when2meet
```
Paste:
```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/when2meet /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### (Optional) HTTPS with Let's Encrypt

Requires the Nginx setup above and a domain pointed at this instance:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Redeploying after future code changes

```bash
cd ~/when2meetclone
git pull
cd client && npm run build && cd ..   # only if frontend changed
pm2 restart when2meet
```
