# EdgeAuth SSO Login

Modern, responsive SSO login page built with React + TypeScript + Tailwind CSS.

## Features

- ✅ Clean, modern UI design
- ✅ Email/Username + Password authentication
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design
- ✅ OAuth redirect support
- ✅ TypeScript strict mode
- ✅ Tailwind CSS styling

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router
- **Deployment**: Cloudflare Pages

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

### Development (`.env.development`)
```
VITE_API_BASE_URL=http://localhost:8788
```

### Production (`.env.production`)
```
VITE_API_BASE_URL=https://sso-api.auth.deepractice.ai
```

## Deployment

```bash
# Deploy to Cloudflare Pages
pnpm deploy
```

The app will be available at: `https://login.auth.deepractice.ai`

## API Integration

The login page integrates with the EdgeAuth SSO API:

- **POST** `/auth/login` - Authenticate user
- **GET** `/auth/me` - Verify token

See [EdgeAuth API Documentation](../../docs/api/README.md) for details.

## OAuth Flow

The login page supports OAuth redirect flow:

1. User visits: `https://login.auth.deepractice.ai?redirect_uri=https://app.example.com/callback`
2. User logs in
3. Redirects to: `https://app.example.com/callback?token=xxx`

## Project Structure

```
src/
├── components/       # React components
│   ├── LoginPage.tsx
│   └── LoginForm.tsx
├── lib/             # Utilities
│   ├── api.ts       # API client
│   └── store.ts     # Zustand store
├── types/           # TypeScript types
├── App.tsx          # App root
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Customization

### Branding

Edit `src/components/LoginPage.tsx` to customize:
- Logo
- Colors
- Title and description
- Footer

### Styling

Edit `tailwind.config.js` to customize theme:
- Colors
- Fonts
- Spacing
- Breakpoints

## License

Apache 2.0
