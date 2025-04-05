// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import SignIn from "./SignIn";
import ChatApp from "./ChatApp";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatApp />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/signin" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;