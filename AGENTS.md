# Branch and merge policy

- Do all development on `dev` or a feature branch based on `dev`.
- Never push directly to `main`, including force pushes or local merges pushed to `main`.
- Propose changes to `main` through a GitHub pull request (MR/PR) only.
- Do not merge a PR unless the user explicitly authorizes the merge.
- GitHub Pages deploys from `main`; development changes go live after their PR is merged.

## Game configuration research

- To resume local game-package or code analysis, first read `docs/天地劫本地包研究交接.md` for progress, evidence locations, limitations, and pending work.
- For new-version preloaded card-pool analysis, read `docs/卡池版本对比流程.md` and follow its snapshot comparison workflow, evidence boundaries, and baseline notes.
