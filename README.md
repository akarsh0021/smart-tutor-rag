# Smart AI Tutor & Quiz Generator (with Search-Augmented RAG)

A full-stack AI-powered learning platform that combines a conversational AI tutor with dynamically generated, LLM-driven quizzes. The AI Tutor uses **real-time web search retrieval (RAG)** to ground its explanations in current information, rather than relying solely on the LLM's static training data.

## Features

- **AI Tutor (Chat Interface)** — Ask about any topic and get a conversational, markdown-formatted explanation with code examples where relevant.
- **Search-Augmented Generation (RAG)** — Before generating a response, the backend retrieves live web search results (via Tavily, with Serper as a fallback provider) and injects them into the prompt as grounding context. This lets the tutor answer questions about current events or recent developments that the base LLM wouldn't otherwise know.
- **Quiz Generator** — Dynamically generates multiple-choice quizzes on any topic using an LLM, with built-in variation logic (question style, difficulty, focus areas) to avoid repetition across attempts.
- **3-Stage Learning Workflow** — Learn → Quiz → Evaluate, with automated scoring and answer validation.
- **User Authentication** — Basic registration/login system.

## Tech Stack

**Frontend:** React.js, Tailwind CSS
**Backend:** FastAPI, SQLite, SQLAlchemy
**LLM:** Groq API (Llama 3.3 70B Versatile)
**Search Retrieval:** Tavily API (primary), Serper API (fallback)

## How the RAG Pipeline Works

1. User submits a question to the AI Tutor.
2. The backend calls `retrieve_context(query)`, which queries the Tavily Search API for the top 3–5 relevant web results (title, URL, content snippet).
3. If Tavily fails or returns nothing, it falls back to Serper. If both fail, retrieval is skipped entirely.
4. Retrieved snippets are injected into the prompt using the template:
   ```
   Using the following current information:
   {search_results}

   Explain {topic} to a beginner. If the search results don't add anything
   beyond general knowledge, rely on your own understanding.
   ```
5. The augmented prompt is sent to Groq's Llama 3.3 70B model, which generates the final response — grounded in live context when it's useful, and relying on its own knowledge when it isn't.
6. All search calls have a 5-second timeout and fail gracefully, so a search-provider outage never breaks the tutoring feature.

This is a **web-search-based RAG architecture** rather than a vector-database RAG architecture. Since the app is open-domain (users can ask about any topic), a static, pre-indexed vector store wasn't a good fit — live web retrieval covers arbitrary topics without needing a maintained knowledge base.

## Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with:
```
GROQ_API_KEY=your_groq_key
TAVILY_API_KEY=your_tavily_key
SERPER_API_KEY=your_serper_key   # optional fallback
```

Run the server:
```bash
python -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

| Method | Endpoint         | Description                                      |
|--------|------------------|---------------------------------------------------|
| POST   | `/register`      | Register a new user                                |
| POST   | `/login`         | User login                                         |
| POST   | `/ai-tutor`      | Ask the AI Tutor a question (RAG-augmented)        |
| POST   | `/ai-questions`  | Generate a quiz for a given topic                  |
| POST   | `/quiz-feedback` | Get AI-generated feedback based on quiz score      |
| GET    | `/health`        | Health check / API status                          |

## Notes

- The current implementation calls retrieval on every AI Tutor query. This is intentionally kept simple; a natural next step would be to trigger retrieval selectively (e.g. only for queries containing time-sensitive keywords) to reduce latency and API usage.
- No vector database or embeddings are used — retrieval is handled entirely through live web search APIs.
