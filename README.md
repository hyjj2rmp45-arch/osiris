React codebase for OSIRIS trading platform

## Overview
OSIRIS is a Solana trading automation platform featuring:
- Next.js frontend with terminal-style gold/glass design
- Solana wallet integration (Phantom)
- Automated subscription payments and management
- AI-powered trading signals
- Real-time monitoring and analytics

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional)
- Solana web3.js

### Setup Steps

1. **Clone Repository**
```bash
git clone https://github.com/[username]/osiris
```

2. **Install Dependencies**
```bash
pnpm install
```

3. **Setup Environment Variables**
Create a `.env.local` file:
```bash
PHANTOM_SOL_ADDRESS=3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk
HELIUS_API_KEY=[your-helius-api-key]
TELEGRAM_BOT_TOKEN=[your-telegram-bot-token]
TELEGRAM_ADMIN_ID=[your-telegram-id]
NODE_ENV=development
```

4. **Setup Databases**
```bash
# PostgreSQL
# Create database and configure credentials
# Redis (optional)
# Install and start Redis server
```

### Running Development
```bash
pnpm dev
```

### Building for Production
```bash
pnpm build
pnpm start
```

### Testing
```bash
pnpm test
pnpm test:integration
```

## Project Structure

```
osiris/
├── src/
│   ├── app/                    # Next.js pages
│   ├── components/            # React components
│   ├── lib/                   # Utility functions
│   ├── hooks/                 # Custom hooks
│   └── services/              # API services
├── public/                    # Static assets
├── styles/                   # Global CSS
├── config/                   # Configuration files
├── scripts/                  # Build and deployment scripts
├── docs/                     # Documentation
├── tests/                    # Test files
├── docker-compose.yml        # Docker setup
└── README.md                 # Project documentation
```

## Key Features

### Trading Interface
- Real-time trading dashboard
- Solana wallet integration
- Trading signals and analysis
- Risk management tools

### Payment System
- Solana token payments (0.3 SOL Monthly, 1.0 SOL Lifetime)
- Auto-renewal toggle
- Payment verification webhooks
- Admin payment management

### User Management
- Wallet-based authentication
- Subscription management
- Access control
- Usage analytics

### Admin Tools
- User dashboard
- Payment monitoring
- Analytics and reports
- System settings

## Configuration

### Environment Variables
```env
PHANTOM_SOL_ADDRESS=[treasury-wallet-address]
HELIUS_API_KEY=[helius-api-key]
TELEGRAM_BOT_TOKEN=[telegram-bot-token]
TELEGRAM_ADMIN_ID=[telegram-admin-id]
DATABASE_URL=postgresql://username:password@localhost:5432/osiris
REDIS_URL=redis://localhost:6379
```

### Next.js Configuration
```javascript
module.exports = {
  env: {
    PHANTOM_SOL_ADDRESS: process.env.PHANTOM_SOL_ADDRESS,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/payments/verify',
        destination: 'http://localhost:3000/api/payments/verify',
      },
    ];
  },
};
```

## API Endpoints

### Payment Verification
```http
POST /api/payments/verify
Content-Type: application/json

{
  "transaction_signature": "signature",
  "user_address": "address",
  "amount": 0.3,
  "token": "SOL"
}
```

### User Management
```http
GET /api/users/:wallet/address
PUT /api/users/:id/subscription
DELETE /api/users/:id
```

## Docker

### Docker Compose
```yaml
docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/osiris
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=osiris
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Docker Build
```bash
docker build -t osiris .
docker compose up -d
```

## Deployment

### Local
```bash
pnpm build
pnpm start
```

### Production
```bash
pnpm build
docker build -t osiris .
docker compose -f docker-compose.prod.yml up -d
```

## Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:integration
```

### E2E Tests
```bash
pnpm test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test
5. Submit PR

## License

MIT License - OSIRIS Trading Platform

## Acknowledgments

- Solana Protocol
- Next.js Team
- PostgreSQL Community
- Redis Community
- All Contributors
```