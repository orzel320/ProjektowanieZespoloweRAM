from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from engine import generate_board, ConnectionsBoard

app = FastAPI(title="Connections++ AI Module")

class PuzzleRequest(BaseModel):
    topic: str = "General"
    difficulty: str = "Hard"

@app.get("/")
async def root():
    return {"status": "AI Service is running", "version": "2026.1"}

@app.post("/generate", response_model=ConnectionsBoard)
async def generate_endpoint(request: PuzzleRequest):
    try:
        return generate_board(request.topic, request.difficulty)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))