from src.data.vector_store import JsonVectorStore
import numpy as np

def test_vector_store_dimensions():
    store = JsonVectorStore(cache_file_path="data_files/processed/test_cache.json")
    
    test_words = ["dog", "cat"]
    vectors_dict = store.get_embeddings(test_words)
    
    assert vectors_dict["dog"].shape[0] == 384
    assert isinstance(vectors_dict["dog"], np.ndarray)

def test_vector_store_caching():
    store = JsonVectorStore(cache_file_path="data_files/processed/test_cache.json")
    word = "apple"
    
    store.get_embeddings([word])
    assert word in store.cache
    
    new_store = JsonVectorStore(cache_file_path="data_files/processed/test_cache.json")
    assert word in new_store.cache