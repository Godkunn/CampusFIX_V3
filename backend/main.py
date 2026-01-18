# main.py
import uvicorn
import os
import csv
import io
import httpx  # Required for Chatbot
from datetime import datetime, timedelta, timezone
# IST (UTC + 5:30)
IST = timezone(timedelta(hours=5, minutes=30))
from typing import Optional, List
from enum import Enum
from dotenv import load_dotenv
from sqlalchemy import text

# --- GOOGLE SHEETS IMPORTS ---
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- PDF GENERATION IMPORTS ---
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, case, func, or_, Float
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- IMPORTS FOR NOTIFICATIONS ---
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import firebase_admin
from firebase_admin import credentials

# ==========================================
# 1. CONFIGURATION & DATABASE
# ==========================================
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
if not SECRET_KEY:
    # Fallback only for local testing if env is missing, but warn user
    print("⚠️  WARNING: SECRET_KEY not found. Using unsafe default for testing.")
    SECRET_KEY = "campusfix_unsafe_fallback_key"

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

# ==========================================
# FINAL DATABASE CONNECTION - PRODUCTION READY
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL is missing from environment variables!")

# Fix postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ✅ FORCE SESSION POOLER (Port 6543)
# Your Supabase has 46 connections available in Session Mode
if ":5432" in DATABASE_URL:
    print("⚡ Switching to Session Pooler (Port 6543)...")
    DATABASE_URL = DATABASE_URL.replace(":5432", ":6543")

# Add SSL requirement
if "?" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"
elif "sslmode" not in DATABASE_URL:
    DATABASE_URL += "&sslmode=require"

print("☁️ Connecting to Supabase PostgreSQL...")

