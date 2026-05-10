import pytest
from unittest.mock import patch, MagicMock
from src.generation.adaptive import AdaptiveBoardGenerator

class MockCategory:
    def __init__(self, words):
        self.words = words

class MockBoard:
    def __init__(self, categories):
        self.categories = categories

@patch('src.generation.adaptive.evaluate_board_metrics')
@patch('src.generation.adaptive.extract_and_embed')
def test_adaptive_generator_retry_logic(mock_extract, mock_evaluate):
    mock_vector_store = MagicMock()
    mock_extract.return_value = {} 
    
    dummy_board = MockBoard([MockCategory(["apple", "banana", "pear", "plum"])])
    
    mock_llm_engine = MagicMock(return_value=dummy_board)
    
    mock_evaluate.side_effect = [
        {"difficulty_score": -0.5, "intra_group": 0.8, "inter_group": 0.3},
        
        {"difficulty_score": 0.0, "intra_group": 0.5, "inter_group": 0.5}
    ]
    
    generator = AdaptiveBoardGenerator(mock_vector_store, mock_llm_engine)
    
    final_board, final_metrics = generator.generate_with_guaranteed_difficulty(
        category="Owoce", 
        target_difficulty="Medium", 
        max_retries=3
    )
    
    assert mock_llm_engine.call_count == 2
    
    args, kwargs = mock_llm_engine.call_args_list[1]
    feedback_sent_to_llm = args[2]
    assert feedback_sent_to_llm is not None
    assert "zbyt łatwa" in feedback_sent_to_llm.lower() or "zbyt oczywista" in feedback_sent_to_llm.lower()
    
    assert final_metrics["difficulty_score"] == 0.0

@patch('src.generation.adaptive.evaluate_board_metrics')
@patch('src.generation.adaptive.extract_and_embed')
def test_adaptive_generator_max_retries(mock_extract, mock_evaluate):
    mock_vector_store = MagicMock()
    mock_extract.return_value = {}
    
    mock_llm_engine = MagicMock(return_value=MockBoard([]))
    
    mock_evaluate.return_value = {"difficulty_score": 0.5, "intra_group": 0.2, "inter_group": 0.7}
    
    generator = AdaptiveBoardGenerator(mock_vector_store, mock_llm_engine)
    
    final_board, final_metrics = generator.generate_with_guaranteed_difficulty(
        category="Owoce", 
        target_difficulty="Medium", 
        max_retries=3
    )
    
    assert mock_llm_engine.call_count == 3
    assert final_metrics["difficulty_score"] == 0.5