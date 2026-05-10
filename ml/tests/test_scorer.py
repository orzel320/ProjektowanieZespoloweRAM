import numpy as np
from src.scoring.scorer import evaluate_board_metrics

class MockCategory:
    def __init__(self, words):
        self.words = words

class MockBoard:
    def __init__(self, categories):
        self.categories = categories

def test_evaluate_board_metrics():
    cat1 = MockCategory(["dog", "wolf"])
    cat2 = MockCategory(["car", "truck"])
    board = MockBoard([cat1, cat2])
    
    mock_embeddings = {
        "dog": np.array([1.0, 0.1, 0.0]),
        "wolf": np.array([0.9, 0.2, 0.0]),
        "car": np.array([0.0, 1.0, 0.1]),
        "truck": np.array([0.0, 0.9, 0.2])
    }
    
    metrics = evaluate_board_metrics(board, mock_embeddings)
    
    print("Wyniki testu scoringu:")
    print(f"Intra-group (spodziewane wysokie, ok. 0.9+): {metrics['intra_group']:.4f}")
    print(f"Inter-group (spodziewane niskie, ok. 0.1): {metrics['inter_group']:.4f}")
    print(f"Difficulty score: {metrics['difficulty_score']:.4f}")
    
    # Podstawowe asercje
    assert metrics["intra_group"] > 0.8, "Podobieństwo wewnątrz grupy powinno być wysokie."
    assert metrics["inter_group"] < 0.3, "Podobieństwo między grupami powinno być niskie."
    assert metrics["difficulty_score"] < 0, "Łatwa plansza powinna mieć ujemny/niski wskaźnik trudności."
    
    print("Test zaliczony pomyślnie!")

if __name__ == "__main__":
    test_evaluate_board_metrics()