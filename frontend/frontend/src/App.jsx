import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/customer/Home.jsx";
import CategoryWorkers from "./pages/customer/CategoryWorkers.jsx";
import WorkerProfile from "./pages/customer/WorkerProfile.jsx";
import MyBookings from "./pages/customer/MyBookings.jsx";
import Dashboard from "./pages/worker/Dashboard.jsx";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "worker" ? "/worker" : "/customer"} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/customer" element={<ProtectedRoute role="customer"><Home /></ProtectedRoute>} />
          <Route path="/customer/category/:job" element={<ProtectedRoute role="customer"><CategoryWorkers /></ProtectedRoute>} />
          <Route path="/customer/worker/:id" element={<ProtectedRoute role="customer"><WorkerProfile /></ProtectedRoute>} />
          <Route path="/customer/bookings" element={<ProtectedRoute role="customer"><MyBookings /></ProtectedRoute>} />

          <Route path="/worker" element={<ProtectedRoute role="worker"><Dashboard /></ProtectedRoute>} />

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </main>
    </>
  );
}
