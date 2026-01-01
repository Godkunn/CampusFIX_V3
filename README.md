# 🎓 CampusFix - Smart Campus Management System

![CampusFix Banner](frontend_v3/public/campus-bg.avif)

> **Bridging the gap between Students and Officials.** > A comprehensive mobile and web application designed to streamline campus grievances, accommodation management, and communication.

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?logo=react)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Backend-Python-yellow?logo=python)](https://www.python.org/)
[![Android](https://img.shields.io/badge/Mobile-Capacitor%20Android-green?logo=android)](https://capacitorjs.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org/)

---

## 📱 App Screenshots

| Login & Auth | Student Dashboard | Issue Reporting |
|:---:|:---:|:---:|
| <img src="frontend_v3/public/logo.png" width="200" alt="Login Screen" /> | <img src="frontend_v3/public/botchar.png" width="200" alt="Dashboard" /> | <img src="frontend_v3/public/gemini.png" width="200" alt="Chatbot" /> |

---

## 🚀 Key Features

### 👨‍🎓 For Students
* **Easy Login:** Seamless sign-in using Google OAuth or Email/Password.
* **Complaint System:** Report hostel or campus issues (electricity, wifi, mess) with real-time status tracking.
* **Mess Rating:** Rate daily meals to help improve food quality.
* **Hostel Management:** View room details and request room/hostel changes.
* **AI Chatbot:** "CampusBot" powered by Gemini API for instant campus assistance.
* **Emergency Contacts:** One-tap access to important campus numbers.

### 👮‍♂️ For Officials
* **Issue Tracking:** Admin dashboard to view, update, and resolve student complaints.
* **Notice Board:** Post digital notices visible to all students instantly.
* **Analytics:** View reports on mess ratings and grievance stats.

---

## 🛠️ Tech Stack

**Frontend:**
* React.js (Vite)
* CSS Modules (Glassmorphism UI)
* Capacitor (for Native Android App conversion)
* Google OAuth 2.0

**Backend:**
* Python (Flask/FastAPI)
* SQLAlchemy (ORM)
* PostgreSQL (Database)

**Services:**
* Google Gemini API (AI Chatbot)
* Render (Backend Deployment)

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/Godkunn/campus-fix-v3.git](https://github.com/Godkunn/campus-fix-v3.git)
cd campus-fix-v3

### 2. Backend Setup
Navigate to the backend folder and install dependencies.

cd backend
# Create virtual environment (Optional but recommended)
python -m venv venv
# Activate venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)

# Install requirements
pip install -r requirements.txt

# Run the Server
python main.py

The backend will run on http://localhost:5000

3. Frontend Setup
Open a new terminal, navigate to the frontend folder.

Bash

cd frontend_v3

# Install Node modules
npm install

# Run the Development Server
npm run dev
The frontend will run on http://localhost:5173

🔐 Environment Variables
Create a .env file in the frontend_v3 folder:

Code snippet

VITE_API_URL=http://localhost:5000  # Or your Render URL
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
Create a .env file in the backend folder:

Code snippet

DATABASE_URL=your_postgres_db_url
SECRET_KEY=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
📱 Building for Android (APK)
This project uses Capacitor to build the Android app.

Build the React project:

Bash

cd frontend_v3
npm run build
Sync with Android:

Bash

npx cap sync
Open in Android Studio:

Bash

npx cap open android
From Android Studio, go to Build > Generate Signed Bundle / APK to create your APK file.

🤝 Contributing
Contributions are welcome! Please fork the repository and create a pull request.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📞 Contact
Ayush Chaudhary GitHub: Godkunn

Email: godayush101@gmail.com

Made with ❤️ for NIT Agartala