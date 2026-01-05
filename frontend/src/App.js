import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeTimesheet from './pages/employee/EmployeeTimesheet';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTimesheets from './pages/admin/AdminTimesheets';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App antialiased">
        
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Employee Routes */}
            <Route 
              path="/employee/dashboard" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/timesheet" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <EmployeeTimesheet />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/timesheets" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminTimesheets />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
