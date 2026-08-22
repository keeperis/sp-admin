# Contributing to sp-admin

## Branches

- never start work on `main`
- use short-lived branches only
- allowed prefixes:
  - `feature/<slug>`
  - `fix/<slug>`
  - `hotfix/<slug>`
  - `chore/<slug>`

If the same workstream touches multiple SoulPoetry repos, use the exact same branch name in all of them.

## Commits

- commit only files that belong to the current workstream
- do not use `git add .` on a dirty repo
- keep unrelated local changes out of the commit

## Pull requests

- `main` should be updated only through PRs
- list companion PRs in other SoulPoetry repos when the work spans multiple repos
- make sure `npm run biome:check` and `npm run build` pass before merge

## Releases

- `pp` and `prod` are not branches
- `pp` and `prod` should map to release manifests and exact commit SHAs
- do not deploy from an uncommitted local working tree as a normal workflow
