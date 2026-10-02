# Awesome ToDo-s

Awesome ToDo-s is a full-stack task management web app for organizing, prioritizing, and finishing your to-dos, with extra tools for students.

Live site: https://awesometodos-web.onrender.com

## Overview

We built Awesome ToDo-s because keeping track of tasks across sticky notes, chats, and memory gets messy fast, especially with classes, deadlines, and exams piling up. It puts everything in one place: you add your tasks with due dates and priorities, see what's due today and this week, check them off, and stay focused with a built-in timer. Students can also add their class schedule and grades, and ask Study Buddy, the built-in AI assistant, for help planning. It works on both phones and computers, and it can be installed like an app.

## Tech Stack

- React
- Vite
- Node.js
- Express
- MongoDB Atlas
- Google Gemini (Study Buddy AI)
- Render

## Features

- Create, edit, complete, and delete tasks with a subject, type, priority, due date, steps, and notes
- Task views for All, Today, Next 7 days, Overdue, and Done, plus search and filters
- Calendar view of every deadline by month
- Dashboard with a progress ring, stat tiles, a week strip, today's classes, and a 7-day activity chart
- Class timetable with rooms and teachers, and a grade tracker with a target-grade calculator
- Focus timer with one-tap lengths and a custom time
- Study Buddy AI chat that knows your tasks and classes and answers questions about the app
- "Break down with AI" to split a big task into steps
- Confirmation before important actions, and a "Task complete!" pop-up with Undo
- Accounts with a welcome tour, profile photo, school and year level, and email or password changes
- Forgot password that points students to their admin, with email reset as a fallback
- Light and dark mode in the logo's blue
- Separate phone and desktop layouts, installable as an app (PWA)

## Local Setup

```bash
npm --prefix client install
npm --prefix server install
```

Copy `server/.env.example` to `server/.env` and fill it in (see below), then run the backend and frontend in two terminals:

```bash
npm --prefix server run dev
```

```bash
npm --prefix client run dev
```

Open `http://localhost:5173`.

## Environment Variables

Create `server/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=any_long_random_string
GEMINI_API_KEY=your_gemini_api_key
```

- `GEMINI_API_KEY` is optional. Without it the app still works and Study Buddy shows a "not switched on yet" message.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `APP_URL` are optional and send "forgot password" emails.

## Project Structure

- `client/src/pages/` contains Home, Tasks, Calendar, Classes, Grades, Focus, and Profile
- `client/src/components/` holds shared pieces like the navigation, task cards, chat bubble, and charts
- `client/public/` stores the logo, mascot, app icons, manifest, and service worker
- `server/routes.js` handles tasks
- `server/auth.js` handles accounts, sign-in, profile, and password resets
- `server/classes.js` handles classes and grades
- `server/ai.js` and `server/aiProviders.js` power Study Buddy

## Deployment

This repository is connected to Render and deploys automatically from the `main` branch.

- Build command: `npm --prefix client install --include=dev && npm --prefix server install && npm --prefix client run build`
- Start command: `node server/index.js`
- Environment variables on Render: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `NODE_ENV=production`, and `APP_URL`

## Purpose

We built Awesome ToDo-s as a school project to make task management simple and visual, and to help students stay on top of their classes, deadlines, and study time.
