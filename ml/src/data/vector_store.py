import json
import os
from sentence_transformers import SentenceTransformer
import numpy as np

class JsonVectorStore:
    def __init__(self, cache_file_path: str = "data_files/processed/vector_cache.json"):
        """
        Initialisation of the Vector Store.
        """
        self.cache_file = cache_file_path
        
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.cache = self._load_cache()
        print(f"loaded {len(self.cache)} vectors from cache")

    def _load_cache(self) -> dict:
        """restores saved vectors (currently from json file)"""
        if os.path.exists(self.cache_file):
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_cache(self):
        """Updates (currently json) cache"""
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2)

    def get_embeddings(self, words: list[str]) -> dict[str, np.ndarray]:
        """
        Returns vectors for listed words, if possible from cache, if not calculates using model and updates cache.
        """
        clean_words = [w.strip().lower() for w in words]
        
        missing_words = [w for w in clean_words if w not in self.cache]
        
        if missing_words:
            embeddings = self.model.encode(missing_words)
            
            for word, emb in zip(missing_words, embeddings):
                self.cache[word] = emb.tolist()
                
            self._save_cache()
            
        return {w: np.array(self.cache[w]) for w in clean_words}