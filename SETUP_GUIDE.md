# DevConnect — Complete Setup & Deployment Guide

This guide assumes you have never done any of this before. Follow the parts in order. Every place where **you** must create an account, choose a password or copy a secret is marked with 🔑.

Commands are shown for **Windows (PowerShell)**. On Mac/Linux they are the same unless noted.

---

## Part 0 — Everything you need to provide

| # | What | Where you get it | Cost |
|---|---|---|---|
| 🔑 1 | **GitHub account** | github.com → Sign up | Free |
| 🔑 2 | **Azure for Students account** | azure.microsoft.com/free/students — sign in with your **college email** | Free: $100 credit + free services for 12 months, **no credit card** |
| 🔑 3 | **Database admin username + password** | You invent these in Part 5 | — |
| 🔑 4 | **JWT secret** | You generate it with one command in Part 5 | — |
| 🔑 5 | **Static Web Apps deployment token** | Copied from Azure in Part 7 | — |
| 🔑 6 | **AZURE_CREDENTIALS** (for auto-deploy) | Generated in Azure Cloud Shell in Part 8 | — |

Keep a private note (not in the project folder!) where you paste each credential as you create it.

**Never** put passwords or secrets in any file that goes to GitHub. The project's `.gitignore` already keeps `.env` files out.

### What is free and what isn't

| Service | Free plan we use | Watch out for |
|---|---|---|
| Azure Static Web Apps (frontend) | **Free plan** — 100 GB bandwidth/month | Don't pick "Standard" |
| Azure Container Apps (API) | **Consumption plan** — first 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests each month free | Keep **min replicas = 0** so it sleeps when idle |
| Azure Database for PostgreSQL | **Flexible Server, Burstable B1ms** — 750 hours/month, 32 GB storage, free for 12 months | Pick exactly **B1ms** and **32 GB**; turn **High availability off** |
| GitHub Actions + Container Registry | Free for public repositories | Make the repo **public** |
| Docker Desktop | Free for personal and education use | — |

Even if something goes slightly over, it comes out of your $100 student credit — Azure for Students does **not** charge you money; services just stop when the credit runs out.

---

## Part 1 — Install the tools (one time, ~30 min)

1. **Node.js 20 LTS or newer** — nodejs.org → download the LTS installer → Next, Next, Finish.
2. **Git** — git-scm.com/downloads → install with default options.
3. **VS Code** — code.visualstudio.com.
4. **Docker Desktop** — docker.com/products/docker-desktop → install. On Windows, accept when it asks to enable **WSL 2**, then restart your PC. Open Docker Desktop once and wait until it says "Engine running".

Check everything worked — open **PowerShell** and run:

```powershell
node -v      # should print v20.x or higher
npm -v
git --version
docker --version
```

---

## Part 2 — Run the project on your laptop

1. Unzip `devconnect.zip` somewhere simple, e.g. `C:\projects\devconnect`.
2. Open that folder in VS Code (File → Open Folder).
3. Open a terminal in VS Code (Terminal → New Terminal) and run:

```powershell
docker compose up --build
```

The first run downloads images and takes a few minutes. When you see `DevConnect API listening on port 4000`, open:

- Website: http://localhost:8080
- API health check: http://localhost:4000/api/health

4. Add demo data (optional, makes screenshots look nicer). Open a **second** terminal:

```powershell
docker compose exec api node src/db/seed.js
```

Demo login: **demo / demo12345**.

5. To stop everything: press `Ctrl + C` in the first terminal, then `docker compose down`.
   (Add `-v` — `docker compose down -v` — only if you want to wipe the local database.)

### Optional: development mode (instant reload when you edit code)

Keep only the database in Docker and run the API and website with npm:

```powershell
docker compose up db -d

cd backend
copy .env.example .env        # Mac: cp .env.example .env
npm install
npm run dev                   # API on http://localhost:4000

# new terminal
cd frontend
copy .env.example .env
npm install
npm run dev                   # website on http://localhost:5173
```

### Run the automated tests

With the database running (`docker compose up db -d`) and `backend/.env` in place:

```powershell
cd backend
npm test
```

You should see `# pass 8  # fail 0`. Screenshot this for your submission.

---

## Part 3 — Put the code on GitHub 🔑

1. Sign in to github.com → **+** (top right) → **New repository**.
   - Name: `devconnect`
   - Visibility: **Public** (needed for free Actions and free image hosting)
   - Do **not** tick "Add a README" (we already have one)
   - Create repository
2. In the VS Code terminal, from the `devconnect` folder:

```powershell
git init
git add .
git commit -m "DevConnect: initial commit"
git branch -M main
git remote add origin https://github.com/<your-github-username>/devconnect.git
git push -u origin main
```

The first push opens a browser window asking you to sign in to GitHub — approve it.

