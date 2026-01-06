import React, { useState } from 'react';
import { getCardImg } from '../api';

const Board = ({ cards }) => {
    const [selection, setSelection] = useState({ head: [], mid: [], tail: [] });

    // A simple handler to add a card to the first available row
    // In a real app, this logic would be much more complex, allowing
    // the user to select the row.
    const handlePick = (card) => {
        // Avoid adding duplicates
        if ([...selection.head, ...selection.mid, ...selection.tail].includes(card)) {
            return;
        }

        if (selection.head.length < 3) {
            setSelection({ ...selection, head: [...selection.head, card] });
        } else if (selection.mid.length < 5) {
            setSelection({ ...selection, mid: [...selection.mid, card] });
        } else if (selection.tail.length < 5) {
            setSelection({ ...selection, tail: [...selection.tail, card] });
        }
    };

    return (
        <div className="game-board">
            <div className="row head">头道 (3张): {selection.head.map(c => <img key={c} src={getCardImg(c)} alt={`Card ${c}`} />)}</div>
            <div className="row mid">中道 (5张): {selection.mid.map(c => <img key={c} src={getCardImg(c)} alt={`Card ${c}`} />)}</div>
            <div className="row tail">尾道 (5张): {selection.tail.map(c => <img key={c} src={getCardImg(c)} alt={`Card ${c}`} />)}</div>
            
            <div className="hand-cards">
                {cards.map(c => (
                    <img 
                        key={c}
                        src={getCardImg(c)} 
                        onClick={() => handlePick(c)} 
                        className="card-img"
                        alt={`Card ${c}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default Board;
