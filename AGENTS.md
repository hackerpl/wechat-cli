# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first. The only project content in this snapshot is `doc/workflow.md`, so place new material under `doc/` unless it is a repo-wide file such as `README.md` or this guide. Prefer focused files named by topic, for example `doc/setup.md` or `doc/cli-usage.md`, instead of growing one large document.

## Build, Test, and Development Commands
This repository now ships as a Node.js CLI package. Use these commands while working:

- `npm install` installs local dependencies when needed.
- `node bin/wechat.js --help` shows the CLI entrypoint and available commands.
- `node bin/wechat.js material --help` inspects the material subcommands.
- `npm test` runs the current automated checks with Node's built-in test runner.
- `find . -maxdepth 3 -type f | sort` is still useful for quick repository inspection.

## Coding Style & Naming Conventions
Keep documentation concise, task-oriented, and written in Markdown with ATX headings (`#`, `##`). Use lowercase kebab-case for new document filenames, for example `doc/release-process.md`. Prefer short paragraphs and flat lists. Keep command examples copy-pastable and repository-relative paths explicit.

Because there is no formatter or linter configured yet, contributors should self-check spelling, heading structure, and broken examples before submitting changes.

## Testing Guidelines
Use `npm test` for the current automated checks. For CLI or documentation updates, also manually verify:

- headings render correctly
- commands are valid and complete
- file paths match the repository layout

Add new tests under `tests/` when extending the CLI or support modules, and keep the relevant run commands documented in `README.md`.

## Commit & Pull Request Guidelines
This workspace does not include `.git`, so local commit history is unavailable. Until a formal convention exists, use short imperative commit subjects with a clear scope, for example `docs: add workflow outline`.

Pull requests should explain what changed, why it changed, and any follow-up work. Link related issues when available. Include screenshots only when a rendered doc view or UI output is part of the change.
