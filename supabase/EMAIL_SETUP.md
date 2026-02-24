# Auth Email Setup

Complete walkthrough for branded auth emails sending from `@earwyrm.app`.

Do these in order — Resend first, then Supabase.

---

## Part 1: Resend

### 1a. Verify your domain

1. Log in at [resend.com](https://resend.com)
2. In the left sidebar, click **Domains**
3. Click **Add Domain** in the top right
4. Enter `earwyrm.app` and click **Add**
5. Resend will show you a table of DNS records to add — there will be 3-5 records (MX, SPF/TXT, and DKIM/CNAME records)
6. Open your domain registrar (wherever you bought `earwyrm.app` — Namecheap, Cloudflare, Google Domains, etc.)
7. Go to DNS settings for `earwyrm.app` and add each record exactly as Resend shows:
   - **Type**: match what Resend says (TXT, MX, CNAME)
   - **Name/Host**: copy exactly from Resend (some will be like `resend._domainkey`)
   - **Value/Content**: copy exactly from Resend
   - **Priority**: for MX records, use the priority Resend specifies (usually `10`)
   - **TTL**: leave as default or set to Auto
8. Go back to Resend and click **Verify**. If it says "Pending", wait a few minutes and try again. DNS can take up to an hour but usually works in under 5 minutes.
9. Once verified, the status will show a green checkmark

### 1b. Create an API key

1. In the left sidebar, click **API Keys**
2. Click **Create API Key**
3. Give it a name like `supabase-smtp`
4. Under **Permission**, select **Sending access**
5. Under **Domain**, select `earwyrm.app`
6. Click **Create**
7. **Copy the key immediately** — it starts with `re_` and is only shown once. Save it somewhere temporarily (you'll paste it into Supabase next)

---

## Part 2: Supabase

Go to your project dashboard at [supabase.com/dashboard](https://supabase.com/dashboard).

### 2a. SMTP Settings

1. Left sidebar → **Authentication** (under Project Settings, or the shield icon)
2. Scroll down to **SMTP Settings**
3. Toggle **Enable Custom SMTP** on
4. Fill in these fields:

| Field | What to enter |
|-------|---------------|
| **Sender email** | `hello@earwyrm.app` |
| **Sender name** | `earwyrm` |
| **Host** | `smtp.resend.com` |
| **Port number** | `465` |
| **Minimum interval** | Leave as default (60 seconds) |
| **Username** | `resend` |
| **Password** | Paste your Resend API key (`re_...` from step 1b) |

5. Click **Save**

### 2b. Redirect URLs

1. Left sidebar → **Authentication**
2. Click the **URL Configuration** tab (along the top, next to "Providers")
3. Under **Redirect URLs**, click **Add URL**
4. Enter: `https://earwyrm.app/auth/callback`
5. Click **Save**

This tells Supabase it's allowed to redirect users back to this URL after they click the email link.

### 2c. Email Templates

1. Left sidebar → **Authentication**
2. Click the **Email Templates** tab (along the top)
3. You'll see a dropdown or tabs for different template types

**Confirm signup:**
1. Select the **Confirm signup** template
2. Set the **Subject** to: `Confirm your earwyrm account`
3. Switch the body editor to **Source** / **HTML** mode (not the visual editor)
4. Select all existing content and delete it
5. Open `supabase/email-templates/confirmation.html` from this repo, copy the entire file contents, and paste it in
6. Click **Save**

**Reset password:**
1. Select the **Reset password** template
2. Set the **Subject** to: `Reset your earwyrm password`
3. Switch to **Source** / **HTML** mode
4. Select all and replace with the contents of `supabase/email-templates/reset-password.html`
5. Click **Save**

---

## Verify it works

1. Sign up with a new test email on earwyrm
2. Check the inbox — the email should come from `hello@earwyrm.app` with the branded template
3. Click the confirmation link — it should open the app (iOS) or redirect to `earwyrm.app/auth/callback` (web)

If emails aren't arriving:
- Check Resend dashboard → **Logs** to see if sends are happening
- Check spam folder
- Make sure the domain DNS records are verified in Resend
- Make sure SMTP is enabled (not just saved) in Supabase
