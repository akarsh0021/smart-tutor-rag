# main.py
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, select, func
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from typing import List, Dict, Optional
import os
import json
import random
import hashlib
from groq import Groq
import httpx

# ------------------ Load .env ------------------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

# ------------------ Web Search Retrieval ------------------
def retrieve_context(query: str) -> List[str]:
    """
    Retrieve search context from Tavily API (or Serper as fallback).
    Returns a list of strings representing search result snippets with sources.
    """
    tavily_key = os.getenv("TAVILY_API_KEY")
    serper_key = os.getenv("SERPER_API_KEY")
    
    if not tavily_key and not serper_key:
        print("⚠️ No search API keys configured. Skipping retrieval.")
        return []
        
    # Try Tavily first
    if tavily_key:
        try:
            print(f"🔍 Searching Tavily for: '{query}'")
            headers = {"Content-Type": "application/json"}
            payload = {
                "api_key": tavily_key,
                "query": query,
                "search_depth": "basic",
                "max_results": 5
            }
            response = httpx.post("https://api.tavily.com/search", json=payload, headers=headers, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                snippets = []
                for r in results[:5]:
                    title = r.get("title", "No Title")
                    url = r.get("url", "")
                    content = r.get("content", "")
                    if content:
                        snippets.append(f"Source: {url} ({title})\nContent: {content}")
                if snippets:
                    print(f"✅ Successfully retrieved {len(snippets)} results from Tavily.")
                    return snippets
            else:
                print(f"⚠️ Tavily API returned status code {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ Tavily API call failed or timed out: {str(e)}")
            
    # Try Serper as fallback
    if serper_key:
        try:
            print(f"🔍 Falling back to Serper for: '{query}'")
            headers = {
                "X-API-KEY": serper_key,
                "Content-Type": "application/json"
            }
            payload = {"q": query, "num": 5}
            response = httpx.post("https://google.serper.dev/search", json=payload, headers=headers, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                organic = data.get("organic", [])
                snippets = []
                for item in organic[:5]:
                    title = item.get("title", "No Title")
                    url = item.get("link", "")
                    snippet = item.get("snippet", "")
                    if snippet:
                        snippets.append(f"Source: {url} ({title})\nContent: {snippet}")
                if snippets:
                    print(f"✅ Successfully retrieved {len(snippets)} results from Serper.")
                    return snippets
            else:
                print(f"⚠️ Serper API returned status code {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ Serper API call failed or timed out: {str(e)}")
            
    return []


# ------------------ Database Setup ------------------
DATABASE_URL = "sqlite:///app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)

class QuestionDB(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    question = Column(String)
    answer = Column(String)

# Create tables
Base.metadata.create_all(bind=engine)

# ------------------ Preload Default User ------------------
db = SessionLocal()
user_count = db.execute(select(func.count()).select_from(UserDB)).scalar_one()
if user_count == 0:
    default_user = UserDB(
        name="Admin",
        email="admin@test.com",
        password="1234"
    )
    db.add(default_user)
    db.commit()
db.close()

# ------------------ FastAPI Setup ------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Pydantic Models ------------------
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Topic(BaseModel):
    topic: str
    num_questions: Optional[int] = 5
    timestamp: Optional[int] = None
    seed: Optional[int] = None
    attempt: Optional[int] = 1
    difficulty: Optional[str] = None
    variation_prompt: Optional[str] = None
    request_id: Optional[str] = None
    force_new: Optional[bool] = False

# ------------------ Root Route ------------------
@app.get("/")
def root():
    return {"message": "AI Quiz & Tutor API is running", "status": "healthy"}

# ------------------ User Routes ------------------
@app.post("/register")
def register(user: UserRegister):
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.execute(
            select(UserDB).where(UserDB.email == user.email.strip().lower())
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered. Please sign in instead.")
        
        # Validate password length
        if len(user.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Create new user
        db_user = UserDB(
            name=user.name.strip(), 
            email=user.email.strip().lower(), 
            password=user.password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        print(f"✅ New user registered: {db_user.email}")
        
        # Return success response with user data (matching frontend expectations)
        return {
            "message": "Registration successful",
            "user": {
                "id": db_user.id,
                "name": db_user.name,
                "email": db_user.email,
                "username": db_user.name  # For compatibility
            },
            "token": f"user_{db_user.id}_token"  # Simple token (not secure, but works for your project)
        }
        
    except HTTPException:
        raise  # Re-raise HTTPException as-is
    except Exception as e:
        db.rollback()
        print(f"❌ Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        db.close()

@app.post("/login")
def login(user: UserLogin):
    db = SessionLocal()
    try:
        db_user = db.execute(
            select(UserDB).where(UserDB.email == user.email.strip().lower())
        ).scalar_one_or_none()
        
        if not db_user or db_user.password != user.password.strip():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print(f"✅ User logged in: {db_user.email}")
        
        return {
            "message": "Login successful", 
            "user": {
                "id": db_user.id,
                "name": db_user.name, 
                "email": db_user.email,
                "username": db_user.name
            },
            "token": f"user_{db_user.id}_token"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")
    finally:
        db.close()

# ------------------ AI Quiz Generation (MAXIMUM VARIATION) ------------------

# Global cache to store recent questions (in production, use Redis/database)
recent_questions_cache = {}

@app.post("/ai-questions")
def ai_questions(data: Topic):
    MAX_RETRIES = 3
    
    # ✅ EXTRACT ALL PARAMETERS
    topic = data.topic.strip()
    num_questions = data.num_questions or 5
    attempt = data.attempt or 1
    seed = data.seed or random.randint(1, 1000000)
    
    print(f"\n{'='*70}")
    print(f"🎯 QUIZ GENERATION - ATTEMPT #{attempt}")
    print(f"{'='*70}")
    print(f"📚 Topic: {topic}")
    print(f"🔢 Seed: {seed}")
    print(f"🔄 Attempt: {attempt}")
    print(f"{'='*70}\n")
    
    # ✅ MAXIMUM VARIATION STRATEGIES
    random.seed(seed + attempt * 1000)  # Different seed each attempt
    
    # Question type variations (VERY DIFFERENT approaches)
    question_types = [
        {
            "style": "Definition & Concept-Based",
            "instruction": "Focus on 'What is...', 'Define...', 'Explain the concept of...' type questions",
            "approach": "theoretical understanding and definitions"
        },
        {
            "style": "Application & Problem-Solving",
            "instruction": "Focus on 'How would you...', 'What happens when...', 'Solve this problem...' type questions",
            "approach": "practical application and hands-on scenarios"
        },
        {
            "style": "Comparison & Analysis",
            "instruction": "Focus on 'Compare...', 'What is the difference...', 'Which is better...' type questions",
            "approach": "comparing alternatives and analyzing trade-offs"
        },
        {
            "style": "Real-World Scenarios",
            "instruction": "Focus on 'In a real project...', 'A developer needs to...', scenario-based questions",
            "approach": "real-world situations and case studies"
        },
        {
            "style": "Debugging & Troubleshooting",
            "instruction": "Focus on 'What's wrong with...', 'How to fix...', 'Why does this fail...' type questions",
            "approach": "identifying and fixing errors"
        },
        {
            "style": "Best Practices & Optimization",
            "instruction": "Focus on 'What is the best way...', 'How to optimize...', 'Which approach is recommended...'",
            "approach": "industry best practices and optimization techniques"
        },
        {
            "style": "Advanced & Edge Cases",
            "instruction": "Focus on advanced topics, edge cases, and uncommon scenarios in {topic}",
            "approach": "challenging and advanced concepts"
        },
        {
            "style": "Beginner-Friendly Fundamentals",
            "instruction": "Focus on basic, foundational questions suitable for beginners learning {topic}",
            "approach": "simple and fundamental concepts"
        }
    ]
    
    # Difficulty levels with specific instructions
    difficulty_levels = [
        {
            "level": "Easy",
            "instruction": "Make questions straightforward with clear correct answers. Suitable for beginners."
        },
        {
            "level": "Medium",
            "instruction": "Make questions moderately challenging, requiring good understanding of the topic."
        },
        {
            "level": "Hard",
            "instruction": "Make questions challenging and thought-provoking, requiring deep knowledge."
        },
        {
            "level": "Mixed",
            "instruction": "Include a mix of easy, medium, and hard questions."
        }
    ]
    
    # Content focus areas
    focus_areas = [
        "syntax and structure",
        "common use cases",
        "error handling",
        "performance considerations",
        "security aspects",
        "design patterns",
        "integration with other technologies",
        "version differences and updates",
        "common mistakes to avoid",
        "industry standards"
    ]
    
    # Select variation for this attempt (deterministic but different each time)
    selected_type = question_types[attempt % len(question_types)]
    selected_difficulty = difficulty_levels[attempt % len(difficulty_levels)]
    selected_focuses = random.sample(focus_areas, k=min(3, len(focus_areas)))
    
    # ✅ CHECK CACHE - Get previous questions to avoid repetition
    cache_key = topic.lower().replace(" ", "_")
    previous_questions = recent_questions_cache.get(cache_key, [])
    
    # Keep only last 20 questions in cache
    if len(previous_questions) > 20:
        previous_questions = previous_questions[-20:]
        recent_questions_cache[cache_key] = previous_questions
    
    # Create avoidance instructions
    avoidance_text = ""
    if previous_questions and len(previous_questions) > 0:
        avoidance_text = f"\n\n❌ DO NOT REPEAT OR PARAPHRASE THESE PREVIOUS QUESTIONS:\n"
        for idx, prev_q in enumerate(previous_questions[-10:], 1):  # Show last 10
            avoidance_text += f"{idx}. {prev_q}\n"
        avoidance_text += "\n⚠️ YOUR QUESTIONS MUST BE COMPLETELY DIFFERENT FROM THE ABOVE LIST!\n"
    
    for retry_attempt in range(MAX_RETRIES):
        try:
            # ✅ SUPER DETAILED PROMPT WITH MAXIMUM VARIATION
            prompt = f"""🎯 QUIZ GENERATION REQUEST #{attempt}

**TOPIC:** {topic}

**QUESTION TYPE FOR THIS QUIZ:** {selected_type['style']}
{selected_type['instruction']}

**DIFFICULTY LEVEL:** {selected_difficulty['level']}
{selected_difficulty['instruction']}

**CONTENT FOCUS:** Your questions should cover these aspects:
{', '.join(selected_focuses)}

**VARIATION REQUIREMENTS:**
- This is quiz attempt #{attempt}
- Use approach: {selected_type['approach']}
- Random seed: {seed}
- Make questions UNIQUE and CREATIVE
- Avoid common/generic questions
- Use diverse phrasing and examples
{avoidance_text}

**YOUR TASK:**
Generate {num_questions} multiple-choice questions about {topic} that follow the "{selected_type['style']}" approach.

**CRITICAL RULES:**
1. Each question MUST be completely different from previous attempts
2. Use the "{selected_type['style']}" question style
3. Each question must have EXACTLY 4 options (A, B, C, D)
4. Mark one correct_answer clearly
5. Provide a helpful explanation for each question
6. Make questions interesting and educational
7. DO NOT use generic or commonly asked questions
8. Be creative with examples and scenarios

**OUTPUT FORMAT:**
Return ONLY a valid JSON array (no markdown, no extra text):

[
  {{
    "id": 1,
    "question": "Your question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Brief explanation of why this is correct"
  }}
]

🚀 Begin generating {num_questions} UNIQUE {selected_type['style'].lower()} questions now!"""

            print(f"📤 Sending request (Retry {retry_attempt + 1}/{MAX_RETRIES})...")
            print(f"   Type: {selected_type['style']}")
            print(f"   Difficulty: {selected_difficulty['level']}")
            print(f"   Focus: {', '.join(selected_focuses)}")
            print(f"   Previous questions to avoid: {len(previous_questions)}")
            
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a creative quiz generator. Generate UNIQUE questions that are different from previous attempts. Current attempt: #{attempt}. Style: {selected_type['style']}"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.95,  # ✅ MAXIMUM creativity
                max_tokens=3000,
                top_p=0.95,  # ✅ More diverse outputs
            )
            
            raw_text = response.choices[0].message.content.strip()
            
            # Clean up response
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            # Extract JSON array
            start = raw_text.find("[")
            end = raw_text.rfind("]") + 1
            
            if start == -1 or end == 0:
                raise ValueError("No JSON array found in response")
            
            json_text = raw_text[start:end]
            questions = json.loads(json_text)
            
            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("Invalid question format")
            
            # Validate questions
            for q in questions:
                if not all(key in q for key in ["question", "options", "correct_answer"]):
                    raise ValueError("Missing required fields in question")
                if len(q["options"]) != 4:
                    raise ValueError("Each question must have exactly 4 options")
            
            # ✅ SAVE QUESTIONS TO CACHE (to avoid repetition)
            new_question_texts = [q["question"] for q in questions]
            recent_questions_cache[cache_key] = previous_questions + new_question_texts
            
            print(f"✅ Successfully generated {len(questions)} UNIQUE questions!")
            print(f"   Style: {selected_type['style']}")
            print(f"   Difficulty: {selected_difficulty['level']}")
            print(f"   Total questions in cache: {len(recent_questions_cache[cache_key])}")
            print(f"{'='*70}\n")
            
            # Preview first question
            if questions:
                print(f"📝 Sample question: {questions[0]['question'][:80]}...")
            
            return {
                "questions": questions,
                "topic": topic,
                "attempt": attempt,
                "style": selected_type['style'],
                "difficulty": selected_difficulty['level'],
                "message": f"Generated {len(questions)} unique questions using {selected_type['style']} approach"
            }
            
        except json.JSONDecodeError as e:
            print(f"❌ Retry {retry_attempt + 1} - JSON parse error: {str(e)}")
            if retry_attempt < MAX_RETRIES - 1:
                seed = random.randint(1, 1000000)
        except Exception as e:
            print(f"❌ Retry {retry_attempt + 1} - Error: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("❌ All retry attempts failed")
    raise HTTPException(
        status_code=500,
        detail="Failed to generate questions after multiple attempts. Please try again."
    )

# ------------------ AI Tutor (Chat Interface) ------------------
@app.post("/ai-tutor")
async def ai_tutor(request: dict):
    """
    AI Tutor endpoint - ChatGPT-like interface
    
    Request body:
    {
        "question": "User's question here",
        "conversation_history": [...]
    }
    """
    try:
        # Extract data from request
        question = request.get("question", "")
        conversation_history = request.get("conversation_history", [])
        print(f"\n=== AI TUTOR REQUEST ===")
        print(f"Question: {question}")
        print(f"Conversation history: {len(conversation_history)} messages")
        
        # Validate inputs
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        if not GROQ_API_KEY:
            print("❌ ERROR: GROQ_API_KEY not found")
            raise HTTPException(
                status_code=500, 
                detail="GROQ_API_KEY not configured. Please set it in .env file."
            )
        
        # Build messages for Groq
        messages = [
            {
                "role": "system", 
                "content": """You are an expert AI Tutor and Senior Software Architect. Your goal is to help students learn complex topics with clarity and precision.

Follow these pedagogical guidelines:
1. **Always use Markdown** for formatting. Use bolding, bullet points, and numbered lists to structure your explanations.
2. **Mandatory Code Blocks**: When providing code, ALWAYS use fenced code blocks with the appropriate language identifier (e.g., ```python, ```javascript).
3. **Multi-line Formatting**: Ensure code is properly indented and has correct newlines. DO NOT send code as a single line.
4. **Structured Explanations**: Start with a high-level overview, followed by detailed points, and end with a practical example or a "Quick Summary" section.
5. **Friendly but Professional**: Be supportive and encouraging, but maintain the authority of an expert educator.
6. **Conciseness vs Detail**: Don't be overly wordy, but ensure the core concept is fully explained. Use simple analogies for complex topics.

If you don't know the answer, admit it and suggest related topics to explore. Stay focused on educational and technical topics."""
            }
        ]
        
        # Add conversation history (for context)
        for msg in conversation_history:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Retrieve web search context (RAG step)
        search_results = retrieve_context(question)
        
        if search_results:
            search_context_str = "\n\n".join(search_results)
            formatted_question = f"Using the following current information:\n{search_context_str}\n\nExplain {question} to a beginner. If the search results don't add anything beyond general knowledge, rely on your own understanding."
            print("📝 Applied RAG prompt template with retrieved search results.")
        else:
            formatted_question = question
            print("📝 No search results retrieved. Falling back to default prompt.")
        
        # Add current question
        messages.append({"role": "user", "content": formatted_question})
        
        print(f"📤 Sending {len(messages)} messages to Groq API...")
        
        # Call Groq API
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        answer = response.choices[0].message.content.strip()
        
        print(f"✅ Got response ({len(answer)} characters)")
        print(f"Preview: {answer[:100]}...")
        
        return {
            "answer": answer,
            "question": question
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ ERROR in ai_tutor: {error_msg}")
        
        # Handle specific errors
        if "authentication" in error_msg.lower() or "api_key" in error_msg.lower():
            raise HTTPException(
                status_code=500, 
                detail="Invalid Groq API key. Get one from https://console.groq.com/keys"
            )
        elif "rate_limit" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait and try again."
            )
        else:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500, 
                detail=f"AI Tutor error: {error_msg}"
            )

# ------------------ Quiz Feedback ------------------
@app.post("/quiz-feedback")
def quiz_feedback(data: dict):
    """Generate encouraging feedback based on quiz score"""
    try:
        score = data.get("score", 0)
        total = data.get("total", 0)
        topic = data.get("topic", "this topic")
        percentage = int((score / total) * 100) if total > 0 else 0
        
        print(f"\n=== QUIZ FEEDBACK ===")
        print(f"Score: {score}/{total} ({percentage}%)")
        
        prompt = f"""A student completed a quiz on {topic}.
Score: {score}/{total} ({percentage}%)

Provide brief, encouraging feedback (2-3 sentences) that:
1. Acknowledges their performance
2. Highlights what they did well
3. Suggests improvement if score < 80%

Be supportive and constructive."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )
        
        feedback = response.choices[0].message.content.strip()
        print(f"✅ Generated feedback")
        
        return {"feedback": feedback}
    except Exception as e:
        print(f"❌ Feedback error: {str(e)}")
        # Fallback feedback if AI fails
        if score / total >= 0.8:
            return {"feedback": "Excellent work! You have a strong understanding of this topic."}
        elif score / total >= 0.6:
            return {"feedback": "Good effort! Review the explanations and try again to improve."}
        else:
            return {"feedback": "Keep practicing! Review the material and take your time with each question."}

# ------------------ Health Check ------------------
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "groq_api_configured": bool(GROQ_API_KEY),
        "database": "connected"
    }