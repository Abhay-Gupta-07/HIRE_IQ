<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# HireIQ - AI Interview Platform

An advanced AI-powered interview platform that uses Google Gemini for intelligent candidate assessment and Brevo for email communications.

## Features

- 🤖 **AI-Powered Interviews** - Uses Google Gemini API for intelligent interviewing
- 📧 **Brevo Email Integration** - Send secure interview invitations with expiring links
- 🎙️ **Voice Interview** - Real-time voice interactions with candidates
- 📊 **Assessment Reports** - Detailed candidate evaluation reports
- 🔒 **Secure Tokens** - 24-hour expiring interview links
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **AI:** Google Gemini API
- **Email:** Brevo (SendInBlue) REST API + SMTP
- **Database:** Local JSON + Supabase (optional)
- **Hosting:** Vercel

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Gemini API Key (get from [Google AI Studio](https://ai.google.dev/))
- Brevo Account (sign up at [brevo.com](https://www.brevo.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Abhay-Gupta-07/HIRE_IQ.git
   cd HIRE_IQ
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables:
   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key
   BREVO_API_KEY=your_brevo_api_key
   
   # Optional - Brevo SMTP Configuration
   SMTP_USER=your_verified_email@company.com
   SMTP_FROM=your_verified_email@company.com
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Email Integration

### Sending Interview Invitations

The platform uses Brevo API for sending secure interview invitations to candidates:

```typescript
import { sendInterviewInvite } from './src/lib/interviewInviteService';

const result = await sendInterviewInvite({
  email: 'candidate@example.com',
  candidateName: 'John Doe',
  role: 'Senior Engineer',
  preferredVoice: 'female',
  clientEmail: 'recruiter@company.com'
});

if (result.success) {
  console.log('Invitation sent:', result.secureLink);
}
```

### API Endpoints

- **POST** `/api/send-invite-email` - Send interview invitation
- **GET** `/api/verify-invite/:token` - Verify invitation token
- **POST** `/api/update-invite-status/:token` - Update invitation status
- **POST** `/api/send-client-email` - Send email to recruiter
- **POST** `/api/interview-question` - Generate interview questions
- **POST** `/api/evaluate-answer` - Evaluate candidate answer
- **POST** `/api/generate-report` - Generate assessment report
- **POST** `/api/analyze-resume` - Analyze uploaded resume

## Configuration

### Brevo Email Setup

For detailed Brevo configuration and troubleshooting, see [BREVO_EMAIL_SETUP.md](./BREVO_EMAIL_SETUP.md)

Key steps:
1. Get Brevo API key from [app.brevo.com](https://app.brevo.com/)
2. Verify your sender email in Brevo dashboard
3. Add `BREVO_API_KEY` to `.env`
4. (Optional) Configure SMTP relay for fallback

### Google Gemini API

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Click "Create API Key"
3. Add to `.env`: `GEMINI_API_KEY=your_key`

### Supabase (Optional)

For production database storage:
1. Create project at [supabase.com](https://supabase.com/)
2. Add credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

## Project Structure

```
src/
├── components/        # React components
│   ├── AdminLiveStreamMonitor.tsx
│   ├── AuthPage.tsx
│   ├── Dashboard.tsx
│   ├── InterviewRoom.tsx
│   └── ...
├── lib/              # Utility modules
│   ├── interviewInviteService.ts  # Email invitation helpers
│   ├── mcqPool.ts
│   ├── supabaseClient.ts
│   └── ...
├── App.tsx
├── main.tsx
└── index.css

server.ts              # Express backend
```

## Development

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
```

### Environment Variables Reference

See [.env.example](.env.example) for all available configuration options.

## API Documentation

### Send Interview Invitation

**Endpoint:** `POST /api/send-invite-email`

**Request Body:**
```json
{
  "email": "candidate@example.com",
  "candidateName": "John Doe",
  "role": "Senior Engineer",
  "inviteLink": "https://your-domain.com",
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
  "secureLink": "https://your-domain.com/#/invite/...",
  "clientNotified": "recruiter@company.com"
}
```

## Troubleshooting

### Email Not Sending

- Verify `BREVO_API_KEY` is set in `.env`
- Check that sender email is verified in Brevo dashboard
- See [BREVO_EMAIL_SETUP.md](./BREVO_EMAIL_SETUP.md) for detailed debugging

### Gemini API Issues

- Ensure `GEMINI_API_KEY` is correctly set
- Verify API key has required permissions
- Check Google Cloud Console for quota limits

## Deployment

### Vercel Deployment

```bash
vercel deploy
```

Set environment variables in Vercel dashboard:
- `GEMINI_API_KEY`
- `BREVO_API_KEY`
- Other configuration from `.env.example`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check [BREVO_EMAIL_SETUP.md](./BREVO_EMAIL_SETUP.md) for email configuration help
- Review [server.ts](./server.ts) for backend implementation
- Check console logs for detailed error messages

## Acknowledgments

- Built with [Google Gemini AI](https://ai.google.dev/)
- Email service by [Brevo](https://www.brevo.com/)
- Frontend framework [React](https://react.dev/)
- Build tool [Vite](https://vitejs.dev/)
