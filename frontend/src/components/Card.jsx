// 更新图片路径处理
const getCardImage = () => {
  const { suit, value } = card;
  let valueName;
  
  if (value === 1) valueName = 'ace';
  else if (value === 11) valueName = 'jack';
  else if (value === 12) valueName = 'queen';
  else if (value === 13) valueName = 'king';
  else valueName = value.toString();
  
  // 确保路径格式正确
  return `${valueName}_of_${suit}`;
};

// 在img标签中使用
<img 
  src={`${process.env.PUBLIC_URL}/images/cards/${getCardImage()}.svg`}
  alt={`${card.value} of ${card.suit}`}
  className="card-image"
/>
