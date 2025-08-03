# Organigram Backend API

This is a simple Node.js backend using Express and MongoDB that matches the API expected by the frontend (see `apiService.js`).

## Features
- **Mock login**: Hardcoded users, no real authentication.
- **Organigram structure**: Get, update, and track progress of documents by category.
- **Category management**: Create new categories and add documents with auto-incremented codes.
- **Progress and missing documents**: Calculate completion percentage and list incomplete documents.

## Endpoints

| Method | Endpoint                      | Description                                      |
|--------|-------------------------------|--------------------------------------------------|
| POST   | /api/login                    | Mock login, returns user object                   |
| GET    | /api/organigram               | Get all categories and their documents            |
| POST   | /api/organigram/update        | Mark a document as completed                     |
| GET    | /api/organigram/progress      | Get completion percentage                        |
| GET    | /api/organigram/missing       | List missing (incomplete) documents              |
| POST   | /api/categories               | Create a new category                            |
| POST   | /api/categories/addDocument   | Add document to a category (auto-increment code) |
| GET    | /api/categories               | Get all categories                               |

## Setup Instructions

1. **Install dependencies**

    ```bash
    cd backend
    npm install
    ```

2. **Configure environment**

    Copy `.env.example` to `.env` and adjust if needed:
    ```bash
    cp .env.example .env
    ```
    By default, MongoDB is expected at `mongodb://localhost:27017/organigram`.

3. **Run MongoDB**
    - Make sure MongoDB is running locally or update `MONGO_URI` in your `.env`.

4. **Start the server**

    ```bash
    npm run dev
    # or
    npm start
    ```

5. **Test the API**
    - Use Postman, curl, or connect your frontend to `http://localhost:4000/api`.
    - Dummy users: `admin`/`admin`, `user`/`user`.

## Notes
- No file uploads or advanced authentication implemented.
- Data is stored in MongoDB, except for users (hardcoded in-memory).
- Auto-incremented document codes are per category and year.

---

For questions or issues, contact the backend maintainer.
