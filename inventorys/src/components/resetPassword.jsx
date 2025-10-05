import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "./api";
import "./reset.css";
import { toast, ToastContainer } from "react-toastify";

export default function PasswordResetConfirm() {
  const { uid, token } = useParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    try {
        const response = await api.post("auth/users/reset_password_confirm", {
            uid,
            token,
            new_password: password,
        });

        toast.success("Password reset successfully! Redirecting to sign in...");

        setTimeout(() => {
            navigate("/sign_in");
        }, 3000);
        }
         catch (error) {
      setMessage("Error resetting password. Please try again.");
      toast.error("Error resetting password. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="password-reset-container">
        <ToastContainer autoClose={3000} />
      <div className="password-reset-card">
        <h2 className="password-reset-title">Set New Password</h2>
        <form onSubmit={handleSubmit} className="password-reset-form">
          <div className="form-group">
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
              required
              minLength="8"
            />
          </div>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading || !password}
          >
            {isLoading ? "Resetting..." : "Set New Password"}
          </button>
        </form>
        {message && (
          <div className={`message ${message.includes("Error") ? "error" : "success"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}