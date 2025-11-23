GitHub Copilot CLI - quick start

Official page:
https://github.com/github/copilot-cli

What this doc does
- Points you to the official Copilot CLI repository for latest installers and docs.
- Provides a few safe, minimal next steps you can run locally to try Copilot CLI.

Install (official instructions may change)
1. Open the official repo releases page and follow the installer for your platform:
   - https://github.com/github/copilot-cli/releases

2. After installing the `copilot` binary, verify installation:

   copilot --version
   copilot --help

Authenticate
- Follow the interactive login command the CLI provides. Example (the actual subcommand may vary by release):

  copilot auth login

- If that specific subcommand doesn't exist for your version, run `copilot --help` and follow the authentication instructions shown by the tool or the README on the official repo.

Basic usage
- Once installed and authenticated you can try the interactive mode or run code generation commands. Example (replace with the exact commands for your release):

  copilot chat
  copilot code "write a function that reverses a string in JavaScript"

Security notes
- The Copilot CLI will open a browser window for OAuth; do not paste tokens into code or the repo.
- Use the official releases page to download installers; verify checksums if provided.

Integration ideas for this repository
- Use Copilot CLI locally to help prototype small code snippets or tests.
- Do NOT add your copilot auth token to repository files. Store any tokens in your OS credential manager or GitHub secrets when used in CI.

If you want, I can:
- add a helper script to open the official Copilot CLI repo page from this workspace, or
- add a short sample command file that demonstrates a few copilot-cli commands (non-authenticated examples).

Refer to the official repo for up-to-date, authoritative installation and usage instructions.
