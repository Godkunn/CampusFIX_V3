import uvicorn
import os
import csv
import io
import httpx # Required for Chatbot
from datetime import datetime, timedelta, timezone
# IST (UTC + 5:30)
IST = timezone(timedelta(hours=5, minutes=30))
from typing import Optional, List
from enum import Enum
from dotenv import load_dotenv

# --- GOOGLE SHEETS IMPORTS ---
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- PDF GENERATION IMPORTS ---
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, case, or_, Float
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

# --- DATABASE CONNECTION LOGIC ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campusfix_v3.db")

# Fix for Render/Supabase URLs starting with "postgres://"
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Check which DB we are connecting to
if "sqlite" in DATABASE_URL:
    print("💽 Connecting to LOCAL SQLite Database...")
    connect_args = {"check_same_thread": False}
else:
    print("☁️  Connecting to REMOTE PostgreSQL (Supabase)...")
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
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
        except Exception as e:
            print(f"⚠️ Google Sheets Error: {e}")
    else:
        print("⚠️ Notice: google_credentials.json not found. Sheets integration disabled.")

# --- DATE HELPER ---
def get_current_week_start():
    today = datetime.now(IST)
    start = today - timedelta(days=today.weekday())
    return start.strftime("%Y-%m-%d")

# --- ROBUST SHEET HELPERS ---
def append_issue_to_sheet(issue_data, user_data):
    if not SHEETS_CLIENT: return
    try:
        sheet = SHEETS_CLIENT.open("CampusFix_Issues_Database").sheet1
        try:
            headers = sheet.row_values(1)
        except:
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
    except Exception as e:
        print(f"❌ Failed to log issue: {e}")

def append_rating_to_sheet(rating_data, user_data):
    if not SHEETS_CLIENT: return
    try:
        sheet = SHEETS_CLIENT.open("CampusFix_Mess_Ratings").sheet1
        try:
            headers = sheet.row_values(1)
        except:
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
        print(f"📄 Logged Mess Rating")
    except Exception as e:
        print(f"❌ Failed to log rating: {e}")

email_conf = ConnectionConfig(
    MAIL_USERNAME = "godayush10@gmail.com", 
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "bmdo ikef wjgl jwxz"), 
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
    except Exception as e:
        print(f"⚠️ Firebase Error: {e}")
else:
    print("⚠️ Notice: serviceAccountKey.json not found. Push notifications disabled.")

async def send_notification(email: str, subject: str, body: str):
    if email:
        message = MessageSchema(subject=subject, recipients=[email], body=body, subtype=MessageType.plain)
        fm = FastMail(email_conf)
        try:
            await fm.send_message(message)
            print(f"✅ Email sent to {email}")
        except Exception as e:
            print(f"❌ Email failed: {e}")
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

# Create Tables automatically if they don't exist
Base.metadata.create_all(bind=engine)

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
    class Config: from_attributes = True

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
    class Config: from_attributes = True

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

app = FastAPI()

@app.on_event("startup")
def startup_event():
    init_google_sheets()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        if not user: raise HTTPException(status_code=401)
        return user
    except:
        raise HTTPException(status_code=401)

# ==========================================
# 6. API ROUTES
# ==========================================

@app.get("/")
def read_root():
    return {"message": "CampusFix V3 API is Running & Secured!"}

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
        if not email: raise HTTPException(400, "Invalid Google Token")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, full_name=claims.get("name"), role=g.role, 
                        password_hash=get_password_hash("google_auth_user"), 
                        profile_pic=claims.get("picture"))
            db.add(user)
            db.commit()
            db.refresh(user)
        return {"access_token": create_token({"sub": user.email}), "token_type": "bearer"}
    except:
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
    if user.role == 'student': raise HTTPException(403, "Not authorized")
    return db.query(User).filter(User.role == 'student').all()

