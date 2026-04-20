from src.data.vector_store import JsonVectorStore
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def run_test():
    store = JsonVectorStore(cache_file_path="data_files/processed/vector_cache.json")
    
    test_words = ["dog", "cat", "car", "truck"]
    
    vectors_dict = store.get_embeddings(test_words)
    
    dog_vector = vectors_dict["dog"]
    print(f"Vector dimensions for 'dog': {dog_vector.shape[0]} (Expected 384)")
    
    vec_dog = vectors_dict["dog"].reshape(1, -1)
    vec_cat = vectors_dict["cat"].reshape(1, -1)
    vec_car = vectors_dict["car"].reshape(1, -1)
    
    sim_dog_cat = cosine_similarity(vec_dog, vec_cat)[0][0]
    sim_dog_car = cosine_similarity(vec_dog, vec_car)[0][0]
    
    print(f"Similarity (Dog <-> Cat): {sim_dog_cat:.4f} (expected high)")
    print(f"Similarity (Dog <-> Car): {sim_dog_car:.4f} (expected lower)")

if __name__ == "__main__":
    run_test()