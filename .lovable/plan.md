

# 📚 Google Classroom Student Planner

## Overview
A colorful, student-friendly online planner that syncs with Google Classroom to automatically track assignments. Students sign in with Google and see all their homework organized by due date in both list and calendar views.

---

## 🎨 Design & Branding
- **Colorful & fun** visual style with vibrant gradients, playful accent colors, and friendly typography
- Rounded cards, subtle animations, and emoji/icon accents to appeal to students
- Responsive design that works well on phones, tablets, and desktops

---

## 🔐 Page 1: Login
- Clean landing page explaining the app's purpose
- **"Sign in with Google"** button (using Supabase Auth with Google provider)
- Google account must have Google Classroom access

---

## 📋 Page 2: Dashboard (Main View)
The core of the app — students see all their synced assignments with two view modes:

### List View
- Assignments grouped by **due date** (Today, Tomorrow, This Week, Later, Past Due)
- Each assignment card shows: **class name**, **assignment title**, **due date**, **posted date**
- Color-coded by class for easy scanning
- Checkbox to **mark assignments as done** (strikethrough + moves to "Completed" section)

### Calendar View
- Monthly calendar with assignment dots/chips on due dates
- Click a date to see that day's assignments
- Color-coded by class, matching the list view

### Toggle
- Simple toggle button to switch between List and Calendar views

---

## ⚙️ Google Classroom Sync
- On first login, the app fetches all active courses and their assignments from Google Classroom
- A **"Sync Now"** button to manually refresh assignments
- Assignments automatically include: title, description, class name, due date, and posted date

---

## 🏗️ Backend (Lovable Cloud + Supabase)
- **Authentication**: Google Sign-In via Supabase Auth
- **Database**: Store synced assignments and completion status per student
- **Edge Function**: Securely connects to Google Classroom API to fetch courses and assignments

---

## 🚀 Future Enhancements (not in initial build)
- Push notifications for upcoming due dates
- Custom tasks and personal to-dos
- Priority levels and study time estimates
- Dark mode toggle

