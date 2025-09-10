import os

# card_identifier.py

# Dictionaries to map English names to Chinese characters for suits and ranks.

SUIT_MAP = {
    "clubs": "梅花",
    "spades": "黑桃",
    "diamonds": "方块",
    "hearts": "红桃",
}

RANK_MAP = {
    "ace": "A",
    "king": "K",
    "queen": "Q",
    "jack": "J",
    "10": "10",
    "9": "9",
    "8": "8",
    "7": "7",
    "6": "6",
    "5": "5",
    "4": "4",
    "3": "3",
    "2": "2",
}

JOKER_MAP = {
    "red_joker": "大王",
    "black_joker": "小王",
}

def identify_card(filename):
    """
    Identifies a playing card from its filename.

    Args:
        filename (str): The filename of the card image (e.g., "king_of_diamonds.svg").

    Returns:
        str: The Chinese name of the card, or "Unknown Card" if not identified.
    """
    # Remove file extension and convert to lowercase
    base_name = os.path.splitext(filename)[0].lower()

    # Check for Jokers first
    if base_name in JOKER_MAP:
        return JOKER_MAP[base_name]

    # Handle standard cards
    parts = base_name.split("_of_")
    if len(parts) == 2:
        rank_str, suit_str = parts

        # Look up the rank and suit in the maps
        rank = RANK_MAP.get(rank_str)
        suit = SUIT_MAP.get(suit_str)

        if rank and suit:
            return f"{suit}{rank}"

    return "Unknown Card"

if __name__ == "__main__":
    test_cards = [
        "10_of_clubs.svg",
        "ace_of_spades.svg",
        "king_of_diamonds.svg",
        "queen_of_hearts.svg",
        "jack_of_spades.svg",
        "red_joker.svg",
        "black_joker.svg",
        "2_of_diamonds.svg",
        "non_existent_card.jpg", # Test case for unknown card
    ]

    for card_file in test_cards:
        print(f'The card for "{card_file}" is: {identify_card(card_file)}')
