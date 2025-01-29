import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './Pages/AdminDashboard';
import UserDashboard from './Pages/UserDashboard';
import Login from './Pages/Login';
import Register from './Pages/Register';
import UserMakeReservation from './Pages/UserMakeReservation';
import UserReservation from './Pages/UserReservation';
import CalendarTest from './Pages/Calendar';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    return token && userRole === role;
  };

  return checkAuth() ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Additional Routes */}
          <Route path="/make-reservation" element={<UserMakeReservation />} />
          <Route path="/my-reservations" element={<UserReservation />} />
          <Route path="/calendar-test" element={<CalendarTest />} />
          {/* Redirect to login if no route matches */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