# ✅ CREATE ENGINE WITH OPTIMAL SETTINGS
engine = create_engine(
    DATABASE_URL,
    pool_size=5,              # Conservative for Render free tier
    max_overflow=0,           # No bursts (prevents crashes)
    pool_timeout=30,
    pool_recycle=300,         # Recycle every 5 mins
    pool_pre_ping=True,       # Check health before use
    connect_args={
        "sslmode": "require",
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    # ✅ CRITICAL FIX for Transaction Mode
    execution_options={
        "isolation_level": "AUTOCOMMIT"
    }
)

# Ensure default schema is public (Neon fix)
with engine.connect() as conn:
    conn.execute(text("SET search_path TO public"))


print("✅ Connected to Supabase (Session Mode, Port 6543)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 2. GLOBAL HELPERS (SHEETS, TIME, NOTIFICATIONS)
# ==========================================

SHEETS_CLIENT = None

def init_google_sheets():
    global SHEETS_CLIENT
    if os.path.exists("google_credentials.json"):
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds = ServiceAccountCredentials.from_json_keyfile_name("google_credentials.json", scope)
            SHEETS_CLIENT = gspread.authorize(creds)
            print("✅ Google Sheets Connected")
        except Exception as exc:
            # show meaningful message
            print(f"⚠️ Google Sheets Error: {exc}")
    else:
        print("⚠️ Notice: google_credentials.json not found. Sheets integration disabled.")

# --- DATE HELPER ---
def get_current_week_start():
    today = datetime.now(IST)
    start = today - timedelta(days=today.weekday())
    return start.strftime("%Y-%m-%d")

# --- ROBUST SHEET HELPERS ---
def append_issue_to_sheet(issue_data, user_data):
    if not SHEETS_CLIENT:
        return
    try:
        sheet = SHEETS_CLIENT.open("CampusFix_Issues_Database").sheet1
        try:
            headers = sheet.row_values(1)
        except Exception:
            headers = []

        if not headers:
            sheet.append_row(["Ticket ID", "Date", "Student Name", "Email", "Hostel", "Room", "Category", "Title", "Description", "Priority", "Status", "Trust Score"])

        row = [
            issue_data.id,
            str(datetime.now(IST).date()),
            user_data.full_name,
            user_data.email,
            user_data.hostel,
            user_data.room_no,
            issue_data.category,
            issue_data.title,
            issue_data.description,
            issue_data.priority,
            "Pending",
            user_data.credit_score
        ]
        sheet.append_row(row)
        print(f"📄 Logged Issue #{issue_data.id}")
    except Exception as exc:
        print(f"❌ Failed to log issue: {exc}")

def append_rating_to_sheet(rating_data, user_data):
    if not SHEETS_CLIENT:
        return
    try:
        sheet = SHEETS_CLIENT.open("CampusFix_Mess_Ratings").sheet1
        try:
            headers = sheet.row_values(1)
        except Exception:
            headers = []

        if not headers:
            sheet.append_row(["Date", "Student", "Hostel", "Mess Name", "Hygiene (1-5)", "Taste (1-5)", "Quality (1-5)", "Review", "Suggestions"])

        row = [
            str(datetime.now(IST).date()),
            user_data.full_name,
            user_data.hostel,
            rating_data.mess_name,
            rating_data.hygiene,
            rating_data.taste,
            rating_data.quality,
            rating_data.review,
            rating_data.suggestions
        ]
        sheet.append_row(row)
        print("📄 Logged Mess Rating")
    except Exception as exc:
        print(f"❌ Failed to log rating: {exc}")

email_conf = ConnectionConfig(
    MAIL_USERNAME = "godayush10@gmail.com",
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = "admin@campusfix.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

firebase_app = None
if os.path.exists("serviceAccountKey.json"):
    try:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_app = firebase_admin.initialize_app(cred)
        print("✅ Firebase Initialized")
    except Exception as exc:
        print(f"⚠️ Firebase Error: {exc}")
else:
    print("⚠️ Notice: serviceAccountKey.json not found. Push notifications disabled.")

async def send_notification(email: str, subject: str, body: str):
    if email:
        message = MessageSchema(subject=subject, recipients=[email], body=body, subtype=MessageType.plain)
        fm = FastMail(email_conf)
        try:
            await fm.send_message(message)
            print(f"✅ Email sent to {email}")
        except Exception as exc:
            print(f"❌ Email failed: {exc}")
    # keep a minimal push log that doesn't rely on 'e'
    print(f"📲 [Push Log] To: {email} | Msg: {subject}")

# ==========================================
# 3. DATABASE MODELS
# ==========================================
class IssueStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Solved"
    DEFECTED = "Defected"
    DUPLICATE = "Duplicate"
    UNNECESSARY = "Unnecessary"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    role = Column(String)
    password_hash = Column(String)
    profile_pic = Column(Text, nullable=True)
    enrollment_no = Column(String, nullable=True)
    registration_no = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    hostel = Column(String, nullable=True)
    requested_hostel = Column(String, nullable=True)
    block = Column(String, nullable=True)
    room_no = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)
    fcm_token = Column(String, nullable=True)
    credit_score = Column(Float, default=0.0)

class MessRating(Base):
    __tablename__ = "mess_ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    mess_name = Column(String)
    week_start = Column(String)
    hygiene = Column(Integer)
    taste = Column(Integer)
    quality = Column(Integer)
    review = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    issue_id = Column(Integer, ForeignKey("issues.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")

class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    category = Column(String)
    sub_location = Column(String)
    specific_location = Column(String)
    priority = Column(String)
    status = Column(String, default=IssueStatus.PENDING)
    image_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, nullable=True)
    review = Column(Text, nullable=True)
    owner = relationship("User")
    comments = relationship("Comment", order_by=Comment.created_at.asc())

# Move schema creation into a safe retry helper
import time
from sqlalchemy.exc import OperationalError

def create_schema_with_retries(max_retries: int = 5, base_delay: float = 2.0):
    """
    Try to create tables with exponential backoff.
    If DB is unreachable we log and continue so the app can start.
    """
    for attempt in range(1, max_retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ DB schema ensured")
            return
        except OperationalError as exc:
            wait = base_delay * (2 ** (attempt - 1))
            print(f"⚠️ DB connect attempt {attempt}/{max_retries} failed: {exc!r}. Retrying in {wait}s...")
            time.sleep(wait)
    # Final fallback: don't raise — allow app to start without blocking
    print("❌ Could not connect to DB after retries — continuing without schema creation. Run migrations manually.")

from pydantic import ConfigDict
# ==========================================
# 4. PYDANTIC SCHEMAS
# ==========================================
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str
    enrollment_no: Optional[str] = None
    registration_no: Optional[str] = None
    hostel: Optional[str] = None
    block: Optional[str] = None
    room_no: Optional[str] = None
    semester: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    hostel: Optional[str] = None
    block: Optional[str] = None
    room_no: Optional[str] = None
    semester: Optional[str] = None
    profile_pic: Optional[str] = None

class TokenUpdate(BaseModel):
    token: str

class HostelRequest(BaseModel):
    new_hostel: str

class HostelAction(BaseModel):
    action: str

class IssueCreate(BaseModel):
    title: str
    description: str
    category: str
    sub_location: str
    specific_location: str
    priority: str
    image_data: Optional[str] = None

class IssueUpdateStatus(BaseModel):
    status: str

class CommentCreate(BaseModel):
    text: str

class CommentResponse(BaseModel):
    id: int
    text: str
    created_at: datetime
    user_name: str
    model_config = ConfigDict(from_attributes=True)

class RatingCreate(BaseModel):
    rating: int
    review: Optional[str] = None

class MessRatingCreate(BaseModel):
    mess_name: str
    hygiene: int
    taste: int
    quality: int
    review: Optional[str] = None
    suggestions: Optional[str] = None
    image_data: Optional[str] = None

class IssueResponse(IssueCreate):
    id: int
    status: str
    created_at: datetime
    owner_name: str
    rating: Optional[int] = None
    review: Optional[str] = None
    comments: List[CommentResponse] = []
    owner_credit_score: Optional[float] = 0.0
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    total_issues: int
    pending: int
    resolved: int
    my_issues: int

class GoogleLogin(BaseModel):
    token: str
    role: str = "student"

# --- CHATBOT MODELS ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# ==========================================
# 5. AUTHENTICATION & APP INIT
# ==========================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_google_sheets()

    # Ensure DB schema but don't crash the app if DB unreachable
    create_schema_with_retries(max_retries=5, base_delay=2.0)

    yield
    # Shutdown (if needed)

# Single app instance using lifespan
app = FastAPI(lifespan=lifespan)

# CORS (keep your origins; add any new frontend origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://campusfix-v3.onrender.com",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_password_hash(password):
    return pwd_context.hash(password.encode('utf-8')[:72])

def verify_password(plain, hashed):
    return pwd_context.verify(plain.encode('utf-8')[:72], hashed)

def create_token(data: dict):
    return jwt.encode({**data, "exp": datetime.now(IST) + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.email == payload.get("sub")).first()
        if not user:
            raise HTTPException(status_code=401)
        return user
    except Exception:
        raise HTTPException(status_code=401)

# ==========================================
# 6. API ROUTES
# ==========================================

@app.get("/")
def read_root():
    return {"message": "CampusFix V3 API is Running & Secured!"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    """
    Lightweight endpoint for uptime monitors.
    Must be fast and non-blocking (no DB calls).
    """
    return {"status": "ok"}

# --- AUTH ROUTES ---
@app.post("/register")
def register(u: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == u.email).first():
        raise HTTPException(400, "Email exists")
    db.add(User(
        email=u.email, full_name=u.full_name, password_hash=get_password_hash(u.password), role=u.role,
        enrollment_no=u.enrollment_no, registration_no=u.registration_no, semester=u.semester,
        hostel=u.hostel, block=u.block, room_no=u.room_no, phone=u.phone, department=u.department
    ))
    db.commit()
    return {"msg": "Success"}

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(400, "Invalid credentials")
    return {"access_token": create_token({"sub": user.email}), "token_type": "bearer"}

@app.post("/google-login")
def google_login(g: GoogleLogin, db: Session = Depends(get_db)):
    try:
        claims = jwt.get_unverified_claims(g.token)
        email = claims.get("email")
        if not email:
            raise HTTPException(400, "Invalid Google Token")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, full_name=claims.get("name"), role=g.role,
                        password_hash=get_password_hash("google_auth_user"),
                        profile_pic=claims.get("picture"))
            db.add(user)
            db.commit()
            db.refresh(user)
        return {"access_token": create_token({"sub": user.email}), "token_type": "bearer"}
    except Exception as exc:
        print("⚠️ Google login error:", exc)
        raise HTTPException(400, "Google Login Failed")

# --- USER ROUTES ---
@app.get("/users/me")
def me(user: User = Depends(get_current_user)):
    return user

@app.put("/users/me")
def update_profile(u: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in u.dict(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@app.put("/users/fcm-token")
def update_fcm_token(t: TokenUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.fcm_token = t.token
    db.commit()
    return {"msg": "Token Updated"}

@app.post("/users/request-hostel")
def request_hostel_change(req: HostelRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.requested_hostel = req.new_hostel
    db.commit()
    return {"msg": "Request sent to Admin"}

@app.get("/users/all")
def get_all_users(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student':
        raise HTTPException(403, "Not authorized")
    return db.query(User).filter(User.role == 'student').all()

@app.post("/users/{id}/manage-hostel")
def manage_hostel_request(id: int, act: HostelAction, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student':
        raise HTTPException(403, "Not authorized")
    student = db.query(User).filter(User.id == id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    if act.action == "approve":
        student.hostel = student.requested_hostel
    student.requested_hostel = None
    db.commit()
    return {"msg": f"Request {act.action}d"}

# ==========================================
# 7. AI CHATBOT ROUTE (ROBUST FIX)
# ==========================================
@app.post("/chat")
async def chat_endpoint(req: ChatRequest, user: User = Depends(get_current_user)):
    url = "https://api.perplexity.ai/chat/completions"

    # 1. Initialize with System Prompt
    clean_history = [
        {
            "role": "system",
            "content": (
                "You are CampusFix AI, a helpful and witty assistant for students at NIT/IIIT Agartala. "
                "Keep your answers SHORT, CRISP, and friendly. "
                "Use emojis."
            )
        }
    ]

    # 2. Smart Merger & Filter (Fixes 'Alternating Role' Error)
    for msg in req.messages:
        # Ignore invalid roles or empty messages
        if msg.role not in ["user", "assistant"] or not msg.content.strip():
            continue

        last_role = clean_history[-1]["role"]

        if msg.role == last_role:
            # If same role twice (e.g. User -> User), MERGE content
            clean_history[-1]["content"] += f"\n\n{msg.content}"
        elif last_role == "system" and msg.role == "assistant":
            # Cannot start with Assistant after System. Ignore it.
            continue
        else:
            # Valid alternation (User -> Assistant or Assistant -> User)
            clean_history.append({"role": msg.role, "content": msg.content})

    # 3. Final Check: Last message MUST be 'user'
    if clean_history[-1]["role"] != "user":
        # Fallback if history is empty or ends with assistant
        clean_history.append({"role": "user", "content": "Hello"})

    payload = {
        "model": "sonar",
        "messages": clean_history,
        "temperature": 0.7
    }

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            # Increased timeout for robustness
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)

            if response.status_code != 200:
                print(f"❌ Perplexity API Error: {response.text}")
                return {"reply": "⚠️ My brain is fuzzy (API Error). Try again later."}

            data = response.json()
            # defensive access
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {}).get("content") if isinstance(choice, dict) else None
            return {"reply": message or "⚠️ No reply from AI"}
        except Exception as exc:
            print(f"❌ AI Brain Freeze Error: {exc}")
            return {"reply": "⚠️ Connection error. Please try again."}

# --- MESS ROUTES ---
# ==========================================
# MESS ANALYTICS & SYNC ENGINE
# ==========================================
from sqlalchemy import and_, func

def get_sheet():
    if not SHEETS_CLIENT:
        raise RuntimeError("Google Sheets not initialized")
    return SHEETS_CLIENT.open("CampusFix_Mess_Ratings").sheet1

def _parse_sheet_date(date_str):
    """
    Robust Date Parser: Handles multiple formats (DD-MM-YYYY, YYYY-MM-DD, etc.)
    Returns timezone-aware datetime (IST).
    """
    if not date_str:
        return None
    date_str = str(date_str).strip()
    # List of common formats to try
    formats = ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"]
    
    for fmt in formats:
        try:
            d = datetime.strptime(date_str, fmt)
            return d.replace(tzinfo=IST)
        except ValueError:
            continue
            
    # Fallback for ISO format
    try:
        return datetime.fromisoformat(date_str).replace(tzinfo=IST)
    except ValueError:
        return None

def read_mess_from_sheet(mess: Optional[str] = None):
    """
    Reads rows from Google Sheet and returns normalized dicts.
    """
    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()
    except Exception as exc:
        print(f"❌ Sheet read failed: {exc}")
        return []

    result = []
    for r in rows:
        mess_name = str(r.get("Mess Name", "")).strip()
        # Filter by mess if requested
        if mess and mess_name.lower() != mess.lower().strip():
            continue

        # Skip empty rows
        if not mess_name:
            continue

        # Safe integer conversion helper
        def safe_int(x):
            try:
                return int(x)
            except (ValueError, TypeError):
                return 0

        parsed_date = _parse_sheet_date(r.get("Date") or r.get("date"))

        result.append({
            "date": parsed_date,
            "mess_name": mess_name,
            "hygiene": safe_int(r.get("Hygiene (1-5)") or r.get("Hygiene")),
            "taste": safe_int(r.get("Taste (1-5)") or r.get("Taste")),
            "quality": safe_int(r.get("Quality (1-5)") or r.get("Quality")),
            "review": str(r.get("Review") or "").strip(),
            "suggestions": str(r.get("Suggestions") or "").strip(),
            "image": None, # Sheets don't store images easily, handled by upload
        })

    return result

def _week_start_for_date(dt: datetime):
    if not dt:
        return get_current_week_start()
    # Ensure dt is aware before converting
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    start = dt - timedelta(days=dt.weekday())
    return start.strftime("%Y-%m-%d")

def sync_sheet_rows_to_db(db: Session, rows: list):
    """
    Production-Grade Sync:
    Uses a 'Content Fingerprint' (Date + Mess + Ratings + Review)
    to distinguish multiple votes on the same day.
    """
    inserted = 0

    for row in rows:
        dt = row.get("date") or datetime.now(IST)

        # --- ROBUST UNIQUE MATCH ---
        db_match = db.query(MessRating).filter(
            func.date(MessRating.created_at) == dt.date(),
            func.lower(MessRating.mess_name) == row["mess_name"].lower(),
            MessRating.hygiene == int(row["hygiene"]),
            MessRating.taste == int(row["taste"]),
            MessRating.quality == int(row["quality"]),
            func.coalesce(MessRating.review, "") == (row["review"] or "")
        ).first()

        if db_match:
            # Exact same vote already exists → ignore
            continue

        # New unique vote
        new_r = MessRating(
            user_id=None,
            mess_name=row["mess_name"],
            week_start=_week_start_for_date(dt),
            hygiene=row["hygiene"],
            taste=row["taste"],
            quality=row["quality"],
            review=row["review"] or None,
            suggestions=row["suggestions"] or None,
            created_at=dt
        )
        db.add(new_r)
        inserted += 1

    try:
        if inserted:
            db.commit()
            print(f"✅ Sync Complete: {inserted} new reviews imported.")
        else:
            print("✅ Sync Verified: No new data.")
        return inserted, 0, True
    except Exception as exc:
        db.rollback()
        print(f"❌ DB Commit Failed: {exc}")
        return 0, 0, False

@app.get("/mess/analytics")
def get_mess_analytics(
    mess: Optional[str] = None,
    scope: str = "week",      # "week" | "all"
    force_sync: str = "false", # Accepts "true"/"false" string from frontend
    db: Session = Depends(get_db)
):
    # 1. TRIGGER SYNC?
    # Sync if explicitly requested OR if we are looking at 'all' time (to ensure freshness)
    # should_sync = (force_sync.lower() == 'true')

    # # Also auto-sync when admin is viewing all-time analytics
    # if not should_sync and scope == "all":
    #     should_sync = True

    # # Still sync if DB is empty
    # if not should_sync and db.query(MessRating).count() == 0:
    #     should_sync = True

    # if should_sync:
    #     try:
    #         print("🔄 Starting Sheet Sync...")
    #         sheet_rows = read_mess_from_sheet(mess)
    #         if sheet_rows:
    #             sync_sheet_rows_to_db(db, sheet_rows)
    #     except Exception as e:
    #         print(f"⚠️ Sync skipped (Sheet API error): {e}")

    # 2. QUERY DB (The Single Source of Truth)
    if scope == "all":
        query = db.query(MessRating)
    else:
        week_start = get_current_week_start()
        query = db.query(MessRating).filter(MessRating.week_start == week_start)

    if mess:
        query = query.filter(func.lower(MessRating.mess_name) == mess.lower().strip())

    ratings = query.all()
    total = len(ratings)

    # 3. Handle Empty State
    if total == 0:
        return {
            "avg": {"hygiene": 0, "taste": 0, "quality": 0, "overall": 0},
            "sentiment": "No data yet",
            "action_item": "Waiting for reviews...",
            "total": 0,
            "reviews": []
        }

    # 4. Compute Stats
    avg_h = sum(r.hygiene for r in ratings) / total
    avg_t = sum(r.taste for r in ratings) / total
    avg_q = sum(r.quality for r in ratings) / total
    overall = (avg_h + avg_t + avg_q) / 3

    # AI Sentiment Logic (Simple Heuristic)
    sentiment = "Neutral"
    action_item = "Maintain standards."
    
    if overall >= 4.0:
        sentiment = "Positive 🌟"
        action_item = "Reward vendor for consistency."
    elif overall < 2.0:
        sentiment = "Severe 🛑"
        action_item = "Consider terminating contract."
    elif overall < 3.0:
        sentiment = "Critical 🚨"
        action_item = "Immediate hygiene inspection required."

    # 5. Format Reviews (Newest First)
    reviews_list = []
    # Sort in Python to avoid complex DB sorting if created_at is mixed types
    sorted_ratings = sorted(ratings, key=lambda x: x.created_at or datetime.min, reverse=True)

    for r in sorted_ratings:
        # Only add "Voices" if there is content
        if (r.review and len(r.review) > 2) or (r.suggestions and len(r.suggestions) > 2) or r.image_data:
            reviews_list.append({
                "rating": round((r.hygiene + r.taste + r.quality) / 3, 1),
                "review": r.review,
                "suggestion": r.suggestions,
                "image": r.image_data,
                "date": r.created_at.strftime("%Y-%m-%d") if r.created_at else ""
            })

    return {
        "avg": {
            "hygiene": round(avg_h, 1),
            "taste": round(avg_t, 1),
            "quality": round(avg_q, 1),
            "overall": round(overall, 1)
        },
        "sentiment": sentiment,
        "action_item": action_item,
        "total": total,
        "reviews": reviews_list
    }

# --- ISSUE ROUTES ---
@app.post("/issues", response_model=IssueResponse)
def create_issue(i: IssueCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_issue = Issue(**i.dict(), owner_id=user.id)
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    background_tasks.add_task(append_issue_to_sheet, new_issue, user)

    return {
        **new_issue.__dict__,
        "owner_name": user.full_name,
        "comments": [],
        "owner_credit_score": user.credit_score
    }

@app.get("/issues")
def list_issues(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # CACHE STRATEGY: show cached data instantly; revalidate in background (5 minutes)
    response.headers["Cache-Control"] = "public, max-age=0, stale-while-revalidate=300"

    three_days_ago = datetime.now(IST) - timedelta(days=3)
    stale = db.query(Issue).filter(
        Issue.priority != "High",
        Issue.created_at < three_days_ago,
        Issue.status.in_([IssueStatus.PENDING, IssueStatus.IN_PROGRESS])
    ).all()
    for s in stale:
        s.priority = "High"
    if stale:
        db.commit()

    query = db.query(Issue).order_by(
        case((Issue.priority == "High", 1), (Issue.priority == "Medium", 2), else_=3),
        Issue.created_at.desc()
    )

    if user.role == 'student':
        query = query.filter(
            or_(
                Issue.sub_location == user.hostel,
                Issue.category.in_(['Mess', 'Academic']),
                Issue.owner_id == user.id
            )
        )
    try:
        db.execute(text("SELECT 1"))    # wake / revalidate dead SSL connection
        issues = query.all()
    except OperationalError:
        db.rollback()
        return JSONResponse(
            status_code=503,
            content={"detail": "Database temporarily unavailable. Please retry."}
        )

    results = []
    for i in issues:
        comments_formatted = [
            {
                "id": c.id,
                "text": c.text,
                "created_at": c.created_at,
                "user_name": c.user.full_name if c.user else "Unknown"
            }
            for c in i.comments
        ]

        issue_dict = {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "category": i.category,
            "sub_location": i.sub_location,
            "specific_location": i.specific_location,
            "priority": i.priority,
            "status": i.status,
            "image_data": i.image_data,
            "created_at": i.created_at,
            "owner_id": i.owner_id,
            "owner_name": i.owner.full_name if i.owner else "Unknown",
            "owner_credit_score": i.owner.credit_score if i.owner else 0.0,
            "rating": i.rating,
            "review": i.review,
            "comments": comments_formatted
        }
        results.append(issue_dict)

    return results

@app.patch("/issues/{id}/status")
async def update_status(id: int, u: IssueUpdateStatus, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == id).first()
    if not issue:
        raise HTTPException(404)
    if user.role == 'student' and u.status not in ['Solved', 'Unnecessary']:
        raise HTTPException(403)

    old_status = issue.status

    if old_status != u.status:
        issue.status = u.status

        if issue.owner:
            if u.status == "Solved" and old_status != "Solved":
                if user.role != 'student':
                    issue.owner.credit_score += 1.0
            elif u.status == "Defected" and old_status != "Defected":
                if user.role != 'student':
                    issue.owner.credit_score -= 0.5

        db.commit()

        if issue.owner and issue.owner.email:
            subject = f"CampusFix: Issue Updated to {u.status}"
            body = f"Hello {issue.owner.full_name},\n\nYour issue '{issue.title}' is now: {u.status}."
            if u.status == "Solved" and user.role != 'student':
                body += "\n\n🎉 You earned +1 Trust Point for a valid issue!"
            elif u.status == "Defected":
                body += "\n\n⚠️ Your Trust Score decreased by 0.5 due to an invalid report."

            background_tasks.add_task(send_notification, issue.owner.email, subject, body)

    return {"msg": "Updated"}

@app.delete("/issues/{id}")
def delete_issue(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == id).first()
    if not issue:
        raise HTTPException(404)
    if user.role == 'student' and issue.owner_id != user.id:
        raise HTTPException(403)
    db.delete(issue)
    db.commit()
    return {"msg": "Deleted"}

@app.post("/issues/{id}/comments")
async def add_comment(id: int, c: CommentCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == id).first()
    if not issue:
        raise HTTPException(404)

    db.add(Comment(text=c.text, issue_id=id, user_id=user.id))
    db.commit()

    if issue.owner and issue.owner.id != user.id and issue.owner.email:
        subject = f"New Comment on '{issue.title}'"
        body = f"Hello,\n\n{user.full_name} commented: \"{c.text}\""
        background_tasks.add_task(send_notification, issue.owner.email, subject, body)

    return {"msg": "Comment Added"}

@app.patch("/issues/{id}/rate")
def rate_issue(id: int, r: RatingCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == id).first()
    if not issue or issue.status != "Solved":
        raise HTTPException(400, "Issue must be Solved to rate.")

    issue.rating = r.rating
    issue.review = r.review
    db.commit()
    return {"msg": "Rated"}

@app.get("/stats", response_model=DashboardStats)
def stats(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Cache stats for 1 minute (background refresh)
    response.headers["Cache-Control"] = "public, max-age=0, stale-while-revalidate=60"

    total = db.query(Issue).count()
    pending = db.query(Issue).filter(Issue.status == "Pending").count()
    resolved = db.query(Issue).filter(Issue.status == "Solved").count()
    my_issues = db.query(Issue).filter(Issue.owner_id == user.id).count()
    return {"total_issues": total, "pending": pending, "resolved": resolved, "my_issues": my_issues}

import io
import csv
import os
from datetime import datetime, timedelta
import pytz

# FastAPI & Database
from fastapi import Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

# ReportLab (PDF Generation)
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

# Define Timezone (Prevents crash if IST is missing)
IST = pytz.timezone('Asia/Kolkata')

# ==========================================
# 8. REPORT GENERATION (TEST & PRODUCTION)
# ==========================================

# --- SIMPLE TEST ENDPOINTS (Use these to verify it works first) ---
@app.get("/test/report/pdf")
def test_pdf_report():
    """Test endpoint for PDF generation"""
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        styles = getSampleStyleSheet()
        elements.append(Paragraph("Test PDF Report", styles['Heading1']))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(f"Generated at: {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("✅ PDF Generation is Working!", styles['Normal']))
        
        # Simple table
        data = [
            ["Item", "Quantity", "Price"],
            ["Apple", "5", "$10"],
            ["Banana", "3", "$6"],
            ["Orange", "7", "$14"]
        ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=test_report.pdf"}
        )
    except Exception as e:
        return {"error": str(e)}

@app.get("/test/report/csv")
def test_csv_report():
    """Test endpoint for CSV generation"""
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Test CSV Report"])
        writer.writerow([f"Generated: {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([])
        writer.writerow(["Name", "Age", "City"])
        writer.writerow(["John Doe", "30", "New York"])
        writer.writerow(["Jane Smith", "25", "London"])
        writer.writerow(["Bob Johnson", "35", "Tokyo"])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": "attachment; filename=test_report.csv"}
        )
    except Exception as e:
        return {"error": str(e)}


# --- PRODUCTION REPORT GENERATION ---
@app.get("/reports/download")
def download_report(
    type: str,
    report_range: str = Query(..., alias="range"),
    format: str = "pdf",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # validate report type always
    if type not in ('issues', 'mess'):
        raise HTTPException(400, "Invalid report type")

    # only admins can generate reports
    if user.role == 'student':
        raise HTTPException(403, "Admins only")

    # 1. Advanced Date Logic
    query_date = datetime.now(IST)
    title_range = ""

    # Ensure DB connection is healthy before heavy work
    try:
        db.execute(text("SELECT 1"))
    except OperationalError:
        db.rollback()
        return JSONResponse(
            status_code=503,
            content={"detail": "Database temporarily unavailable. Please retry."}
        )

    if type == 'issues':
        if report_range == 'today':
            query_date = datetime.combine(datetime.now(IST).date(), datetime.min.time()).replace(tzinfo=IST)
            title_range = "Today's Report"

        elif report_range == 'yesterday':
            yesterday = datetime.now(IST) - timedelta(days=1)
            query_date = datetime.combine(yesterday.date(), datetime.min.time()).replace(tzinfo=IST)
            title_range = "Since Yesterday"

        elif report_range == '3days':
            query_date = datetime.now(IST) - timedelta(days=3)
            title_range = "Last 3 Days"

        elif report_range == 'week':
            query_date = datetime.now(IST) - timedelta(weeks=1)
            title_range = "Past 7 Days"

        elif report_range == 'month':
            query_date = datetime.now(IST) - timedelta(days=30)
            title_range = "Last 30 Days"

        elif report_range == '3months':
            query_date = datetime.now(IST) - timedelta(days=90)
            title_range = "Last 3 Months"

        elif report_range == 'semester':
            query_date = datetime.now(IST) - timedelta(days=180)
            title_range = "Full Semester History"

        else:
            query_date = datetime.min.replace(tzinfo=IST)
            title_range = "All Time History"


    elif type == 'mess':
        if report_range == 'week':
            query_date = datetime.now(IST) - timedelta(weeks=1)
            title_range = "This Week's Ratings"

        elif report_range == '2weeks':
            query_date = datetime.now(IST) - timedelta(weeks=2)
            title_range = "Last 2 Weeks"

        elif report_range == 'month':
            query_date = datetime.now(IST) - timedelta(days=30)
            title_range = "Last 30 Days"

        elif report_range == '3months':
            query_date = datetime.now(IST) - timedelta(days=90)
            title_range = "Last 3 Months"

        elif report_range == 'semester':
            query_date = datetime.now(IST) - timedelta(days=180)
            title_range = "Full Semester History"

        else:
            query_date = datetime.min.replace(tzinfo=IST)
            title_range = "All Time History"

    # 2. Fetch Data & Calculate Stats
    data = []
    headers = []
    stats_summary = {}

    if type == 'issues':
        rows = db.query(Issue).filter(Issue.created_at >= query_date).all()
        headers = ["ID", "Date", "Location", "Category", "Priority", "Status", "Student"]

        total_issues = len(rows)
        resolved = sum(1 for r in rows if r.status == 'Resolved' or r.status == 'Solved')
        pending = sum(1 for r in rows if r.status == 'Pending')
        in_progress = sum(1 for r in rows if r.status == 'In Progress')
        high_priority = sum(1 for r in rows if r.priority == 'High')

        # Count by category
        category_counts = {}
        for r in rows:
            cat = r.category or "Other"
            category_counts[cat] = category_counts.get(cat, 0) + 1

        stats_summary = {
            'total': total_issues,
            'resolved': resolved,
            'pending': pending,
            'in_progress': in_progress,
            'high_priority': high_priority,
            'resolution_rate': round((resolved / total_issues * 100) if total_issues > 0 else 0, 1),
            'category_breakdown': category_counts
        }

        for r in rows:
            loc = f"{r.sub_location[:10]}..." if r.sub_location and len(r.sub_location) > 10 else (r.sub_location or "-")
            data.append([
                str(r.id),
                r.created_at.strftime("%d %b %Y"),
                loc,
                r.category or "-",
                r.priority or "-",
                r.status,
                r.owner.full_name if r.owner else "Unknown"
            ])

    elif type == 'mess':
        rows = db.query(MessRating).filter(MessRating.created_at >= query_date).all()
        headers = ["Date", "Mess Hall", "Hygiene", "Taste", "Quality", "Overall Rating", "Review"]

        total_ratings = len(rows)
        if total_ratings > 0:
            avg_hygiene = round(sum(r.hygiene for r in rows if r.hygiene) / sum(1 for r in rows if r.hygiene), 2) if any(r.hygiene for r in rows) else 0
            avg_taste = round(sum(r.taste for r in rows if r.taste) / sum(1 for r in rows if r.taste), 2) if any(r.taste for r in rows) else 0
            avg_quality = round(sum(r.quality for r in rows if r.quality) / sum(1 for r in rows if r.quality), 2) if any(r.quality for r in rows) else 0
            avg_overall = round((avg_hygiene + avg_taste + avg_quality) / 3, 2) if (avg_hygiene + avg_taste + avg_quality) > 0 else 0
        else:
            avg_hygiene = avg_taste = avg_quality = avg_overall = 0

        stats_summary = {
            'total': total_ratings,
            'avg_hygiene': avg_hygiene,
            'avg_taste': avg_taste,
            'avg_quality': avg_quality,
            'avg_overall': avg_overall
        }

        for r in rows:
            overall = round((r.hygiene + r.taste + r.quality) / 3, 1) if all([r.hygiene, r.taste, r.quality]) else "-"
            review_short = (r.review[:30] + '..') if r.review and len(r.review) > 30 else (r.review or "-")
            data.append([
                r.created_at.strftime("%d %b %Y"),
                r.mess_name or "-",
                str(r.hygiene) if r.hygiene else "-",
                str(r.taste) if r.taste else "-",
                str(r.quality) if r.quality else "-",
                str(overall),
                review_short
            ])

    # 3. Generate ENHANCED PDF
    if format == 'pdf':
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=50,
            bottomMargin=50
        )
        elements = []
        styles = getSampleStyleSheet()
        
        # Define Custom Styles
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e293b'), spaceAfter=0, alignment=2)  # RIGHT align
        subtitle_style = ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=14, fontName='Helvetica', textColor=colors.HexColor('#64748b'), spaceAfter=20, alignment=0)
        header_meta_style = ParagraphStyle('HeaderMeta', parent=styles['Normal'], fontSize=10, fontName='Helvetica', textColor=colors.HexColor('#94a3b8'), spaceAfter=10)
        stats_label_style = ParagraphStyle('StatsLabel', parent=styles['Normal'], fontSize=10, fontName='Helvetica', textColor=colors.HexColor('#64748b'), alignment=1)
        stats_value_style = ParagraphStyle('StatsValue', parent=styles['Normal'], fontSize=20, fontName='Helvetica-Bold', textColor=colors.HexColor('#4f46e5'), alignment=1, spaceAfter=5)

        # --- FIXED HEADER WITH LOGO IMAGE ---
        logo_path = "logo.png"  # Path to your logo file

        # Check if logo exists, otherwise use text fallback
        if os.path.exists(logo_path):
            logo = RLImage(logo_path, width=1.2*inch, height=1.2*inch)
            logo.hAlign = 'LEFT'
        else:
            # Fallback: Create a styled text logo
            logo = Paragraph("<b><font size=20 color='#4f46e5'>CAMPUS</font><br/><font size=20 color='#4f46e5'>FIX</font></b>",
                           ParagraphStyle('LogoText', parent=styles['Normal'], fontSize=20, fontName='Helvetica-Bold', textColor=colors.HexColor('#4f46e5'), alignment=0))

        title = Paragraph(f"<b>{type.capitalize()} Report</b>", title_style)

        header_data = [[logo, title]]
        header_table = Table(header_data, colWidths=[2*inch, 4.5*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 15))

        # Divider Line
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 15))

        # Report Metadata
        gen_date = datetime.now(IST).strftime('%d %B %Y at %I:%M %p')
        elements.append(Paragraph(f"<b>Report Period:</b> {title_range} | <b>Generated:</b> {gen_date} IST", header_meta_style))
        elements.append(Spacer(1, 20))

        # --- STATISTICS SECTION ---
        if stats_summary:
            stats_data = []
            if type == 'issues':
                stats_data = [
                    [
                        Paragraph(str(stats_summary['total']), stats_value_style),
                        Paragraph(str(stats_summary['resolved']), stats_value_style),
                        Paragraph(str(stats_summary['pending']), stats_value_style),
                        Paragraph(str(stats_summary['in_progress']), stats_value_style),
                        Paragraph(f"{stats_summary['resolution_rate']}%", stats_value_style)
                    ],
                    [
                        Paragraph("Total Issues", stats_label_style),
                        Paragraph("Resolved", stats_label_style),
                        Paragraph("Pending", stats_label_style),
                        Paragraph("In Progress", stats_label_style),
                        Paragraph("Resolution Rate", stats_label_style)
                    ]
                ]
            else:
                stats_data = [
                    [
                        Paragraph(str(stats_summary['total']), stats_value_style),
                        Paragraph(f"{stats_summary['avg_hygiene']}", stats_value_style),
                        Paragraph(f"{stats_summary['avg_taste']}", stats_value_style),
                        Paragraph(f"{stats_summary['avg_quality']}", stats_value_style),
                        Paragraph(f"{stats_summary['avg_overall']}", stats_value_style)
                    ],
                    [
                        Paragraph("Total Ratings", stats_label_style),
                        Paragraph("Avg Hygiene", stats_label_style),
                        Paragraph("Avg Taste", stats_label_style),
                        Paragraph("Avg Quality", stats_label_style),
                        Paragraph("Overall Rating", stats_label_style)
                    ]
                ]

            stats_table = Table(stats_data, colWidths=[1.3*inch]*5)
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f1f5f9')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 15),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 15),
                ('TOPPADDING', (0, 1), (-1, 1), 10),
                ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#e2e8f0')),
            ]))
            elements.append(stats_table)
            elements.append(Spacer(1, 30))

        # 🎨 FIXED VISUAL CHARTS SECTION
        elements.append(Paragraph("<b>Visual Analytics</b>", ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=14, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e293b'), spaceAfter=15)))

        if type == 'issues' and stats_summary['total'] > 0:
            drawing1 = Drawing(250, 220)
            pie = Pie()
            pie.x = 50
            pie.y = 50
            pie.width = 120
            pie.height = 120

            pie_data = [
                stats_summary['resolved'] if stats_summary['resolved'] > 0 else 0.1,
                stats_summary['pending'] if stats_summary['pending'] > 0 else 0.1,
                stats_summary['in_progress'] if stats_summary['in_progress'] > 0 else 0.1
            ]
            pie.data = pie_data
            pie.labels = ['Resolved', 'Pending', 'In Progress']
            pie.slices.strokeWidth = 1
            pie.slices.strokeColor = colors.white
            pie.slices[0].fillColor = colors.HexColor('#10b981')
            pie.slices[1].fillColor = colors.HexColor('#ef4444')
            pie.slices[2].fillColor = colors.HexColor('#f59e0b')

            title_text = String(125, 190, 'Status Distribution', textAnchor='middle', fontSize=12, fillColor=colors.HexColor('#1e293b'), fontName='Helvetica-Bold')
            drawing1.add(title_text)
            drawing1.add(pie)

            drawing2 = Drawing(300, 220)
            categories = list(stats_summary.get('category_breakdown', {}).keys())[:5]
            counts = [stats_summary.get('category_breakdown', {}).get(cat, 0) for cat in categories]

            if categories and counts:
                bar = VerticalBarChart()
                bar.x = 40
                bar.y = 40
                bar.height = 130
                bar.width = 220
                bar.data = [counts]
                bar.categoryAxis.categoryNames = categories
                bar.categoryAxis.labels.angle = 20
                bar.categoryAxis.labels.fontSize = 8
                bar.categoryAxis.labels.dx = -5
                bar.categoryAxis.labels.dy = -5
                bar.bars[0].fillColor = colors.HexColor('#4f46e5')
                bar.bars[0].strokeColor = colors.HexColor('#4338ca')
                bar.bars[0].strokeWidth = 1
                bar.valueAxis.valueMin = 0
                bar.valueAxis.valueMax = max(counts) + 2 if counts else 10
                bar.valueAxis.valueStep = max(1, max(counts) // 5) if counts else 2

                title_text2 = String(150, 190, 'Issues by Category', textAnchor='middle', fontSize=12, fillColor=colors.HexColor('#1e293b'), fontName='Helvetica-Bold')
                drawing2.add(title_text2)
                drawing2.add(bar)

            chart_table = Table([[drawing1, drawing2]], colWidths=[3*inch, 3.5*inch])
            chart_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(chart_table)
            elements.append(Spacer(1, 25))

        elif type == 'mess' and stats_summary['total'] > 0:
            drawing3 = Drawing(500, 180)
            metrics = ['Hygiene', 'Taste', 'Quality', 'Overall']
            values = [
                stats_summary['avg_hygiene'],
                stats_summary['avg_taste'],
                stats_summary['avg_quality'],
                stats_summary['avg_overall']
            ]
            title_text3 = String(250, 160, 'Average Ratings Comparison', textAnchor='middle', fontSize=13, fillColor=colors.HexColor('#1e293b'), fontName='Helvetica-Bold')
            drawing3.add(title_text3)

            y_start = 130
            bar_height = 22
            bar_spacing = 10

            for i, (metric, value) in enumerate(zip(metrics, values)):
                y_pos = y_start - i * (bar_height + bar_spacing)
                bg_rect = Rect(120, y_pos, 300, bar_height)
                bg_rect.fillColor = colors.HexColor('#f1f5f9')
                bg_rect.strokeColor = colors.HexColor('#e2e8f0')
                bg_rect.strokeWidth = 0.5
                drawing3.add(bg_rect)

                value_width = (value / 5.0) * 300
                val_rect = Rect(120, y_pos, value_width, bar_height)
                val_rect.fillColor = colors.HexColor('#4f46e5')
                val_rect.strokeColor = None
                drawing3.add(val_rect)

                label = String(20, y_pos + 8, metric + ':', fontSize=11, fillColor=colors.HexColor('#1e293b'), fontName='Helvetica-Bold', textAnchor='start')
                drawing3.add(label)
                val_text = String(430, y_pos + 8, f"{value:.1f}/5.0", fontSize=10, fillColor=colors.HexColor('#4f46e5'), fontName='Helvetica-Bold', textAnchor='start')
                drawing3.add(val_text)

            elements.append(drawing3)
            elements.append(Spacer(1, 25))

        # --- DATA TABLE SECTION ---
        if data:
            elements.append(Paragraph(f"<b>Detailed Records ({len(data)} entries)</b>", ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=12, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e293b'), spaceAfter=12)))

            table_data = [headers] + data
            if type == 'issues':
                col_widths = [0.45*inch, 0.8*inch, 1.1*inch, 0.9*inch, 0.7*inch, 0.9*inch, 1.1*inch]
            else:
                col_widths = [0.8*inch, 0.9*inch, 0.7*inch, 0.7*inch, 0.7*inch, 0.8*inch, 1.5*inch]

            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))

            if type == 'issues':
                for i in range(1, len(data) + 1):
                    status = data[i-1][5]
                    if 'Resolved' in status or 'Solved' in status:
                        table.setStyle(TableStyle([('BACKGROUND', (5, i), (5, i), colors.HexColor('#dcfce7'))]))
                    elif 'Progress' in status:
                        table.setStyle(TableStyle([('BACKGROUND', (5, i), (5, i), colors.HexColor('#fef3c7'))]))
                    elif 'Pending' in status:
                        table.setStyle(TableStyle([('BACKGROUND', (5, i), (5, i), colors.HexColor('#fee2e2'))]))

            elements.append(table)
        else:
            elements.append(Paragraph("<b>No records found for this period.</b>", styles['Normal']))

        # --- FOOTER SECTION ---
        elements.append(Spacer(1, 30))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        footer_text = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, fontName='Helvetica', textColor=colors.HexColor('#94a3b8'), alignment=1)
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("📋 CampusFix Maintenance Portal | 🔐 Confidential Report | Generated by AI System<br/>⚖️ Authorized Personnel Only | Report valid for 30 days", footer_text))

        doc.build(elements)
        buffer.seek(0)
        filename = f"CampusFix_{type}_{report_range}.pdf"
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    # Excel/CSV Export
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([f"CampusFix {type.capitalize()} Report - {title_range}"])
        writer.writerow([f"Generated: {datetime.now(IST).strftime('%d %B %Y at %I:%M %p IST')}"])
        writer.writerow([])

        if stats_summary:
            writer.writerow(["Summary Statistics"])
            for key, value in stats_summary.items():
                if key != 'category_breakdown':
                    writer.writerow([key.replace('_', ' ').title(), value])
            writer.writerow([])

        writer.writerow(headers)
        writer.writerows(data)

        output.seek(0)
        filename = f"CampusFix_{type}_{report_range}.csv"
        content = output.getvalue()
        
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8-sig')), 
            media_type="text/csv; charset=utf-8-sig",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8-sig"
            }
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
