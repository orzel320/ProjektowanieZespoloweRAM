import numpy as np
from src.data.vector_store import JsonVectorStore

def extract_and_embed(board_data, vector_store: JsonVectorStore) -> dict[str, np.ndarray]:
    """
    Extracts all 16 words from a generated ConnectionsBoard and 
    retrieves their vector embeddings from the store.
    """
    all_words = []
    
    for category in board_data.categories:
        all_words.extend(category.words)
        
    if len(all_words) != 16:
        raise ValueError(f"Expected exactly 16 words on the board, but got {len(all_words)}.")
        
    embeddings_dict = vector_store.get_embeddings(all_words)
    
    return embeddings_dict