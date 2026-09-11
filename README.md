# Priyadarshani Form

React form for Priyadarshani High School CBSE Bhosari 2026-27.

## Google Sheets connection

Create a Google Apps Script web app for your sheet and set its deployment URL in `.env`:

```env
VITE_GOOGLE_SHEET_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Use the code from `google-apps-script.gs` in Apps Script. It automatically creates the response sheet columns, saves each uploaded photo as a real Google Drive image, and stores a clickable `Download Photo` link in the sheet instead of base64 text.

## Deploy with GitHub and Vercel

1. Push the project to a GitHub repository.
2. Import that repository into Vercel. Vercel will detect the Vite project automatically.
3. In the Vercel project settings, add an environment variable named `VITE_GOOGLE_SHEET_WEB_APP_URL` and set it to the deployed Apps Script `/exec` URL.
4. Redeploy after adding or changing the environment variable.

The Apps Script web app must be deployed with **Execute as: Me** and **Who has access: Anyone** so the public form can submit responses.

Expected request body:

```json
{
  "fullName": "Teacher name",
  "designation": "Teacher",
  "birthdate": "19 Oct 2022",
  "address": "Address",
  "emergencyContact": "9834440493",
  "photo": "base64 image data",
  "photoFileName": "Teacher-name-123456789.jpg",
  "submittedAt": "ISO timestamp"
}
```
