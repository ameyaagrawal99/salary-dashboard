# Faculty Salary Dashboard

A salary comparison tool to model faculty compensation by role and experience, and compare institutional payouts with UGC benchmarks.

## Live Usage (GitHub Pages)

Once deployed, the app will be available at:

`https://<your-github-username>.github.io/<your-repo-name>/`

## Publish Steps

1. Create a new GitHub repository.
2. Push this project to the `main` branch.
3. In your repository settings, open `Settings -> Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Push any commit to `main` (or run the `Deploy to GitHub Pages` workflow manually).
6. Wait for the workflow to finish, then open your GitHub Pages URL.

## Local Development

```bash
npm ci
npm run dev
```

## Static Build

```bash
npm run build:client
```

Build output is generated in `dist/public`.
