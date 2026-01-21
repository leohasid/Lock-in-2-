from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os

app = FastAPI(title="Mogifi AI API")


@app.get("/")
async def root():
    """Root endpoint returning status"""
    return {"status": "ok"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mogifiai"}


@app.get("/api/openai-key-check")
async def check_openai_key():
    """Check if OpenAI API key is available (doesn't fail if missing)"""
    key = os.getenv("OPENAI_API_KEY")
    if key:
        return {"has_key": True, "key_length": len(key)}
    return {"has_key": False, "message": "OPENAI_API_KEY not set"}
