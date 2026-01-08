import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CursorDot from './components/ui/CursorDot';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeTimesheet from './pages/employee/EmployeeTimesheet';
import Documents from './pages/employee/Documents';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTimesheets from './pages/admin/AdminTimesheets';
import PerformanceInsights from './pages/admin/PerformanceInsights';
import Projects from './pages/admin/Projects';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App antialiased">
        {/* Custom Red Dot Cursor Follower */}
        <CursorDot />
        
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Profile Route (Both Employee and Admin) */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
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
            <Route 
              path="/employee/documents" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <Documents />
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
            <Route 
              path="/admin/performance" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <PerformanceInsights />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/projects" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <Projects />
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
