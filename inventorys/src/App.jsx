import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import SignIn from "./components/sign_in";
import Register from "./components/register";
import AddBusiness from "./components/addBusiness";
import PrivateRoute from "./logicHandles";
import Dashboard from "./components/dashboard";
import './App.css';
import PasswordResetConfirm from "./components/resetPassword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/sign_in" element={<SignIn />} />
        <Route path="/register" element={<Register />} />

        <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />

        
        {/* Protected routes */}
        <Route path="/selectBusiness" element={<PrivateRoute element={AddBusiness} />} />
        
        {/* Dashboard nested routes */}
        <Route path="/dashboard/*" element={<PrivateRoute element={Dashboard} />} />

        {/* Redirect base path to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;