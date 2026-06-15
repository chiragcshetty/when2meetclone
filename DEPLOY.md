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
PORT=3000
```

## 6. Run the app with PM2

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
curl http://localhost:3000
```

## 7. Open port in AWS Security Group

In the AWS console, go to your instance's Security Group → Inbound rules → add:
- HTTP (80) from 0.0.0.0/0
- HTTPS (443) from 0.0.0.0/0
- (SSH 22 should already be open to your IP)

## 8. Set up Nginx as reverse proxy

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

## 9. (Optional) HTTPS with Let's Encrypt

If you have a domain pointed at this instance:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 10. Verify

Visit `http://<your-ec2-ip>` (or your domain) in a browser — you should see the when2meet app.

## Redeploying after future code changes

```bash
cd ~/when2meetclone
git pull
cd client && npm run build && cd ..   # only if frontend changed
pm2 restart when2meet
```
