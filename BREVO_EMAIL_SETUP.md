# Brevo Email Integration Guide

This document explains how the application uses Brevo API for sending interview invitation emails and generating secure interview links.

## Overview

The application integrates with **Brevo** (formerly Sendinblue) to send professional interview invitation emails with secure tokens to candidates. The system supports both Brevo REST API and SMTP relay methods.

## Setup Instructions

### 1. Get Your Brevo API Key

1. Visit [Brevo Dashboard](https://app.brevo.com/)
2. Go to **Settings > API Keys**
3. Copy your **REST API Key** (starts with `xkeysib-`)
4. Add it to your `.env` file:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxx
```

### 2. Verify Your Sender Email

Brevo requires sender email verification:

1. Go to **Senders & Contacts > Senders**
2. Add and verify your sender email address
3. Set this email in your `.env` file:

```env
SMTP_USER=your-verified-email@company.com
```

### 3. (Optional) SMTP Configuration

If you prefer SMTP relay over REST API:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-verified-email@company.com
SMTP_PASS=xkeysib-xxxxxxxxxxxxxxxxxxxxxx
```

## How It Works

### Email Sending Flow

```
┌─────────────────────────────────────┐
│  POST /api/send-invite-email        │
│  (Candidate Email, Role, etc.)      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Generate Secure Token              │
│  - 32-character random hex          │
│  - Expires in 24 hours              │
│  - Stored in local database         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Send via Brevo REST API            │
│  (Primary Method)                   │
└────────────┬────────────────────────┘
             │ (Fallback)
             ▼
┌─────────────────────────────────────┐
│  Send via SMTP Relay                │
│  (If REST API unavailable)          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Email Delivered to Candidate       │
│  with Secure Interview Link         │
└─────────────────────────────────────┘
```

## API Endpoints

### Send Interview Invitation

**POST** `/api/send-invite-email`

```json
{
  "email": "candidate@example.com",
  "candidateName": "John Doe",
  "role": "Senior Engineer",
  "inviteLink": "https://your-domain.com/#/invite/base-url",
  "preferredVoice": "female",
  "clientEmail": "recruiter@company.com"
}
```

**Response:**

```json
{
  "success": true,
  "deliveredTo": "candidate@example.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expiresAt": "2024-06-05T10:30:00Z",
  "secureLink": "https://your-domain.com/#/invite/int_01xleopr1",
  "clientNotified": "recruiter@company.com",
  "timestamp": "2024-06-04T10:30:00Z"
}
```

### Verify Interview Invite Token

**GET** `/api/verify-invite/:token`

Validates if an invitation token is still valid and not expired.

### Update Invite Status

**POST** `/api/update-invite-status/:token`

Updates the status of an invitation (e.g., from "pending" to "used").

## Email Template Features

The invitation email includes:

- **Professional styling** with company branding
- **Interview details** (role, voice preference, expiry time)
- **Secure action button** linking to the interview session
- **Key instructions** for candidates
- **Alternative link access** in case button doesn't work

### Email Contents:

- **Subject:** `Secure Link: Complete your AI Interview for {Role}`
- **Content Sections:**
  - Greeting with company branding
  - Interview invitation details
  - Target role and voice preference
  - Secure session link (expires in 24 hours)
  - Key preparation instructions
  - Direct link for manual access

## Secure Token System

### Token Generation

- **Format:** 32-character hexadecimal (16 random bytes)
- **Storage:** Local JSON database (`invites_db.json`)
- **Expiration:** 24 hours from generation
- **Status Tracking:** `pending` → `used`

### Token Data Structure

```typescript
{
  token: string,
  candidateEmail: string,
  expiresAt: string (ISO),
  status: "pending" | "used",
  role?: string,
  candidateName?: string,
  preferredVoice?: string,
  clientEmail?: string,
  originalInterviewId?: string
}
```

## Error Handling

The system includes comprehensive error handling for:

| Error Code | Issue | Solution |
|-----------|-------|----------|
| 535 | SMTP authentication failed | Verify email credentials, use App Password for Gmail |
| 550 | Sender not verified | Verify your sender email in Brevo dashboard |
| 400 | Missing required fields | Ensure all required fields are provided in request |
| 429 | Rate limit exceeded | Wait before sending more emails |

## Testing

### Test with Sandbox (No Brevo Account)

If you don't have a Brevo account, the system automatically falls back to **Ethereal Mail** (sandbox):

```json
{
  "success": true,
  "isSandbox": true,
  "sandboxUrl": "https://ethereal.email/message/..."
}
```

### Test with Real Brevo

1. Add valid `BREVO_API_KEY` to `.env`
2. Verify sender email in Brevo dashboard
3. Send test invitation
4. Check email delivery in Brevo dashboard

## Monitoring & Analytics

Track email deliveries in **Brevo Dashboard**:

- **Transactional Email Stats:** `/dashboard/statistics/emails`
- **Failed Deliveries:** Marked with error codes
- **Bounce Rate:** Monitor for authentication issues
- **Delivery Time:** Typically 1-5 seconds

## Security Best Practices

1. ✅ **Never commit `.env`** - Keep API keys secure
2. ✅ **Use environment variables** - Loaded from `.env.example`
3. ✅ **Verify sender emails** - In Brevo dashboard
4. ✅ **Implement rate limiting** - On the email endpoint
5. ✅ **Use secure tokens** - 24-hour expiration for interview links
6. ✅ **HTTPS only** - All links should be HTTPS

## Troubleshooting

### Email Not Sent

**Check logs:**
```bash
npm run dev  # Start dev server and check console output
```

**Common issues:**
- Missing `BREVO_API_KEY` in `.env`
- Sender email not verified in Brevo
- Invalid recipient email format

### Emails Going to Spam

**Solutions:**
- Add SPF record: `v=spf1 include:mail.brevo.com ~all`
- Add DKIM records (provided by Brevo)
- Use verified domain sender email
- Check Brevo reputation score

### Rate Limiting

**Brevo limits:** 300 emails/second by default

Implement request queuing if sending bulk invitations.

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/docs/getting-started)
- [SMTP Relay Setup](https://developers.brevo.com/docs/faq-page)
- [Email Deliverability Best Practices](https://help.brevo.com/hc/en-us/articles/208099556)

---

**Last Updated:** June 2024
**Status:** Production Ready
