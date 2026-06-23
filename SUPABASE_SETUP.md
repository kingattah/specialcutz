# Supabase Setup — Special Cutz Portfolio

Follow these steps to enable admin uploads and dynamic portfolio works.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Wait for the database to finish provisioning.

## 2. Run the database schema

1. Open **SQL Editor** in your Supabase dashboard.
2. Copy the contents of `supabase/schema.sql` and run it.
3. This creates the `works` table, storage bucket, and security policies.

## 3. Create your admin account

1. Go to **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Enter your email and a strong password.
4. Use these credentials to sign in at `admin.html`.

## 4. Add your API keys

1. Go to **Project Settings → API**.
2. Copy your **Project URL** and **anon public** key.
3. Copy `js/supabase-config.example.js` to `js/supabase-config.js`, then add your keys:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_KEY",
};
```

## 5. Upload your works

1. Open `admin.html` in your browser.
2. Sign in with your admin account.
3. Upload images or videos and pick a category:
   - **Video Production** — shows under Video Editing service
   - **Video Editing** — shows under Video Editing service
   - **Social Media** — shows under Social Media Management service
   - **Content Strategy** — shows under Content Strategy service

Works appear on the main site portfolio grid. Clicking a service card filters the grid by category.

## Categories & filtering

| Upload category    | Visible when service is      |
|--------------------|------------------------------|
| Video Production   | Video Editing                |
| Video Editing      | Video Editing                |
| Social Media       | Social Media Management      |
| Content Strategy   | Content Strategy             |

## File limits

- Max upload size: **100 MB** per file
- Supported: JPG, PNG, WebP, GIF, MP4, WebM, MOV

To increase limits, adjust Supabase Storage settings in your project dashboard.

## Security notes

- Only signed-in users can upload or delete works.
- Anyone can view works on the public site (read-only).
- Keep `admin.html` unlinked from the public nav — bookmark it for yourself.
- Never commit real API keys to public repos if the repo is shared.
