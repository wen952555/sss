# Project Setup

This document provides instructions on how to set up and run this project locally. The project is divided into a frontend and a backend.

## Backend Setup (PHP)

The backend is a PHP application. To run it, you need to have PHP installed on your system.

1.  **Install PHP:**
    If you don't have PHP installed, you can install it using your system's package manager. For example, on Debian-based systems (like Ubuntu), you can use the following command:
    ```bash
    sudo apt-get update && sudo apt-get install -y php
    ```

2.  **Start the PHP Server:**
    Once PHP is installed, you can start the backend server using PHP's built-in web server. From the root of the project, run the following command:
    ```bash
    php -S localhost:8000 -t backend/
    ```
    This will start the server on `http://localhost:8000`, with the `backend` directory as the document root.

## Database Setup (MySQL)

The backend requires a MySQL database to function correctly.

1.  **Install MySQL Server:**
    Install the MySQL server package. On Debian-based systems, you can use:
    ```bash
    sudo apt-get install -y mysql-server
    ```

2.  **Install PHP MySQL Extension:**
    The PHP application needs the `mysqli` extension to connect to the database.
    ```bash
    sudo apt-get install -y php-mysql
    ```

3.  **Start the MySQL Service:**
    Ensure the MySQL service is running.
    ```bash
    sudo systemctl start mysql
    ```

4.  **Create Database and User:**
    Log in to MySQL and create the database and user required by the application. The credentials are found in `backend/api/config.php`.
    ```bash
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS wcn_game; CREATE USER IF NOT EXISTS 'wcn_user'@'localhost' IDENTIFIED BY 'wcn_password'; GRANT ALL PRIVILEGES ON wcn_game.* TO 'wcn_user'@'localhost'; FLUSH PRIVILEGES;"
    ```

5.  **Run the Database Setup Script:**
    Execute the PHP script to create the necessary tables and populate them with initial data.
    ```bash
    php backend/setup_database.php
    ```

## Frontend Setup (React + Vite)

The frontend is a React application built with Vite.

1.  **Install Dependencies:**
    Navigate to the `frontend` directory and install the required dependencies using `npm`:
    ```bash
    cd frontend
    npm install
    ```

2.  **Start the Development Server:**
    After the dependencies are installed, you can start the Vite development server:
    ```bash
    npm run dev
    ```
    This will start the frontend application, which will be accessible at the URL provided in the output (usually `http://localhost:5173`). The frontend is configured to proxy API requests to the backend server running on `http://localhost:8000`.