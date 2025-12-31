import { getCardImage } from '../utils/cardHelper';

export default function Card({ value }) {
  return (
    <img 
      src={getCardImage(value)} 
      alt={value} 
      className="w-16 h-24 m-1 shadow-md rounded"
    />
  );
}