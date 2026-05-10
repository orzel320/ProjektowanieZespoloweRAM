from pydantic import BaseModel
from typing import List, Dict

class Category(BaseModel):
    name: str
    words: List[str]

class BoardResponse(BaseModel):
    categories: List[Category]
    difficulty_score: float
    difficulty_level: str

class GuessRequest(BaseModel):
    words: List[str]

class GuessResponse(BaseModel):
    is_correct: bool
    message: str