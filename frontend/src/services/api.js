const API_BASE_URL = 'https://wenge.cloudns.ch:10758/api';

export const startGameAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/game/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
};

export const saveResultAPI = async (result) => {
  try {
    const response = await fetch(`${API_BASE_URL}/game/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error saving result:', error);
    throw error;
  }
};
