qflush Licensing (Gumroad)

Overview

This project integrates with Gumroad for license sales and verification. You can sell monthly or yearly licenses and validate keys using Gumroad's license API.

Recommended products on Gumroad:
- qflush Monthly - €5/month
- qflush Yearly - €39/year

Steps to configure

1. Create products on Gumroad and enable license keys.
2. Obtain your Gumroad account token (Personal access token) or use public product id for verification.
3. Add token to your daemon or CI as environment variable `GUMROAD_TOKEN` (for server-side verify) or store securely in a file and set `GUMROAD_TOKEN_FILE`.

Daemon setup

- Run the daemon (recommended):
  - Set `GUMROAD_TOKEN` and optionally `GUMROAD_PRODUCT_YEARLY` / `GUMROAD_PRODUCT_MONTHLY`.
  - Start: `qflush daemon` or `node dist/daemon/qflushd.js`.
  - The daemon exposes endpoints:
    - `POST /license/activate` { key, product_id? }
    - `GET /license/status` -> { license, valid }

VS Code extension flow

- The VS Code extension UI includes a License section in the panel:
  - Paste the key in the License Key field and press Activate.
  - The extension will call the daemon `POST /license/activate` and display the result.
  - Use Show License Status to query `GET /license/status`.

CLI flow

- You can also activate using the CLI (suitable for headless installs):
  - `GUMROAD_TOKEN=... qflush license activate <key>`
  - `qflush license status` to view the saved local license

Audit and metrics

- The daemon writes a simple audit log by default to `./.qflush/license-activations.log` and exposes Prometheus counters:
  - `qflush_license_activation_total`
  - `qflush_license_activation_success_total`
  - `qflush_license_activation_failure_total`

Local license storage

The CLI/daemon stores a local license record in `./.qflush/license.json`. You can override with `GUMROAD_LICENSE_PATH`.

Security

Do not hardcode your Gumroad token in client-side code. Use the daemon to keep tokens private. The extension communicates with the local daemon only.

---

qflush licensing (local Gumroad verification)

Overview

qflush uses Gumroad to sell license keys. The recommended flow is local verification: the user pastes a license key into the app/extension which calls the local daemon to verify the key directly with Gumroad.

Simple local flow (recommended)

1. User purchases a license on Gumroad and receives a license key.
2. User opens qflush (or the VS Code extension) and enters the license key.
3. The client calls the local daemon endpoint `POST /license/activate` with `{ key }`.
4. The daemon calls Gumroad's verify API, saves the license locally on success, and returns the result.

Why this is sufficient

- No public URL, tunnel, or webhook required for normal activation and verification.
- Works fully offline for the app running on the user's machine (daemon contacts Gumroad to verify).

Daemon configuration

- Set `GUMROAD_TOKEN` and product IDs in the daemon environment (or `GUMROAD_TOKEN_FILE` and `GUMROAD_LICENSE_PATH` if preferred).
- Default local license path: `./.qflush/license.json`.

Commands

- Activate (HTTP):
  POST http://localhost:4500/license/activate
  Body: { "key": "XXXX-XXXX-XXXX" }

- Status (HTTP):
  GET http://localhost:4500/license/status

Notes about webhooks

- Webhooks are optional. They are useful to automatically revoke licenses on refunds or subscription cancellations.
- This repository supports webhook handling, but it can be removed. The default simple flow does not require a webhook or public endpoint.

Security

- Do not commit `GUMROAD_TOKEN` to the repo. Use `.env`, environment variables, or a token file referenced by `GUMROAD_TOKEN_FILE`.
- Audit log (activations) is at `./.qflush/license-activations.log`.

If you want the fully automated server-driven flow (webhooks + auto-disable), use a public endpoint (ngrok, domain, or server) and enable webhooks in Gumroad. Otherwise the local flow above is safest and simplest.

