# Awesome ToDo-s

Awesome ToDo-s is a full-stack task management app built for simple daily planning, fast updates, and a clean user experience.

Live site: https://awesometodo-s-1.onrender.com/

## Overview

This project combines a React frontend with an Express and MongoDB backend to manage tasks in a straightforward and responsive way. It was built as a practical CRUD project and evolved into a cleaner, more polished version through redesign work.

## Tech Stack

- React
- Vite
- Node.js
- Express
- MongoDB Atlas

## Features

- Create new tasks
- View saved tasks
- Mark tasks as complete or incomplete
- Delete tasks
- Separate stable and redesign branches

## Project Structure

```text
AWESOMETODOS/
  client/
  server/
```

## Environment Variables

Create `server/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## Local Setup

Install dependencies:

```bash
npm --prefix client install
npm --prefix server install
```

Start the backend:

```bash
npm --prefix server run dev
```

Start the frontend:

```bash
npm --prefix client run dev
```

Frontend runs on `http://localhost:5173`.

## Deployment

Render build command:

```bash
npm --prefix client install && npm --prefix server install && npm --prefix client run build
```

Render start command:

```bash
node server/index.js
```

Required environment variables:

- `MONGODB_URI`
- `PORT`
