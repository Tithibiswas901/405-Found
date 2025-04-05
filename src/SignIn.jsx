// src/SignIn.jsx
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate } from "react-router-dom";
import "./SignIn.css"; // We'll create this CSS file next

const SignIn = () => {
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/chat"); // Redirect to the chat app after successful login
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <h1>Hackathon Project - Gemini Chat</h1>
        <p>Sign in to start chatting with AI</p>
        <button className="google-signin-btn" onClick={signInWithGoogle}>
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="google-icon"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default SignIn;