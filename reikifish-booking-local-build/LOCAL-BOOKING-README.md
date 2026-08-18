# ReikiFish local booking system

This package adds a Cloudflare Pages Functions booking backend, local D1 database, PayPal Sandbox checkout, customer booking page and private availability manager.

## Local installation

1. Extract the `reikifish-booking-local-build` folder directly inside `C:\Users\andyp\reikifish-website`.
2. Open PowerShell in the extracted folder.
3. Run `Set-ExecutionPolicy -Scope Process Bypass; .\install-booking-local.ps1`.
4. Open the new project-root `.dev.vars` file and replace every placeholder.
5. From the project root run `npm run booking:dev`.

Do not commit `.dev.vars`. The installer adds it to `.gitignore`.

## Mailgun sandbox limitation

Mailgun sandbox domains only send to authorised recipients. Before live customer emails, configure and verify a Mailgun sending domain. The system already supports this through `MAILGUN_DOMAIN`.

## Live safeguards

Do not switch `PAYPAL_ENV` to `live` until Sandbox payment, webhook, email, cancellation and double-booking tests pass. A live D1 database and `BOOKING_DB` binding must be created before deployment.
