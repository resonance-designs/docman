---
sidebar_position: 1
---

# Release Workflow

DocMan release branches are created with:

```bash
npm run git:release
```

The script reads the version from the root `package.json`.

For version `2.2.2`, it creates:

```text
release/2.2.2
v2.2.2
```

and pushes both to `origin`.

## Before Running

1. Finish the feature or release work.
2. Update the changelog.
3. Sync version metadata:

```bash
npm run version:sync
```

or set a specific version:

```bash
npm run version:sync 2.2.2
```

4. Commit everything.
5. Confirm the worktree is clean:

```bash
git status
```

## Create The Release

```bash
npm run git:release
```

The script refuses to run when:

- the worktree is dirty
- Git is in detached HEAD mode
- the release branch already exists locally or remotely
- the tag already exists locally or remotely

## Merge To Master

After the branch and tag are pushed:

1. Open a PR from `release/X.X.X` into `master`.
2. Review the diff.
3. Merge the PR.
4. Confirm Render auto-deploy starts from `master`.
5. Confirm Linode deployment automation behavior before relying on it.
