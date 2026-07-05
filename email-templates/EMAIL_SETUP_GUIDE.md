# Skoolie Email Setup — from "Supabase Auth" to "Skoolie", with real rate limits

One move unlocks everything: **custom SMTP**. It changes the sender name, unlocks
template editing, and makes the email rate limit a number you choose.
Total time: ~45 minutes (most of it waiting for DNS). Total cost: ~$11/yr + free email tier.

---

## Step 0 — Buy a domain (~10 min, ~$11/yr)

Checked availability (July 4, 2026):

| Domain | Price/yr | Notes |
|---|---|---|
| **skoolieapp.com** ✅ | $11.25 | **Recommended** — literally your app's name, .com trust |
| getskoolie.com | $11.25 | fine fallback |
| useskoolie.com | $11.25 | fine fallback |
| skoolie.io | $37.99 | pricier, tech-y |
| skoolie.study | $35.56 | on-theme but unusual TLD |
| skoolie.com / .app / .co / .me | — | taken |

Easiest path: buy **skoolieapp.com** through Vercel (your web app already lives there,
so DNS management stays in one dashboard):
https://vercel.com/domains/search?q=skoolieapp.com

Bonus: later you can point the domain at your Vercel landing page too — one purchase
covers website + email identity.

## Step 1 — Resend account (~5 min, free)

1. Go to **resend.com** → sign up (free tier: 3,000 emails/month, 100/day).
2. **Domains → Add Domain** → enter `skoolieapp.com`.
3. Resend shows 3–4 DNS records (SPF, DKIM, optionally DMARC).

## Step 2 — Add the DNS records (~5 min + up to a few hours propagation)

In the Vercel dashboard → your domain → **DNS Records**, add each record exactly as
Resend lists them (type TXT/CNAME/MX, name, value). Back in Resend, hit **Verify** —
it flips to Verified once DNS propagates (usually minutes, occasionally hours).

## Step 3 — Get SMTP credentials (~2 min)

Resend → **API Keys → Create API Key** → copy it (shown once).

Your SMTP settings:
- Host: `smtp.resend.com`
- Port: `465` (fallback `587`)
- Username: `resend`
- Password: *(the API key)*

## Step 4 — Plug into Supabase (~5 min)

Supabase dashboard → **Authentication → Emails → SMTP Settings**:
1. Enable Custom SMTP.
2. Sender email: `no-reply@skoolieapp.com`
3. Sender name: `Skoolie`
4. Host/port/username/password from Step 3 → **Save**.

Send yourself a password reset → the email now arrives from **Skoolie**.

## Step 5 — Raise the rate limits (~2 min)

Supabase → **Authentication → Rate Limits**:
- "Emails per hour": now editable — set to **500–1000** (plenty for launch; raise anytime).
- Note: the per-user cooldown (~60s between reset requests for the same address)
  is separate, healthy anti-abuse, and should stay.
- Resend free tier caps at 100/day — enough for early testing. Before real launch,
  Resend Pro ($20/mo → 50,000/month) removes that ceiling.

## Step 6 — Fix the Reset Password template (~2 min)

Supabase → **Authentication → Emails → Reset Password** (unlocked now that SMTP is on):
1. Subject: `Your Skoolie password reset code`
2. Body: paste the contents of `email-templates/reset-password.html` (in this folder).
   - The critical detail: it renders `{{ .Token }}` (the 6-digit code the app expects),
     NOT `{{ .ConfirmationURL }}` (the link that was dumping you on the vercel site).

While you're there, rebrand **Confirm signup** too (keep its `{{ .ConfirmationURL }}`
link — that flow genuinely uses a link; only the reset flow uses a code).

---

## The result

- Emails from `Skoolie <no-reply@skoolieapp.com>` — Supabase invisible
- Reset emails show a big branded 6-digit code, no stray links
- Rate limit: whatever you set (500+/hr), not 2/hr
- ~$11/yr + free tier until launch scale demands Resend Pro
