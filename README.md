EducAlvator 🚀

Learning that knows how to play.

EducAlvator is an AI-powered, gamified educational platform built to transform standard academic curricula into interactive learning experiences. By combining React 18, Vite, and Tailwind CSS with Google’s Gemini multimodal models, EducAlvator delivers real-time study buddy assistance, dynamic quiz/flashcard generation, interactive game modules, and competitive student leaderboards.

📋 Table of Contents

Project Overview

Key Features

Technology Stack

Repository Structure

Prerequisites

Environment Configuration

Installation & Getting Started

Python Study Buddy Helper CLI

AI Engine & Model Architecture

Development & Build Scripts

License & Contribution

🎯 Project Overview

Modern education often suffers from passive content consumption. EducAlvator bridges the gap between structured academic content and student engagement through:

Gamified Subject Modules: Turning complex topics in Mathematics, English Grammar, and Natural Sciences into game-based learning units (e.g., EduRunner, EduJumper, EduSurfer).

Native Multimodal AI Integration: Leveraging Google Gemini Flash models to natively read, digest, and converse over uploaded PDFs, textbooks, and diagram images.

High-Throughput Content Generation: Utilizing fast, lightweight AI models to instantly synthesize bulk JSON data for quizzes, flashcards, and adaptive assessment questions.

Progress & Social Motivation: Offering real-time XP tracking, lesson milestone meters, dynamic avatars, and class leaderboards.

✨ Key Features

🎮 Gamified Learning Center

EduRunner (Fractions & Algebra): Interactive math problem-solving integrated into continuous-runner game mechanics.

EduJumper (Grammar Quest): Syntax, vocabulary, and verb tense challenges built into platformer progression.

EduSurfer (Ocean Ecosystems): Environmental science explore-and-learn modules driven by milestone objectives.

🤖 AI Study Buddy

Conversational tutor capable of answering complex academic queries.

Direct PDF document and diagram analysis using multimodal AI vision/document pipelines.

Instant topic summarizing, key phrase extraction, and dynamic practice query generation.

📊 Comprehensive Student Dashboard

Personalized Header & Progress Overview: Tracks module completions, active lesson streaks, and notifications.

Next Lessons & Activity Queue: Displays upcoming interactive modules, reading assignments, and recent AI tutor interactions.

Classroom Leaderboard: Dark-themed ranking card displaying top student performers with real-time XP counts and streak markers.

🐍 Standalone Python PDF Helper

An auxiliary CLI script (pdf_study_buddy.py) for offline PDF processing, text extraction, and study aid generation directly from the command line.

🛠 Technology Stack

Frontend Core

Framework: React 18 (Functional components, hooks)

Build Tool: Vite 6 with @vitejs/plugin-react

Routing: React Router v7 (react-router-dom)

Styling: Tailwind CSS v4 using @tailwindcss/vite

State & Data Fetching

Global State: Zustand v5

Server State & Caching: TanStack React Query v5

Form Management & Validation

Forms: React Hook Form v7

Validation: Zod v4 integrated via @hookform/resolvers

Content Processing & Rendering

Markdown Parsing: react-markdown with remark-gfm for GitHub Flavored Markdown (tables, checklists, math expressions).

Backend & AI Infrastructure

Backend as a Service: Firebase v13.1 (Authentication, Firestore, Storage)

Primary AI Provider: Google AI Studio (Gemini API)

gemini-3-flash-preview / gemini-3.6-flash: Multimodal document analysis & chat.

gemini-3.1-flash-lite: Fast structured JSON generation for bulk quizzes.

Secondary AI Provider: NVIDIA AI Foundation Endpoints (NVIDIA API key integration)

📁 Repository Structure

educalvator/
├── .env                         # Server-side environment secrets (Git-ignored)
├── .env.example                 # Template for environment configuration
├── .gitignore                   # Git ignore rules for node_modules, env, and python caches
├── Chatbot.env.txt              # Alternative key configuration store
├── educalvator_dashboard.tsx    # Main React Dashboard component with SVG icon set & widgets
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies and script definitions
├── package-lock.json            # Dependency lockfile
└── src/
    └── main.jsx                 # Application Bootstrap entry point


⚙️ Prerequisites

Before installing EducAlvator, ensure your system meets the following requirements:

Node.js: v18.0.0 or higher (v20+ recommended)

Package Manager: npm (v9+ or v10+)

Python (Optional for CLI Helper): Python 3.9+

API Keys: A valid Google AI Studio API key for Gemini model access.

🔐 Environment Configuration

EducAlvator uses server-side environment variables to manage secret keys and model routing. Create a .env file in the root directory by copying .env.example:

cp .env.example .env


Required .env Variables

# Google AI Studio (Gemini) API Key — Server-side only (NO VITE_ prefix)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GOOGLE_API_KEY=your_actual_gemini_api_key_here

# Gemini Model Selection
# Chat & Document Model: Supports native PDF and image inputs
GEMINI_MODEL=gemini-3-flash-preview

# Generation Model: High-speed lite model optimized for bulk JSON schema output
GEMINI_TEXT_MODEL=gemini-3.1-flash-lite

# Optional Settings
# SESSION_SECRET=your_random_session_secret_string
# PYTHON=python3


⚠️ Security Warning: Do not prefix Gemini keys with VITE_ to ensure they are never bundled into client-side browser artifacts.

🚀 Installation & Getting Started

Follow these steps to set up and run the development environment locally:

1. Clone the Repository

git clone https://github.com/your-username/educalvator.git
cd educalvator


2. Install Node Dependencies

npm install


3. Start the Development Server

npm run dev


Open your browser and navigate to http://localhost:5173 to view the EducAlvator dashboard.

4. Build for Production

To generate an optimized production bundle:

npm run build


5. Preview Production Build

npm run preview


🐍 Python Study Buddy Helper CLI

EducAlvator includes an auxiliary Python script (pdf_study_buddy.py) for processing study materials outside the web environment.

Environment Setup

Create a Virtual Environment:

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate


Run the Script:

python pdf_study_buddy.py --file path/to/study_material.pdf


🧠 AI Engine & Model Architecture

EducAlvator separates AI workloads across specialized Google Gemini models to maximize performance and minimize latency:

Task Type

Assigned Model

Key Capabilities

Interactive Study Buddy Chat

gemini-3-flash-preview / gemini-3.6-flash

Native vision, multi-page PDF context retention, natural language tutoring.

Bulk Assessment Generation

gemini-3.1-flash-lite

Structured JSON generation, low latency, rapid output for quizzes & flashcards.

📜 Development & Build Scripts

The following npm scripts are defined in package.json:

npm run dev: Launches the Vite local development server.

npm run build: Compiles production-ready assets into the dist/ directory using Vite and Tailwind CSS.

npm run preview: Spins up a local static web server to test the production build.

🤝 License & Contribution

EducAlvator is distributed under a Private / Proprietary License. All rights are reserved.

Contributing

Fork the repository.

Create a feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.
