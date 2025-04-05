import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { toast } from "react-toastify";
import "./AuthScreen.css"; // We'll create this next

const AuthScreen = ({ onSignIn }) => {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      toast.success(`Welcome, ${user.displayName}!`);
      onSignIn(user); // Pass the user to the parent component
    } catch (error) {
      console.error("Error during sign-in:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <h1>Welcome to Gemini Chat</h1>
      <p>Sign in to start chatting</p>
      <button className="google-signin-btn" onClick={handleGoogleSignIn}>
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google Icon"
          className="google-icon"
        />
        Sign in with Google
      </button>
    </div>
  );
};

export default AuthScreen;