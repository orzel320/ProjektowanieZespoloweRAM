import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def evaluate_board_metrics(board_data, embeddings_dict: dict[str, np.ndarray]) -> dict:
    """
    Oblicza metryki trudności planszy na podstawie osadzeń (embeddings).
    """
    intra_similarities = []
    all_words = []
    category_labels = []

    # 1. Obliczanie podobieństwa wewnątrz grup (Intra-group)
    for category_idx, category in enumerate(board_data.categories):
        words = category.words
        
        # POPRAWKA: Pobieramy ze słownika używając małych liter
        vectors = [embeddings_dict[w.strip().lower()] for w in words]
        
        sim_matrix = cosine_similarity(vectors)
        n = len(words)
        
        if n > 1:
            # Średnia z górnego trójkąta macierzy (pomijamy przekątną - podobieństwo słowa do samego siebie)
            avg_sim = (np.sum(sim_matrix) - n) / (n * (n - 1))
            intra_similarities.append(avg_sim)
        
        all_words.extend(words)
        category_labels.extend([category_idx] * n)

    avg_intra = np.mean(intra_similarities)

    # 2. Obliczanie podobieństwa pomiędzy grupami (Inter-group)
    # POPRAWKA: Pobieramy ze słownika używając małych liter
    all_vectors = [embeddings_dict[w.strip().lower()] for w in all_words]
    full_sim_matrix = cosine_similarity(all_vectors)
    
    inter_similarities = []
    n_total = len(all_words)
    
    for i in range(n_total):
        for j in range(i + 1, n_total):
            # Interesują nas tylko pary słów z różnych kategorii
            if category_labels[i] != category_labels[j]:
                inter_similarities.append(full_sim_matrix[i, j])
                
    avg_inter = np.mean(inter_similarities) if inter_similarities else 0.0

    # 3. Wskaźnik trudności (Difficulty Score)
    difficulty_score = avg_inter - avg_intra

    return {
        "intra_group": float(avg_intra),
        "inter_group": float(avg_inter),
        "difficulty_score": float(difficulty_score)
    }