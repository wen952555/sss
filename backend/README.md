# Backend Setup

The backend for this project is built with PHP and requires a local server environment to run. The frontend application is configured to make API calls to `http://localhost/api/`.

## Requirements

1.  **A local web server with PHP support.**
    *   Examples: [XAMPP](https://www.apachefriends.org/), [MAMP](https://www.mamp.info/), or a custom Apache/Nginx setup.
2.  **A MySQL Database.**
    *   You need a running MySQL server.
    *   You need to import the database schema from `backend/database.sql`.

## Installation & Configuration

1.  **Set up your local server:**
    *   Configure your web server so that its document root points to the **root of this project directory** (the one containing the `frontend` and `backend` folders).
    *   This is crucial for the frontend (running on its own dev server) to correctly make requests to the PHP API at `/api/`. Your local server setup should handle requests to this path by executing the PHP scripts in the `backend/api` directory.

2.  **Import the Database:**
    *   Using a tool like phpMyAdmin, Adminer, or the MySQL command line, create a new database.
    *   Import the `backend/database.sql` file into your new database. This will create the necessary tables (`players`, `bets`, etc.).

3.  **Configure API Credentials:**
    *   Open `backend/api/config.php` in a text editor.
    *   Fill in your database credentials for `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME`.
    *   The `TELEGRAM_BOT_TOKEN` and `ADMIN_USER_IDS` are for a separate administrative webhook and are not used by the card game. You can leave them as placeholders.

## Running the Backend

Once your server is configured and the database is set up, the backend should be running. You can test if your server is configured correctly by navigating to a test file you create, or by starting the frontend.

With the backend running, you can start the frontend development server:
```bash
cd frontend
npm install
npm run dev
```
The game should now function correctly.
