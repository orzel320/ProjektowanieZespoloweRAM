from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from enum import Enum
from engine import generate_board, ConnectionsBoard

app = FastAPI(
    title="Connections++ AI Module",
    description="Microservice for generating dynamic word association puzzles using Gemini AI.",
    version="2026.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class DifficultyLevel(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    EXPERT = "Expert"

class PuzzleRequest(BaseModel):
    topic: str = Field(
        default="General", 
        description="The theme of the puzzle. If set to 'General' or 'Random', the AI Agent will brainstorm a unique theme for you."
    )
    difficulty: DifficultyLevel = Field(
        default=DifficultyLevel.MEDIUM, 
        description="Determines how tricky the connections and red herrings will be."
    )

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "AI Service is online",
        "engine": "Gemini 2.5 Flash",
        "features": ["Dynamic Topics", "Adaptive Difficulty", "Fallback Protection"]
    }

@app.post("/generate", response_model=ConnectionsBoard, tags=["Generator"])
async def generate_endpoint(request: PuzzleRequest):
    try:
        return generate_board(request.topic, request.difficulty.value)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")