@app.post("/users/{id}/manage-hostel")
def manage_hostel_request(id: int, act: HostelAction, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student': raise HTTPException(403, "Not authorized")
    student = db.query(User).filter(User.id == id).first()
    if not student: raise HTTPException(404, "Student not found")
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
            return {"reply": data["choices"][0]["message"]["content"]}
        except Exception as e:
            print(f"❌ AI Brain Freeze Error: {e}")
            return {"reply": "⚠️ Connection error. Please try again."}

# --- MESS ROUTES ---
@app.post("/mess/rate")
def rate_mess(r: MessRatingCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    week_start = get_current_week_start() # NOW DEFINED
    existing = db.query(MessRating).filter(MessRating.user_id == user.id, MessRating.week_start == week_start).first()
    if existing: raise HTTPException(400, "You have already submitted a rating for this week. It resets on Sunday Midnight.")
    
    rating = MessRating(user_id=user.id, week_start=week_start, **r.dict())
    db.add(rating)
    db.commit()
    
    background_tasks.add_task(append_rating_to_sheet, rating, user)
    return {"msg": "Rating Submitted"}

@app.get("/mess/analytics")
def get_mess_analytics(mess: Optional[str] = None, db: Session = Depends(get_db)):
    week_start = get_current_week_start()
    query = db.query(MessRating).filter(MessRating.week_start == week_start)
    if mess: query = query.filter(MessRating.mess_name == mess)
    ratings = query.all()

    total = len(ratings)
    if total == 0:
        return {"avg": {}, "sentiment": "No data yet", "total": 0, "reviews": []}

    avg_h = sum(r.hygiene for r in ratings) / total
    avg_t = sum(r.taste for r in ratings) / total
    avg_q = sum(r.quality for r in ratings) / total
    overall = (avg_h + avg_t + avg_q) / 3

    sentiment = "Neutral"
    action_item = "Maintain standards."
    if overall > 4.5: 
        sentiment = "Excellent 🌟"
        action_item = "Reward vendor for consistency."
    elif overall < 3.0: 
        sentiment = "Critical 🚨"
        action_item = "Immediate hygiene/quality inspection required."
    
    reviews_list = []
    for r in ratings:
        if r.review or r.suggestions:
            reviews_list.append({
                "rating": round((r.hygiene + r.taste + r.quality) / 3, 1),
                "review": r.review,
                "suggestion": r.suggestions,
                "image": r.image_data,
                "date": r.created_at
            })

    return {
        "avg": {"hygiene": round(avg_h, 1), "taste": round(avg_t, 1), "quality": round(avg_q, 1), "overall": round(overall, 1)},
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
def list_issues(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    three_days_ago = datetime.now(IST) - timedelta(days=3)
    stale = db.query(Issue).filter(
        Issue.priority != "High", 
        Issue.created_at < three_days_ago, 
        Issue.status.in_([IssueStatus.PENDING, IssueStatus.IN_PROGRESS])
    ).all()
    for s in stale: s.priority = "High"
    if stale: db.commit()

    query = db.query(Issue).order_by(
        case((Issue.priority=="High", 1), (Issue.priority=="Medium", 2), else_=3), 
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
    
    issues = query.all()
    
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
    if not issue: raise HTTPException(404)
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
    if not issue: raise HTTPException(404)
    if user.role == 'student' and issue.owner_id != user.id: 
        raise HTTPException(403)
    db.delete(issue)
    db.commit()
    return {"msg": "Deleted"}

@app.post("/issues/{id}/comments")
async def add_comment(id: int, c: CommentCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == id).first()
    if not issue: raise HTTPException(404)

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
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Issue).count()
    pending = db.query(Issue).filter(Issue.status == "Pending").count()
    resolved = db.query(Issue).filter(Issue.status == "Solved").count()
    my_issues = db.query(Issue).filter(Issue.owner_id == user.id).count()
    return {"total_issues": total, "pending": pending, "resolved": resolved, "my_issues": my_issues}

# --- REPORT GENERATION (PDF + EXCEL) ---
@app.get("/reports/download")
def download_report(type: str, range: str, format: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student': raise HTTPException(403, "Admins only")

    # 1. Advanced Date Logic
    query_date = datetime.now(IST)
    title_range = ""
    
    if type == 'issues':
        if range == 'today': 
            query_date = datetime.combine(datetime.now(IST).date(), datetime.min.time()) 
            title_range = "Today's Report"
        elif range == 'yesterday':
            query_date -= timedelta(days=1) 
            title_range = "Since Yesterday"
        elif range == 'week': 
            query_date -= timedelta(weeks=1)
            title_range = "Past 7 Days"
        elif range == 'month': 
            query_date -= timedelta(days=30)
            title_range = "Last 30 Days"
        elif range == 'semester': 
            query_date -= timedelta(days=180) 
            title_range = "Full Semester History"
        else: 
            query_date = datetime.min 
            title_range = "All Time History"
    
    elif type == 'mess':
        if range == 'week': 
            query_date -= timedelta(weeks=1)
            title_range = "This Week's Ratings"
        elif range == 'month': 
            query_date -= timedelta(days=30)
            title_range = "Last 30 Days"
        elif range == '3months': 
            query_date -= timedelta(days=90)
            title_range = "Quarterly Report (3 Months)"
        elif range == 'semester':
            query_date -= timedelta(days=180)
            title_range = "Full Semester History"
        else:
            query_date = datetime.min
            title_range = "All Time History"

    # 2. Fetch Data
    data = []
    headers = []
    filename = f"CampusFix_{type.capitalize()}_Report.pdf"

    if type == 'issues':
        rows = db.query(Issue).filter(Issue.created_at >= query_date).all()
        headers = ["ID", "Date", "Location", "Category", "Priority", "Status", "Student"]
        for r in rows:
            loc = f"{r.sub_location[:10]}..." if len(r.sub_location)>10 else r.sub_location
            data.append([
                str(r.id), 
                r.created_at.strftime("%Y-%m-%d"), 
                loc, 
                r.category, 
                r.priority, 
                r.status, 
                r.owner.full_name if r.owner else "Unknown"
            ])
    
    elif type == 'mess':
        rows = db.query(MessRating).filter(MessRating.created_at >= query_date).all()
        headers = ["Date", "Mess Hall", "Hygiene", "Taste", "Quality", "Review"]
        for r in rows:
            review_short = (r.review[:25] + '..') if r.review and len(r.review) > 25 else (r.review or "-")
            data.append([
                r.created_at.strftime("%Y-%m-%d"), 
                r.mess_name, 
                str(r.hygiene), 
                str(r.taste), 
                str(r.quality), 
                review_short
            ])

    # 3. Generate PROFESSIONAL PDF (LaTeX Style)
    if format == 'pdf':
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        elements = []
        styles = getSampleStyleSheet()

        # -- HEADER WITH LOGO --
        if os.path.exists("logo.png"):
            im = Image("logo.png", width=0.8*inch, height=0.8*inch)
            im.hAlign = 'LEFT'
            elements.append(im)
        
        elements.append(Spacer(1, 12))
        
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, spaceAfter=12, textColor=colors.HexColor('#1e293b'))
        elements.append(Paragraph(f"CampusFix {type.capitalize()} Report", title_style))
        
        sub_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#64748b'))
        elements.append(Paragraph(f"<b>Range:</b> {title_range}  |  <b>Generated:</b> {datetime.now().strftime('%d %b %Y, %H:%M')}", sub_style))
        elements.append(Spacer(1, 20))

        if data:
            table_data = [headers] + data
            t = Table(table_data, colWidths=[40, 80, 100, 100, 80, 80, 100] if type == 'issues' else [80, 100, 60, 60, 60, 150])
            
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')), # Header Blue
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')), # Light Gray Rows
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]) # Zebra Striping
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No records found for this period.", styles['Normal']))
        
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray, alignment=1) # Center
        elements.append(Paragraph("Confidential Report • Generated by CampusFix AI System • Authorized Use Only", footer_style))

        doc.build(elements)
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

    # Excel/CSV Fallback (Simple)
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(data)
        output.seek(0)
        filename = f"CampusFix_{type}_{range}.csv"
        return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)