import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CursorDot from './components/ui/CursorDot';
import { CORChat } from './components/chat';
import { CORBot } from './components/chatbot';
import { NotificationBell } from './components/notifications';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeTimesheet from './pages/employee/EmployeeTimesheet';
import EmployeeProjects from './pages/employee/EmployeeProjects';
import Documents from './pages/employee/Documents';
import Leave from './pages/employee/Leave';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTimesheets from './pages/admin/AdminTimesheets';
import PerformanceInsights from './pages/admin/PerformanceInsights';
import Projects from './pages/admin/Projects';
import EmployeeDocs from './pages/admin/EmployeeDocs';
import Employees from './pages/admin/Employees';
import LeaveRequests from './pages/admin/LeaveRequests';
import LeaveSettings from './pages/admin/LeaveSettings';

import './App.css';

// Chat widget wrapper that uses auth context
const ChatWidget = () => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return <CORChat currentUser={user} />;
};

// Notification bell wrapper
const NotificationWidget = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <NotificationBell />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App antialiased">
        {/* Custom Red Dot Cursor Follower */}
        <CursorDot />
        
        <BrowserRouter>
          {/* CORBot FAQ chatbot - appears on ALL pages (including public) */}
          <CORBot />
          
          {/* CORChat floating widget - appears on all pages when logged in */}
          <ChatWidget />
          
          {/* Notification Bell - appears on all pages when logged in */}
          <NotificationWidget />
          
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
              path="/employee/projects" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <EmployeeProjects />
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
            <Route 
              path="/employee/leave" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <Leave />
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
              path="/admin/employees" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <Employees />
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
            <Route 
              path="/admin/employee-docs" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <EmployeeDocs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/leave-requests" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <LeaveRequests />
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
