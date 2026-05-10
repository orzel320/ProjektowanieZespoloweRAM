import logging
from src.scoring.scorer import evaluate_board_metrics
from src.embeddings.extractor import extract_and_embed

logger = logging.getLogger(__name__)

DIFFICULTY_THRESHOLDS = {
    "Easy": {"max": -0.15},
    "Medium": {"min": -0.15, "max": 0.1},
    "Hard": {"min": 0.1}
}

class AdaptiveBoardGenerator:
    def __init__(self, vector_store, llm_engine_generate_func):
        """
        :param vector_store: Zainicjowany JsonVectorStore
        :param llm_engine_generate_func: Funkcja wywołująca LLM, np. generate_board(category, difficulty, feedback)
        """
        self.vector_store = vector_store
        self.generate_board = llm_engine_generate_func

    def generate_with_guaranteed_difficulty(self, category: str, target_difficulty: str, max_retries: int = 3):
        """
        Generuje planszę i weryfikuje jej matematyczną trudność.
        Jeśli plansza nie spełnia wymogów, prosi LLM o poprawę.
        """
        if target_difficulty not in DIFFICULTY_THRESHOLDS:
            raise ValueError(f"Nieznany poziom trudności: {target_difficulty}")

        thresholds = DIFFICULTY_THRESHOLDS[target_difficulty]
        current_feedback = None

        for attempt in range(1, max_retries + 1):
            logger.info(f"Próba {attempt}/{max_retries} dla trudności {target_difficulty}...")
            
            board = self.generate_board(category, target_difficulty, current_feedback)
            if not board:
                logger.error("LLM nie zwrócił poprawnej planszy.")
                continue

            try:
                embeddings = extract_and_embed(board, self.vector_store)
            except ValueError as e:
                logger.error(f"Błąd ekstrakcji wektorów: {e}")
                current_feedback = "Zwrócono złą liczbę słów. Upewnij się, że generujesz dokładnie 16 słów w 4 kategoriach."
                continue

            metrics = evaluate_board_metrics(board, embeddings)
            score = metrics["difficulty_score"]
            logger.info(f"Otrzymany wynik trudności: {score:.4f} (Docelowy: {target_difficulty})")

            is_too_easy = "min" in thresholds and score < thresholds["min"]
            is_too_hard = "max" in thresholds and score > thresholds["max"]

            if not is_too_easy and not is_too_hard:
                logger.info("Plansza zaakceptowana")
                return board, metrics 

            if is_too_easy:
                current_feedback = (
                    "Poprzednia plansza była zbyt łatwa (zbyt oczywista). "
                    "Zastąp kilka słów takimi, które mogą pasować do więcej niż jednej kategorii (tzw. red herrings), "
                    "aby utrudnić graczowi grupowanie."
                )
            elif is_too_hard:
                current_feedback = (
                    "Poprzednia plansza była zbyt trudna lub zbyt abstrakcyjna. "
                    "Zrób grupy bardziej spójnymi tematycznie (zwiększ powiązania wewnątrz grup), "
                    "aby gracz miał szansę je odgadnąć."
                )

        logger.warning("Wyczerpano limit prób. Zwracam ostatnią wygenerowaną planszę.")
        return board, metrics