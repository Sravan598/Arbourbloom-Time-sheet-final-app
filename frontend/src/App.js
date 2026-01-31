import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CursorSpotlight from './components/ui/CursorSpotlight';
import { AurborChat } from './components/chat';
import { AurborBot } from './components/chatbot';
import { NotificationBell } from './components/notifications';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeTimesheet from './pages/employee/EmployeeTimesheet';
import EmployeeProjects from './pages/employee/EmployeeProjects';
import EmployeeTickets from './pages/employee/EmployeeTickets';
import EmployeeCalendar from './pages/employee/EmployeeCalendar';
import Documents from './pages/employee/Documents';
import Leave from './pages/employee/Leave';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTimesheets from './pages/admin/AdminTimesheets';
import PerformanceInsights from './pages/admin/PerformanceInsights';
import Projects from './pages/admin/Projects';
import EmployeeDocs from './pages/admin/EmployeeDocs';
import Employees from './pages/admin/Employees';
import LeaveRequests from './pages/admin/LeaveRequests';
import AdminTickets from './pages/admin/Tickets';
import AdminCalendar from './pages/admin/Calendar';
import TenantManagement from './pages/admin/TenantManagement';

// Tenant-specific landing pages (lazy loaded)
const PerfectSolutionsHome = React.lazy(() => import('./pages/tenant/PerfectSolutionsHome'));
const TenantLogin = React.lazy(() => import('./pages/tenant/TenantLogin'));
const TenantSignup = React.lazy(() => import('./pages/tenant/TenantSignup'));

import './App.css';

// Chat widget wrapper that uses auth context
const ChatWidget = () => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return <AurborChat currentUser={user} />;
};

// Notification bell wrapper
const NotificationWidget = () => {
  return null;
};

// Loading fallback for lazy-loaded components
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <div className="App antialiased">
        {/* Spotlight cursor effect */}
        <CursorSpotlight />
        
        <BrowserRouter>
          {/* AurborBot FAQ chatbot - appears on ALL pages (including public) */}
          <AurborBot />
          
          {/* AurborChat floating widget - appears on all pages when logged in */}
          <ChatWidget />
          
          {/* Notification Bell - appears on all pages when logged in */}
          <NotificationWidget />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Tenant-specific routes (isolated login/signup per tenant) */}
            <Route 
              path="/:tenantSlug" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PerfectSolutionsHome />
                </Suspense>
              } 
            />
            <Route 
              path="/:tenantSlug/login" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TenantLogin />
                </Suspense>
              } 
            />
            <Route 
              path="/:tenantSlug/signup" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TenantSignup />
                </Suspense>
              } 
            />
            
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
            <Route 
              path="/employee/tickets" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <EmployeeTickets />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/calendar" 
              element={
                <ProtectedRoute requiredRole="EMPLOYEE">
                  <EmployeeCalendar />
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
            <Route 
              path="/admin/tickets" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminTickets />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/calendar" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminCalendar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tenants" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <TenantManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
