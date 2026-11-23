# Google Sheets & Drive OAuth Sync

Enable browser-side Google OAuth (GIS) in Rodrigo Repara CRM for idempotent sync to the user's pre-formatted Google Sheet (`Rodrigo Repara - Sync Web`) and PDF backup upload to Google Drive.
Branch: `feat/google-sheets-drive-sync`. Risk: item 2 (OAuth token handling & least-privilege scopes in browser; Client Secret never in frontend).

## Specs

- **S1**: Connect Google OAuth from an accessible UI control in the web app using only `VITE_GOOGLE_CLIENT_ID` (never `client_secret`) with scopes `spreadsheets` and `drive.file`.
- **S2**: Support manual sync ("Sincronizar") to the user's Google Sheet (`1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ`) across all 6 data tabs (`clients`, `orders`, `leads`, `payments`, `expenses`, `parts_purchases`) without touching `Resumen_Diario` or cell formatting.
- **S3**: Sync must be idempotent: if the sheet already matches the CRM data, perform zero writes, create zero duplicates, and show no error ("Todo al día").
- **S4**: Automatically sync to Google Sheets in the background whenever the user saves an action in the CRM (add client, create/edit order, register payment, register expense) while Google is connected, without blocking or breaking Supabase saves.
- **S5**: Export an operational/financial PDF report and upload it directly to Google Drive (inside a dedicated folder) with a link to open it.

## Tasks

- [ ] **T1** (S1, S2, S3): Google config, OAuth token client, and idempotent 6-tab Sheets sync engine with unit tests — Route: inline — Commit: pending
- [ ] **T2** (S5): Self-contained PDF generator and Google Drive multipart upload with unit tests — Route: inline — Commit: pending
- [ ] **T3** (S1, S4, S5): `useGoogleSync` hook, accessible Header/SettingsDrawer controls, App mutation wiring, `.env`/`.env.local`/`.env.example` setup, and UI tests — Route: inline — Commit: pending

## Log

- **L1**: User requested: "habilitar en la web la sincronización. Eso es lo que quiero hacer. Que sea algo manual, que sea algo que se pueda sincronizar y que también, por ejemplo, los gastos se reflejen automáticamente. Y que si sincronizás, que no dé error tampoco, que si está todo igual, que no... Que sea, que funcione bien eso por detrás. Que sea tipo cuando registrás gastos o cuando agregás un cliente, que se refleje automáticamente, porque al final ahí también estás apretando un botón, entonces es una forma manual de hacerlo." + PDF export saved to Google Drive + Spreadsheet URL `https://docs.google.com/spreadsheets/d/1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ/edit?usp=sharing`.
