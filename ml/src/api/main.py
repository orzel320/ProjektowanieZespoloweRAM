import sys
import os
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
ai_service_path = os.path.join(project_root, "ai-service")

if ai_service_path not in sys.path:
    sys.path.append(ai_service_path)

from engine import generate_board, ConnectionsBoard

from src.data.vector_store import JsonVectorStore
from src.generation.adaptive import AdaptiveBoardGenerator

ml_state: Dict[str, Any] = {}

active_games: Dict[str, ConnectionsBoard] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Inicjalizacja modeli ML i wektorów...")
    store = JsonVectorStore(cache_file_path="data_files/processed/vector_cache.json")
    
    # Inicjalizujemy orchestrator prawdziwą funkcją wywołującą Gemini
    generator = AdaptiveBoardGenerator(store, generate_board)
    
    ml_state["store"] = store
    ml_state["generator"] = generator
    print("AI Module gotowy do pracy.")
    yield
    ml_state.clear()
    active_games.clear()

app = FastAPI(title="Connections++ AI Module", version="2026.1", lifespan=lifespan)

# Modele dla zapytań API
class GuessRequest(BaseModel):
    game_id: str
    words: List[str]

class GuessResponse(BaseModel):
    is_correct: bool
    category_name: str | None = None
    logic_explanation: str | None = None
    message: str

@app.get("/")
async def root():
    return {"status": "AI Service with ML Scoring is running"}

@app.post("/generate")
async def generate_endpoint(topic: str = "General", difficulty: str = "Medium"):
    generator: AdaptiveBoardGenerator = ml_state.get("generator")
    if not generator:
        raise HTTPException(status_code=503, detail="Modele nie są gotowe.")

    try:
        board, metrics = generator.generate_with_guaranteed_difficulty(
            category=topic, 
            target_difficulty=difficulty
        )
        
        game_id = str(uuid.uuid4())
        active_games[game_id] = board
        
        all_words = []
        for cat in board.categories:
            all_words.extend(cat.words)
        
        
        return {
            "game_id": game_id,
            "topic": board.topic,
            "difficulty": difficulty,
            "difficulty_score": metrics["difficulty_score"],
            "words": all_words 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/guess", response_model=GuessResponse)
async def check_guess(request: GuessRequest):
    if request.game_id not in active_games:
        raise HTTPException(status_code=404, detail="Gra o podanym ID nie istnieje lub wygasła.")
    
    if len(request.words) != 4:
        raise HTTPException(status_code=400, detail="Zgadywana grupa musi składać się z dokładnie 4 słów.")
        
    board = active_games[request.game_id]
    user_words_set = set([w.lower().strip() for w in request.words])
    
    for category in board.categories:
        category_words_set = set([w.lower().strip() for w in category.words])
        
        if user_words_set == category_words_set:
            return GuessResponse(
                is_correct=True,
                category_name=category.name,
                logic_explanation=category.logic,
                message="Świetnie! Znalazłeś poprawną grupę."
            )
            
    return GuessResponse(
        is_correct=False,
        message="Niepoprawna grupa."
    )