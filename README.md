# 🎓 CampusFix – Smart Campus Management & Issue Resolution System

![CampusFix Banner](frontend_v3/public/campus-bg.avif)

> **Bridging the gap between Students and Administration.**
> A comprehensive Web + Mobile platform to streamline campus grievances, mess quality monitoring, hostel management, analytics, and communication — with real-time heatmaps, AI chatbot, notifications, & mobile-first responsive design.

---

## 🏷️ Tech Badges

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?logo=react)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Backend-Python-yellow?logo=python)](https://www.python.org/)
[![Android](https://img.shields.io/badge/Mobile-Capacitor%20Android-green?logo=android)](https://capacitorjs.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org/)
[![Firebase](https://img.shields.io/badge/Notifications-Firebase%20Cloud%20Messaging-orange?logo=firebase)](https://firebase.google.com/)
[![Deployment](https://img.shields.io/badge/Hosted%20On-Render-purple)](https://render.com/)

---

## 📱 App Screenshots

| Login | Dashboard | AI Chatbot |
|:---:|:---:|:---:|
| <img src="frontend_v3/public/logo.png" width="200" /> | <img src="frontend_v3/public/botchar.png" width="200" /> | <img src="frontend_v3/public/gemini.png" width="200" /> |

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- 🔐 Google & Email Authentication
- 📝 Register complaints with full tracking
- ⭐ Mess Quality Rating (Weekly Insights)
- 🏫 Hostel & Room Information
- 🏷️ Student Trust / Credit Score System
- 🤖 AI Chatbot (Gemini Powered)
- ☎️ Emergency Contacts
- 📱 Mobile-First Glassmorphism UI
- 🎯 Fully Responsive (Laptop → Tablet → Phone)

---

### 👮‍♂️ Admin / Authority Portal
- 📊 Complaint Monitoring & Status Updates
- 🕒 Delayed Issue Escalation Protocol
- 🔥 Live Campus Heatmap with fullscreen zoom
- 🗺️ Live Interactive Campus Map
- 📢 Notice Board + Auto Marquee Alerts
- 📑 Admin Intelligence Reports (PDF / CSV)
- 👷 Staff Performance Insights
- 🏢 Department Activity Breakdown

---

## 🧠 Smart Insights & Analytics
- 📈 Resolution Progress Bar
- ⏳ Avg Complaint Solve Time
- 😊 Satisfaction Insights
- 🧠 AI-Assisted Report Generation
- ⚡ Real-Time Data Sync

---

## 📡 Firebase Cloud Messaging
- 🔔 Push Notifications to Students
- 🔐 Automatic Token Linking
- 📱 Mobile-ready alerts

---

## 🗺️ Heatmap & Campus Map
- 🔄 Auto-rotating Heatmaps
- 🖼️ 1280×720 optimized resolution
- 🖱️ Click to Zoom (Fullscreen)
- 🧭 Leaflet Campus Map with Pins

---

## 🧬 Project Architecture

```
CAMPUS_FIX_V3
│
├── backend
│   ├── main.py
│   ├── requirements.txt
│   ├── serviceAccountKey.json
│   └── .env
│
├── frontend_v3
│   ├── public
│   │   ├── HeatMap/
│   │   ├── manifest.json
│   │   ├── campus-bg.avif
│   │   └── firebase-messaging-sw.js
│   │
│   ├── src
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/Godkunn/campus-fix-v3.git
cd campus-fix-v3
```

---

## 🧩 Backend Setup
```
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend runs on:
```
http://localhost:5000
```

---

## 🎨 Frontend Setup
```
cd frontend_v3
npm install
npm run dev
```

Frontend:
```
http://localhost:5173
```

---

## 🔐 Environment Variables

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

### Backend `.env`
```
DATABASE_URL=postgres_database_url
SECRET_KEY=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
FCM_SERVER_KEY=your_firebase_key
```

---

## 📱 Build Android APK (Capacitor)

```
cd frontend_v3
npm run build
npx cap sync
npx cap open android
```

Then in Android Studio:
```
Build → Generate Signed APK
```

---

## 🧪 QA Checklist
✔️ Mobile Responsive  
✔️ Admin + Student Dashboards  
✔️ Heatmap Rotation  
✔️ Fullscreen Heatmap  
✔️ Live Campus Map  
✔️ Notice System  
✔️ Mess Rating  
✔️ Profile Update  
✔️ Escalation Flow Working  
✔️ Notifications Delivered  

---

## 🌍 Deployment
Supported:
- Render
- Railway
- Vercel
- Netlify
- Docker
- AWS
- GCP

---

## 🤝 Contributing
Pull requests welcome ❤️

```
Fork
Create feature branch
Commit
Push
Submit PR
```

---

## 📞 Contact
**Developer:** Ayush Chaudhary  
📧 Email: godayush101@gmail.com  
🐙 GitHub: Godkunn  

---

### ❤️ Made with Love for NIT Agartala
Smarter Campus • Better Experience • Real Impact
