import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../"))
ai_service_path = os.path.join(project_root, "ai-service")

if ai_service_path not in sys.path:
    sys.path.append(ai_service_path)

from src.data.vector_store import JsonVectorStore
from src.embeddings.extractor import extract_and_embed

from engine import generate_board
from src.data.vector_store import JsonVectorStore
from src.ml.embeddings.extractor import extract_and_embed

store = JsonVectorStore(cache_file_path="data_files/processed/vector_cache.json")

ai_board = generate_board("General", "Medium")

if ai_board:
    board_vectors = extract_and_embed(ai_board, store)
    
    print(f"\nSuccessfully extracted {len(board_vectors)} vectors.")
    first_word = list(board_vectors.keys())[0]
    print(f"Shape of vector for '{first_word}': {board_vectors[first_word].shape}")