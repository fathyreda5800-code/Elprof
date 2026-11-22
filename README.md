# ELPROF

## Publishing on GitHub Pages

The GitHub Actions workflow builds the app and deploys it to
`https://fathyreda5800-code.github.io/Elprof/` whenever code is pushed to
`main`.

1. In the GitHub repository, open **Settings → Pages** and set the build and
   deployment source to **GitHub Actions**.
2. Under **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Push the project to the `main` branch. Check the **Actions** tab for the
   deployment status.

The Supabase publishable key is included in the public site bundle, as expected
for a browser app. Keep database access protected with Supabase Row Level
Security; never use a `service_role` key in the frontend.

## Development

Run `npm ci` to install dependencies, `npm run dev` to start the local server,
and `npm run build` to create a production build.
