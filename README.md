# React-project
405 FOUND- A CHAT Gemini App
A brief description of what this project does and who it's for
WEBSITE LINK- https://405found.netlify.app


Chat Gemini - A React-based Chatbot App
Description
Chat Gemini is a modern chatbot application built with React.js, featuring Google Authentication for secure user access. This project aims to provide a seamless chat experience powered by a Gemini-like conversational AI. Developed as a collaborative effort, it showcases a responsive UI and integrates Firebase for authentication.

Team Members
1.Yesha Panchamia
2.Nishtha Bhushan
3.Tithi Biswas

Features
Google Authentication for user login
Real-time chat interface
Responsive design with a wavy background animation
Built with React.js and Bootstrap for styling
Firebase integration for auth management
Tech Stack
Frontend: React.js, Bootstrap, CSS
Authentication: Firebase (Google Auth)
Build Tool: Vite
Linting: ESLint
Version Control: Git, GitHub

Installation
Follow these steps to set up the project locally:

1.Clone the Repository bash git clone https://github.com/Tithibiswas901/405-Found.git cd 405-Found

2.Install Dependencies bash npm install

3.Set Up Environment Variables

4.Create a .env file in the root directory.

5.Add your Firebase configuration (from firebase.js): env VITE_FIREBASE_API_KEY=your_api_key VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain VITE_FIREBASE_PROJECT_ID=your_project_id VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id VITE_FIREBASE_APP_ID=your_app_id
Run the App bash npm run dev

6.Open http://localhost:5173 in your browser.

how to use

Launch the app and sign in using your Google account.
Once authenticated, interact with the chatbot interface.
Enjoy a seamless chat experience with a dynamic wavy background.
Algorithm Flowcharts
1. Authentication Flow
2. Chatbot Interaction Flow
Project Structure
405-Found/ ├── assets/ # Static assets (images, etc.) ├── components/ # Reusable React components ├── App.jsx # Main app component ├── AuthContext.jsx # Authentication context ├── AuthScreen.jsx # Authentication UI ├── ChatApp.jsx # Chatbot interface ├── SignIn.jsx # Sign-in component ├── firebase.js # Firebase configuration ├── index.js # Entry point ├── .env # Environment variables (not tracked) ├── .gitignore # Git ignore file ├── package.json # Project dependencies └── README.md # Project documentation

Contributing
We welcome contributions! To get started:

1.Fork the repository.
2.Create a new branch (git checkout -b feature-branch).
3.Commit your changes (git commit -m "Add feature").
4.Push to your branch (git push origin feature-branch).
5.Open a Pull Request.
