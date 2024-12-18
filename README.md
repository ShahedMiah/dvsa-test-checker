# DVSA Test Checker

A web scraping tool to check DVSA driving test availability.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/ShahedMiah/dvsa-test-checker.git
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Check Test Availability

```
POST /api/check-tests
```

Body:
```json
{
  "licenseNumber": "YOUR_LICENSE_NUMBER",
  "certificateNumber": "YOUR_CERTIFICATE_NUMBER"
}
```

## Important Notes

- This tool includes rate limiting to prevent overloading the DVSA website
- Use responsibly and in accordance with DVSA's terms of service
- The scraper includes random delays to mimic human behavior

## License

MIT