3. On GitHub open the **Actions** tab. Two pipelines run:
   - **Backend CI/CD** — runs the tests, then builds the Docker image and pushes it to GitHub Container Registry. The Azure step is skipped for now (that's expected).
   - **Frontend CI/CD** — builds the React app; deploy is skipped for now.

   Wait until both show a green tick.

4. **Make the Docker image public** (so Azure can download it without a password):
   GitHub → click your profile picture → **Your profile** → **Packages** tab → `devconnect-api` → **Package settings** (right side) → scroll to **Danger Zone** → **Change visibility** → **Public** → type the name to confirm.

Your image is now at `ghcr.io/<your-github-username-in-lowercase>/devconnect-api:latest`.

---

## Part 4 — Create your Azure account 🔑

1. Go to **azure.microsoft.com/free/students** → **Start free**.
2. Sign in with (or create) a Microsoft account, then verify using your **college email address**.
3. When it's done you land on the Azure portal: **portal.azure.com**.

Check your credit any time at **microsoftazuresponsorships.com/balance**.

> If your college email isn't accepted: the regular Azure free account (azure.microsoft.com/free) also works with this guide, but it asks for a card for identity verification. A free alternative for just the database is **neon.tech** (free Postgres) — use its connection string in Part 6 instead of Azure's.

### Create a resource group (a folder for everything)

Portal search bar → **Resource groups** → **Create**
- Subscription: **Azure for Students**
- Resource group: `devconnect-rg`
- Region: **Central India** (or the closest one offered)
- Review + create → Create

Use this **same region** for everything below.

---

## Part 5 — Create the PostgreSQL database 🔑

Portal search → **Azure Database for PostgreSQL flexible servers** → **Create**.

**Basics tab**
| Field | Value |
|---|---|
| Resource group | `devconnect-rg` |
| Server name | something unique, e.g. `devconnect-db-sneha` (becomes `devconnect-db-sneha.postgres.database.azure.com`) |
| Region | same as resource group |
| PostgreSQL version | 16 |
| Workload type | **Development** |
| Compute + storage | click **Configure server** → **Burstable**, **Standard_B1ms**, storage **32 GiB**, High availability **Disabled**, Save |
| Authentication | **PostgreSQL authentication only** |
| 🔑 Admin username | e.g. `devadmin` |
| 🔑 Password | 16+ characters, **only letters and numbers** (special characters break the connection string) |

**Networking tab**
- Connectivity method: **Public access (allowed IP addresses)**
- ✅ Tick **"Allow public access from any Azure service within Azure to this server"** (lets the API connect)
- Click **+ Add current client IP address** (lets your laptop connect, for seeding)

**Review + create → Create.** Takes 5–10 minutes.

When it's done: open the server → left menu **Databases** → **+ Add** → name `devconnect` → Save.

### Build your connection string 🔑

```
postgresql://<admin-username>:<password>@<server-name>.postgres.database.azure.com:5432/devconnect
```

Example: `postgresql://devadmin:Abc123xyz456Def7@devconnect-db-sneha.postgres.database.azure.com:5432/devconnect`

### Generate your JWT secret 🔑

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the long string it prints. Save both in your private note.

---

## Part 6 — Deploy the API to Azure Container Apps

Portal search → **Container Apps** → **Create** → **Container App**.

**Basics tab**
| Field | Value |
|---|---|
| Resource group | `devconnect-rg` |
| Container app name | `devconnect-api` |
| Deployment source | **Container image** |
| Region | same as before |
| Container Apps environment | **Create new** → name `devconnect-env` → Environment type **Consumption only** → Create |

**Container tab**
| Field | Value |
|---|---|
| Use quickstart image | **Untick** |
| Image source | **Docker Hub or other registries** |
| Image type | **Public** |
| Registry login server | `ghcr.io` |
| Image and tag | `<your-github-username-lowercase>/devconnect-api:latest` |
| CPU and memory | **0.25 CPU cores, 0.5 Gi memory** |

**Environment variables** (same Container tab) — add each one with Source = **Manual entry**:

| Name | Value |
|---|---|
| `DATABASE_URL` | 🔑 your connection string from Part 5 |
| `DB_SSL` | `true` |
| `JWT_SECRET` | 🔑 your JWT secret from Part 5 |
| `CORS_ORIGIN` | `*` for now (we change it in Part 9) |
| `NODE_ENV` | `production` |

**Ingress tab**
- Ingress: **Enabled**
- Ingress traffic: **Accepting traffic from anywhere**
- Ingress type: HTTP
- Target port: `4000`

**Review + create → Create.**

When it's finished: open the container app → **Overview** → copy the **Application Url** (like `https://devconnect-api.xxxx.centralindia.azurecontainerapps.io`). Open `<that url>/api/health` in your browser — you should see `"database":"connected"`.

### Keep it inside the free grant

Container app → **Scale** (left menu, called "Scale and replicas" in some versions) → **Min replicas 0**, **Max replicas 1** → Save.
With 0 minimum, the API sleeps when nobody uses it; the first request after a while takes ~10–20 seconds to wake up. That's normal.

---

## Part 7 — Create the Static Web App (frontend) 🔑

Portal search → **Static Web Apps** → **Create**.

| Field | Value |
|---|---|
| Resource group | `devconnect-rg` |
| Name | `devconnect-web` |
| Plan type | **Free** |
| Deployment source | **Other** (important: we use our own GitHub workflow) |

**Review + create → Create.** Then open the resource:
- Copy the **URL** on the Overview page (like `https://happy-sand-0abc123.azurestaticapps.net`). This is your live website address.
- Click **Manage deployment token** → 🔑 copy the token.

---

## Part 8 — Connect GitHub to Azure 🔑

### 8a. Create AZURE_CREDENTIALS (lets GitHub update your API automatically)

1. In the Azure portal click the **Cloud Shell** icon (`>_` in the top bar) → choose **Bash** → if asked about storage, choose **No storage account required** → pick your subscription → Apply.
2. Get your subscription ID:

```bash
az account show --query id -o tsv
```

3. Create the credentials (replace `<SUBSCRIPTION_ID>`):

```bash
az ad sp create-for-rbac --name devconnect-github --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/devconnect-rg --json-auth
```

4. 🔑 Copy the **entire JSON output** (from `{` to `}`).

> **If you get a permissions error** ("Insufficient privileges"), your college's directory blocks this. That's fine — skip `AZURE_CREDENTIALS`. The pipeline will still test and build your image; after each backend push you update Azure yourself in Cloud Shell with:
> ```bash
> az containerapp update --name devconnect-api --resource-group devconnect-rg \
>   --image ghcr.io/<your-github-username-lowercase>/devconnect-api:latest
> ```

### 8b. Add secrets and variables to GitHub

GitHub repo → **Settings** → **Secrets and variables** → **Actions**.

**Secrets tab → New repository secret** (hidden values):

| Name | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | 🔑 token from Part 7 |
| `AZURE_CREDENTIALS` | 🔑 JSON from 8a (skip if blocked) |

**Variables tab → New repository variable** (not secret):

| Name | Value |
|---|---|
| `VITE_API_URL` | your Container App URL from Part 6, **no trailing slash** |
| `AZURE_RESOURCE_GROUP` | `devconnect-rg` |
| `AZURE_CONTAINERAPP_NAME` | `devconnect-api` |

---

## Part 9 — Lock down CORS and go live

1. Azure → `devconnect-api` → **Containers** (left menu, or "Application → Containers") → **Edit and deploy** → select the container → **Environment variables** → change `CORS_ORIGIN` to your Static Web App URL from Part 7 (no trailing slash) → Save → **Create**.
2. GitHub → **Actions** → **Frontend CI/CD** → **Run workflow** → Run. When it's green, open your Static Web App URL. 🎉
3. GitHub → **Actions** → **Backend CI/CD** → **Run workflow**, to confirm the automatic Azure deploy works (green tick on "Deploy new image to Azure Container Apps").

From now on, every `git push` to `main` redeploys automatically.

### Add demo data to the live database (optional)

On your laptop, edit `backend/.env`:

```
DATABASE_URL=<your Azure connection string>
DB_SSL=true
```

Then:

```powershell
cd backend
npm install
npm run seed
```

(This needs your laptop's IP in the database firewall — Part 5 Networking. If your IP changed, add it again under the server's **Networking** page.) Change `.env` back to the local values afterwards.

---

## Part 10 — Protect your credit

1. **Budget alert:** Portal search → **Cost Management** → **Budgets** → **Add** → amount `5` (USD) → alert at 50% and 100% → your email.
2. **Stop the database when you're not using it for days:** PostgreSQL server → Overview → **Stop**. (Azure restarts it automatically after 7 days.) 750 free hours = one server running all month, so this is only extra safety.
3. **After submission / grading**, delete everything in one click: Resource groups → `devconnect-rg` → **Delete resource group**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `docker compose` says Docker isn't running | Open Docker Desktop and wait for "Engine running" |
| Port 5432/4000/8080 already in use | Close other apps using it, or stop a locally installed PostgreSQL service |
| Website says "Can't reach the server" | API isn't running, or `VITE_API_URL` is wrong. Open `<API URL>/api/health` directly |
| Error "Origin … is not allowed" | `CORS_ORIGIN` on the API doesn't exactly match your website URL (check https, no trailing slash) |
| `/api/health` shows `database: unreachable` | Check `DATABASE_URL`, `DB_SSL=true`, the `devconnect` database exists, and "Allow access from Azure services" is ticked |
| Container App won't start / "image pull" error | The GHCR package isn't public yet (Part 3 step 4), or the username in the image name isn't lowercase |
| Refreshing a page on the live site gives 404 | `frontend/public/staticwebapp.config.json` must be in the repo (it is by default) |
| First request is slow | Normal — the API wakes up from zero replicas |
| Backend workflow fails at "Deploy" | Check `AZURE_CREDENTIALS` secret and the two variables' spelling |
| `npm test` fails locally | Database not running (`docker compose up db -d`) or `backend/.env` missing |

---

## Submission checklist

- [ ] GitHub repo link (public), with README
- [ ] Live website URL (Static Web App)
- [ ] Live API health URL (`/api/health`)
- [ ] Screenshot of green GitHub Actions runs
- [ ] Screenshot of `npm test` passing
- [ ] Screenshots: home page, a post with code + table, your profile, editor with live preview, dashboard, mobile view
- [ ] Screenshot of the Azure resource group showing the 3 resources
