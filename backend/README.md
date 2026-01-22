# Mogifi AI Backend

Simple Express.js backend server for AI functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (create `.env` file):
```
PORT=3001
OPENAI_API_KEY=your_key_here
```

3. Start the server:
```bash
npm start
```

## Endpoints

- `GET /` - Root endpoint with service info
- `GET /health` - Health check endpoint
- `POST /api/ai` - AI endpoint (expects `{ prompt: string }`)

## Railway Deployment

Railway will automatically detect the `package.json` and run `npm start`.

Make sure to set `OPENAI_API_KEY` in Railway's environment variables.
