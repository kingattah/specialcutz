# Supabase Setup — Special Cutz Portfolio

Follow these steps to enable admin uploads and dynamic portfolio works.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Wait for the database to finish provisioning.

## 2. Run the database schema

1. Open **SQL Editor** in your Supabase dashboard.
2. Copy the contents of `supabase/schema.sql` and run it.
3. This creates the `works` and `testimonials` tables, storage bucket, and security policies.

The whole file is safe to re-run on an existing project — it recreates policies rather than failing on ones that already exist, and never drops your data.

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
3. Choose a media source:
   - **File upload** — images, flyers/PDFs, or videos hosted in Supabase Storage
   - **YouTube link** — paste a watch, share, Shorts, or embed URL (no file size limit)
4. Pick a category:
   - **Video Production** — shows under Video Editing service
   - **Video Editing** — shows under Video Editing service
   - **Social Media** — shows under Social Media Management service
   - **Content Strategy** — shows under Content Strategy service
   - **Graphics & Flyers** — shows under Graphics & Flyers service

Works appear on the main site portfolio grid. Clicking a card opens the image/flyer, plays the uploaded video, embeds YouTube, or previews a PDF. Service cards filter the grid by category.

## Categories & filtering

| Upload category    | Visible when service is      |
|--------------------|------------------------------|
| Video Production   | Video Editing                |
| Video Editing      | Video Editing                |
| Social Media       | Social Media Management      |
| Content Strategy   | Content Strategy             |
| Graphics & Flyers  | Graphics & Flyers            |

## 6. Add testimonials

In `admin.html`, scroll to **Add testimonial** and enter the quote, client name, and optionally their role and photo. Saved testimonials appear in the Blog section of the site.

When there is more than one, the site rotates through them and shows dot navigation. Clients without a photo get their initials on a purple tile.

## File limits (free plan)

| Limit | Free plan |
|-------|-----------|
| Max file upload | **50 MB** |
| Total storage | **1 GB** |
| Monthly bandwidth | 5 GB cached + 5 GB uncached |

The admin panel enforces 50 MB for works and 5 MB for testimonial photos. Supported formats: JPG, PNG, WebP, GIF, SVG, BMP, TIFF, AVIF, HEIC, PDF, MP4, WebM, MOV. YouTube links bypass the upload limit entirely.

Check **Storage Settings** in your dashboard and make sure *Global file size limit* is set to 50 MB, otherwise a lower default may reject valid uploads.

### Keeping videos under 50 MB

Roughly 1–2 minutes of 1080p footage fits in 50 MB at a sensible bitrate. To compress before uploading:

- **HandBrake** (free) — use the *Fast 1080p30* preset, or *Fast 720p30* for longer clips
- **FFmpeg** — `ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset medium output.mp4` (raise `-crf` for smaller files)
- **CloudConvert** or similar web tools for one-off files

For reels and social clips, 720p is usually plenty since they display in a grid card.

### If you outgrow the free plan

Upgrading to Pro raises the per-file limit to 500 GB and includes 100 GB of storage. For longer videos, use **YouTube link** in the admin panel instead of uploading the file.

## Existing projects: enable YouTube & graphics works

If you already ran an older `schema.sql`, re-run the updated file in the SQL Editor (safe to re-run). It:

- Widens `media_type` to include `youtube` and `pdf`
- Adds the `graphics` category for flyers and design work
- Makes `storage_path` nullable for link-only rows

## 7. Deploy on GitHub Pages

The site auto-deploys when you push to `main`. Your Supabase URL and publishable key live in `js/supabase-config.js` (safe for client-side use — never put your **service role** key there).

Enable Pages: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Live site: `https://kingattah.github.io/specialcutz/`  
Admin panel: `https://kingattah.github.io/specialcutz/admin.html`

