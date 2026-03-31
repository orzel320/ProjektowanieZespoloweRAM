from google import genai
from pydantic import BaseModel, Field
from typing import List
import json
import os
from dotenv import load_dotenv


load_dotenv()
api_key = os.getenv("PROJECT_API_KEY")
client = genai.Client(api_key = api_key)
ACTIVE_MODEL = 'gemini-2.5-flash'

class Category(BaseModel):
    name: str = Field(description="The name of the category")
    words: List[str] = Field(description="4 related words", min_length=4, max_length=4)
    logic: str = Field(description="The hidden connection/wordplay")

class ConnectionsBoard(BaseModel):
    topic: str
    difficulty: str
    categories: List[Category] = Field(min_length=4, max_length=4)

def generate_board(topic="General", difficulty="Hard"):
    theme_instruction = f"All 4 categories must relate to {topic} but from different angles." if topic != "General" else "The 4 categories must be from completely UNRELATED domains (e.g., one about science, one about movies, one about grammar)."
    difficulty_rules = {
    "Easy": "Use very common words and obvious direct categories(e.g., 'Colors', 'Fruit'). Max 1 subtle red herring.",
    "Medium": "Standard NYT difficulty. 1-2 red herrings. Categories like 'Synonyms for Big' or 'Types of Pasta'.",
    "Hard": "Abstract connections and tricky categories (e.g., 'Prefixes for -phone'). Use 3-4 red herrings to confuse the player.",
    "Expert": "Cryptic and meta-categories. Example: 'Words that are also numbers in French' or 'Anagrams of internal organs'. At least 4-5 overlapping red herrings. Use obscure vocabulary."
    }
    selected_rule = difficulty_rules.get(difficulty, difficulty_rules["Medium"])
    prompt = f"""
        You are a master puzzle designer for NYT Connections. 
        Difficulty Level: {difficulty}
        Rule for this level: {selected_rule}

        TASK:
        Generate 4 DISTINCT and INDEPENDENT categories for a $4\times4$ grid.

        CORE RULES:
        1. NO OVERLAP: The categories must NOT be sub-topics of a single theme. {theme_instruction}
        2. INDEPENDENCE: If Category A is 'Types of Fish', Category B must NOT be 'Ocean Animals'. It should be something like 'Types of Knots' or 'Slang for Money'.
        3. RED HERRINGS (Crucial): Include 3+ words with double meanings. Example: 'SQUASH' (could be a sport OR a vegetable).
        4. DIFFICULTY SCALING:
            - EASY: Direct associations, 1-2 red herrings.
            - HARD: Abstract connections (e.g., 'Words that end with a color'), 4+ red herrings, obscure vocabulary.
        5. Words in each category cannot be repeated.

        OUTPUT:
        Return exactly 4 categories with 4 words each. All in English.
        """

    try:
        response = client.models.generate_content(
            model=ACTIVE_MODEL, 
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': ConnectionsBoard.model_json_schema(),
            }
        )
        
        board_data = ConnectionsBoard.model_validate_json(response.text)
        print(f"--- {ACTIVE_MODEL} GENERATED PUZZLE ---")
        print(board_data.model_dump_json(indent=2))
        return board_data

    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    generate_board("Football", "Expert")