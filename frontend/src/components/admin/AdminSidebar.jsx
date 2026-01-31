import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  FileText, 
  Folder,
  FolderKanban,
  Users,
  Calendar,
  CalendarDays,
  ExternalLink,
  DollarSign,
  Ticket,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

const AdminSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { tenant, getTenantLogo, getTenantName, isFeatureEnabled } = useTenant();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Define nav items with feature keys
  const allNavItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: Home,
      alwaysShow: true // Dashboard is always visible
    },
    { 
      path: '/admin/employees', 
      label: 'Employees', 
      icon: Users,
      alwaysShow: true // Employees is core functionality
    },
    { 
      path: '/admin/performance', 
      label: 'Performance Insights', 
      icon: BarChart3,
      featureKey: 'performance'
    },
    { 
      path: '/admin/timesheets', 
      label: 'All Timesheets', 
      icon: FileText,
      featureKey: 'timesheets'
    },
    { 
      path: '/admin/projects', 
      label: 'Projects', 
      icon: FolderKanban,
      featureKey: 'projects'
    },
    { 
      path: '/admin/employee-docs', 
      label: 'Employee Docs', 
      icon: Folder,
      featureKey: 'documents'
    },
    { 
      path: '/admin/leave-requests', 
      label: 'Leave Requests', 
      icon: Calendar,
      featureKey: 'leave'
    },
    { 
      path: '/admin/tickets', 
      label: 'Support Tickets', 
      icon: Ticket,
      featureKey: 'tickets'
    },
    { 
      path: '/admin/calendar', 
      label: 'Calendar', 
      icon: CalendarDays,
      featureKey: 'calendar'
    },
    { 
      path: 'https://workforcenow.adp.com', 
      label: 'Payroll', 
      icon: DollarSign,
      external: true,
      alwaysShow: true
    }
  ];

  // Filter nav items based on enabled features
  const navItems = allNavItems.filter(item => {
    if (item.alwaysShow) return true;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  // Add tenant management for super admins (always at position 2)
  if (isSuperAdmin) {
    navItems.splice(2, 0, {
      path: '/admin/tenants',
      label: 'Tenant Management',
      icon: Building2,
      superAdminOnly: true
    });
  }

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Dynamic colors based on tenant
  const primaryColor = tenant.primary_color || '#1a1a1a';
  const activeStyles = {
    backgroundColor: `${primaryColor}15`,
    color: primaryColor,
  };

  return (
    <aside className="w-64 bg-white shadow-lg fixed left-0 top-0 bottom-0 z-40">
      {/* Logo - Dynamic based on tenant */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          {tenant.logo_url ? (
            <img 
              src={tenant.logo_url} 
              alt={getTenantName()} 
              className="h-10 object-contain"
            />
          ) : tenant.slug === 'aurborbloom' ? (
            <img 
              src="/aurborbloom_logo.png" 
              alt="AurborBloom" 
              className="h-10"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: tenant.primary_color }}
              >
                {getTenantName().charAt(0)}
              </div>
              <span className="font-bold text-lg" style={{ color: tenant.primary_color }}>
                {getTenantName()}
              </span>
            </div>
          )}
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            // External link (ADP Payroll)
            if (item.external) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </a>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                style={active ? activeStyles : {}}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active 
                    ? 'font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* Admin Badge - Uses tenant color */}
        <div 
          className="mt-6 p-4 rounded-xl"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="px-2 py-0.5 text-xs font-semibold rounded-full"
              style={{ 
                backgroundColor: `${primaryColor}20`,
                color: primaryColor
              }}
            >
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <p className="text-xs" style={{ color: `${primaryColor}aa` }}>
            {isSuperAdmin ? 'Full system access' : `${getTenantName()} Admin`}
          </p>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
