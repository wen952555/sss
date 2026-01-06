CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    short_id CHAR(4) UNIQUE,
    password VARCHAR(255),
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    room_id INT,
    round_id INT,
    head JSON, -- [1,2,3]
    mid JSON,  -- [4,5,6,7,8]
    tail JSON, -- [9,10,11,12,13]
    is_submitted TINYINT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
