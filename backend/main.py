import uvicorn
import os
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- CONFIG ---
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "campusfix_v3_secure_key")
ALGORITHM = "HS256"
DATABASE_URL = "sqlite:///./campusfix_v3.db"

# --- DB SETUP ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- MODELS ---
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
    
    # Student Fields
    enrollment_no = Column(String, nullable=True)
    hostel = Column(String, nullable=True)
    block = Column(String, nullable=True)
    room_no = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    registration_no = Column(String, nullable=True) 
    
    # Official Fields
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)

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
    
    owner = relationship("User")

Base.metadata.create_all(bind=engine)

# --- SCHEMAS ---
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

class IssueResponse(IssueCreate):
    id: int
    status: str
    created_at: datetime
    owner_name: str
    class Config: from_attributes = True

class DashboardStats(BaseModel):
    total_issues: int
    pending: int
    resolved: int
    my_issues: int

# --- AUTH & API ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_password_hash(password: str):
    # Fix: Encode to bytes, truncate to 72 bytes, then hash
    return pwd_context.hash(password.encode('utf-8')[:72])

def verify_password(plain_password, hashed_password):
    # Fix: Verify using the truncated bytes
    return pwd_context.verify(plain_password.encode('utf-8')[:72], hashed_password)

def create_token(data: dict): return jwt.encode({**data, "exp": datetime.utcnow() + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.email == payload.get("sub")).first()
        if not user: raise HTTPException(status_code=401)
        return user
    except: raise HTTPException(status_code=401)

# --- ROUTES ---
@app.post("/register")
def register(u: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == u.email).first(): raise HTTPException(400, "Email exists")
    
    db.add(User(
        email=u.email, 
        full_name=u.full_name, 
        password_hash=get_password_hash(u.password), 
        role=u.role,
        enrollment_no=u.enrollment_no, 
        registration_no=u.registration_no,
        hostel=u.hostel, 
        block=u.block, 
        room_no=u.room_no, 
        semester=u.semester,
        phone=u.phone, 
        department=u.department
    ))
    db.commit()
    return {"msg": "Success"}

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash): raise HTTPException(400, "Invalid credentials")
    return {"access_token": create_token({"sub": user.email}), "token_type": "bearer"}

@app.get("/users/me")
def me(user: User = Depends(get_current_user)): return user

@app.put("/users/me")
def update_profile(u: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in u.dict(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@app.post("/issues", response_model=IssueResponse)
def create_issue(i: IssueCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_issue = Issue(**i.dict(), owner_id=user.id)
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    new_issue.owner_name = user.full_name
    return new_issue

@app.get("/issues", response_model=List[IssueResponse])
def list_issues(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Issue).order_by(Issue.created_at.desc())
    if user.role == 'student':
        query = query.filter(Issue.owner_id == user.id)
    
    issues = query.all()
    for i in issues: i.owner_name = i.owner.full_name if i.owner else "Unknown"
    return issues

@app.patch("/issues/{id}/status")
def update_status(id: int, u: IssueUpdateStatus, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student': raise HTTPException(403, "Students cannot update status")
    issue = db.query(Issue).filter(Issue.id == id).first()
    if issue:
        issue.status = u.status
        db.commit()
        return {"msg": "Updated"}
    raise HTTPException(404, "Issue not found")

@app.delete("/issues/{id}")
def delete_issue(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'student': raise HTTPException(403, "Students cannot delete")
    issue = db.query(Issue).filter(Issue.id == id).first()
    if issue:
        db.delete(issue)
        db.commit()
        return {"msg": "Deleted"}
    raise HTTPException(404, "Issue not found")

@app.get("/stats", response_model=DashboardStats)
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Issue).count()
    pending = db.query(Issue).filter(Issue.status == "Pending").count()
    resolved = db.query(Issue).filter(Issue.status == "Solved").count()
    my_issues = db.query(Issue).filter(Issue.owner_id == user.id).count()
    return {"total_issues": total, "pending": pending, "resolved": resolved, "my_issues": my_issues}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
