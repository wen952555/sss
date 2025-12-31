export const getCardUrl = (cardString) => {
  // 预期 cardString: "10_of_clubs", "ace_of_spades", "red_joker"
  if (!cardString) return "";
  return `/cards/${cardString}.svg`;
};