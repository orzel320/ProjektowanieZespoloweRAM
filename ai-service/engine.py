from google import genai
from pydantic import BaseModel, Field
from typing import List
import json
import os
from dotenv import load_dotenv
import random
from datetime import datetime


load_dotenv()
api_key = os.getenv("PROJECT_API_KEY")
client = genai.Client(api_key = api_key)
ACTIVE_MODEL = 'gemini-2.5-flash'

# angielski fallback
FALLBACK_BOARD_EN = {
    "topic": "Global Finance & Sports (Pro Mode)",
    "difficulty": "Hard",
    "categories": [
        {
            "name": "World Currencies", 
            "words": ["Euro", "Dollar", "Lira", "Real"], 
            "logic": "Official national currencies (Red Herring: 'Real' also fits Football)"
        },
        {
            "name": "Football Clubs Prefixed with 'Real'", 
            "words": ["Madrid", "Betis", "Sociedad", "Salt"], 
            "logic": "Teams like Real Madrid, Real Betis, Real Sociedad, Real Salt Lake"
        },
        {
            "name": "Units of Weight", 
            "words": ["Gram", "Ounce", "Ton", "Pound"], 
            "logic": "Measurements of mass (Red Herring: 'Pound' is also a currency)"
        },
        {
            "name": "Words after 'Rolling'", 
            "words": ["Stone", "Pin", "Stock", "Thunder"], 
            "logic": "Rolling Stone, Rolling Pin, Rolling Stock, Rolling Thunder"
        }
    ]
}

# polski fallback 
FALLBACK_BOARD_PL = {
    "topic": "Polska",
    "difficulty": "Easy",
    "categories": [
        {
            "name": "Lektury szkolne",
            "words": ["Alina", "Polonez", "Lalka", "Milion"],
            "logic": "Słowa powiązane z polskimi lekturami szkolnymi"},
        {
            "name": "Polskie imiona damskie",
            "words": ["Karolina", "Maria", "Julia", "Zuzanna"],
            "logic": "Popularne polskie imiona kobiece"},
        {
            "name": "Polskie tańce regionalne",
            "words": ["Oberek", "Kujawiak", "Krakowiak", "Mazurek"],
            "logic": "Polskie tańce ludowe charakterystyczne dla konkretnych obszarów"},
        {
            "name": "Polskie ciasta",
            "words": ["Babka", "Makowiec", "Sernik", "Szarlotka"],
            "logic": "Popularne polskie wypieki"}
    ]
}

class Category(BaseModel):
    name: str = Field(description="The name of the category / Nazwa kategorii")
    words: List[str] = Field(description="4 related words / 4 powiązane słowa", min_length=4, max_length=4)
    logic: str = Field(description="The hidden connection/wordplay / Logika powiązania")

class ConnectionsBoard(BaseModel):
    topic: str
    difficulty: str
    categories: List[Category] = Field(min_length=4, max_length=4)

def get_ai_topic(language = "en"):
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    if language == "pl":
        prompt = f"""
            Dzisiaj jest {current_date}. 
            Zaproponuj jeden ciekawy, specyficzny temat do gry w skojarzenia słowne (Connections). 
            Możesz użyć dzisiejszej daty do inspiracji. Wybierz niszową lub kreatywną dziedzinę.
            Zwróć tylko nazwę tematu, maksymalnie 3 słowa, PO POLSKU.
        """
    else:
        prompt = f"""
            Today is {current_date}. 
            Suggest one interesting, specific topic for a word association game (Connections). 
            You can use today's date or current events for inspiration, but you are NOT limited to it. 
            Feel free to pick any unique, creative, or niche domain (science, pop culture, history, etc.). 
            Return only the topic name, max 3 words.
        """    
    try:
        response = client.models.generate_content(
            model=ACTIVE_MODEL, 
            contents=prompt,
            config={'temperature': 1.0} 
        )
        return response.text.strip()
    except Exception as e:
        print(f"Topic Agent failed ({e}), using backup list.")
        backups = {
            "en": ["Sports", "Space Exploration", "80s Music", "Popculture"],
            "pl": ["Sport", "Eksploracja Kosmosu", "Muzyka lat 80", "Polska Popkultura"]
        }
        return random.choice(backups.get(language, backups["en"]))

def generate_board(topic="General", difficulty="Hard", feedback: str = None, language="en"):
    actual_topic = topic

    temp_map = {"Easy": 0.3, "Medium": 0.7, "Hard": 0.9, "Expert": 1.1}
    selected_temp = temp_map.get(difficulty, 0.7)

    if topic in ["General", "Random", ""]:
        actual_topic = get_ai_topic(language = language)
        print(f"AI chose topic: {actual_topic}")

    theme_instruction = f"All 4 categories must relate to {actual_topic} but from different angles." if actual_topic != "General" else "The 4 categories must be from completely UNRELATED domains (e.g., one about science, one about movies, one about grammar)."
    
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

        """
    if language == "pl":
        prompt += """
        6. LANGUAGE CONTEXT: You MUST generate all content in natural Polish. 
        - Use Polish idioms, wordplay, and cultural references where appropriate.
        - Ensure words are in the nominative case (mianownik) unless a specific category rule dictates otherwise.
        - DO NOT directly translate English idioms if they sound unnatural in Polish.
        - All text inside the JSON (topic, category names, words, logic) MUST be in Polish.
        """
    else:
        prompt += """
        6. LANGUAGE CONTEXT: All text inside the JSON must be in English.
        """

    if feedback:
        prompt += f"""
        CRITICAL INSTRUCTION FOR THIS RETRY:
        {feedback}
        You MUST adjust your generation based on this feedback to meet the mathematical difficulty requirements.
        """

    if language == "pl":
        prompt += "\nOUTPUT:\nReturn exactly 4 categories with 4 words each. All text inside JSON fields MUST be in Polish."
    else:
        prompt += "\nOUTPUT:\nReturn exactly 4 categories with 4 words each. All text inside JSON fields MUST be in English."
    
    try:
        response = client.models.generate_content(
            model=ACTIVE_MODEL, 
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': ConnectionsBoard.model_json_schema(),
                'temperature': selected_temp
            }
        )
        
        board_data = ConnectionsBoard.model_validate_json(response.text)
        print(f"--- GENERATED PUZZLE ---")
        print(board_data.model_dump_json(indent=2))
        return board_data

    except Exception as e:
        print(f"FAILED: {e}. Returning Fallback Board for {language}.")
        fallback = FALLBACK_BOARD_PL if language == "pl" else FALLBACK_BOARD_EN
        return ConnectionsBoard(**fallback)

if __name__ == "__main__":
    generate_board("General", "Easy", language = "pl")