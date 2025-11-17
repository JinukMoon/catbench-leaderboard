# GitHub Pages Deployment Guide

This document describes how to publish the CatBench Leaderboard to GitHub Pages.

## Prerequisites

1. Create (or reuse) a GitHub repository.
2. Push the project contents to GitHub.

## Deployment Steps

### 1. Configure the GitHub repository

1. Open the repository on GitHub.
2. Navigate to **Settings → Pages**.
3. Under **Source**, choose `GitHub Actions`.
4. Save the setting.

### 2. Configure the base path

Update `vite.config.js` so the `base` value matches your hosting scenario:

- **Custom domain (e.g., `catbench.org`)**: `base: '/'`
- **Project site such as `username.github.io/catbench-leaderboard`**: `base: '/catbench-leaderboard/'`
- **User/organization site (`username.github.io`)**: `base: '/'`

You can override the value through the `VITE_BASE_PATH` environment variable, which the GitHub Actions workflow already sets automatically.

### 3. Automatic deployments

The workflow runs automatically when:

- You push to the `main` branch, or
- You manually trigger the workflow from the **Actions** tab.

### 4. Verify the deployment

1. Open the **Actions** tab to confirm the workflow succeeded.
2. In **Settings → Pages**, confirm the published URL.
3. Typical URLs look like:
   - `https://username.github.io/repository-name/`
   - or a custom domain such as `https://catbench.org/`

## Optional: Custom domain

### 1. DNS configuration

At your domain registrar, create the following records:

- **A records** pointing to the GitHub Pages IPs:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- **CNAME record** (if you prefer `www`): `username.github.io`

### 2. Repository settings

1. Go to **Settings → Pages**.
2. Enter your domain (e.g., `catbench.org`) in **Custom domain**.
3. Enable **Enforce HTTPS** once the TLS certificate finishes provisioning.

### 3. CNAME file (optional)

GitHub automatically creates a `CNAME` file in the Pages artifact. If you ever need to add it manually:

```bash
echo "catbench.org" > public/CNAME
```

## Local testing

Validate the build locally before pushing:

```bash
# Generate leaderboard data
npm run generate-data

# Production build
npm run build

# Preview the build
npm run preview
```

## Troubleshooting

### Build failures

- Inspect the GitHub Actions logs.
- Confirm `npm run generate-data` succeeds locally.
- Ensure Python 3.8 or newer is available for the data generation script.

### 404 errors

- Verify `base` in `vite.config.js` matches your deployment path.
- Confirm the repository name and base path align (especially for project sites).

### Missing assets (images, etc.)

- Make sure every file under `public/` is committed.
- Use relative asset paths such as `/assets/...` so Vite resolves them correctly.

## Manual deployment (without GitHub Actions)

If you prefer deploying manually:

```bash
# 1. Generate data
npm run generate-data

# 2. Build the site
npm run build

# 3. Publish the dist/ folder (requires the gh-pages CLI)
npm install -g gh-pages
gh-pages -d dist
```

## Additional resources

- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [Vite static deployment guide](https://vitejs.dev/guide/static-deploy.html#github-pages)

