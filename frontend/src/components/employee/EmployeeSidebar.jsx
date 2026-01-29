import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Folder,
  Calendar,
  CalendarDays,
  FolderKanban,
  DollarSign,
  ExternalLink,
  Ticket
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

const EmployeeSidebar = () => {
  const location = useLocation();
  const { tenant, getTenantLogo, getTenantName } = useTenant();
  
  const navItems = [
    { 
      path: '/employee/dashboard', 
      label: 'Dashboard', 
      icon: Home,
      tourId: 'sidebar-dashboard'
    },
    { 
      path: '/employee/timesheet', 
      label: 'My Timesheet', 
      icon: FileText,
      tourId: 'sidebar-timesheet'
    },
    { 
      path: '/employee/projects', 
      label: 'My Projects', 
      icon: FolderKanban,
      tourId: 'sidebar-projects'
    },
    { 
      path: '/employee/documents', 
      label: 'Documents', 
      icon: Folder,
      tourId: 'sidebar-documents'
    },
    { 
      path: '/employee/leave', 
      label: 'Leave / PTO', 
      icon: Calendar,
      tourId: 'sidebar-leave'
    },
    { 
      path: '/employee/tickets', 
      label: 'Support Tickets', 
      icon: Ticket,
      tourId: 'sidebar-tickets'
    },
    { 
      path: '/employee/calendar', 
      label: 'Calendar', 
      icon: CalendarDays,
      tourId: 'sidebar-calendar'
    },
    { 
      path: 'https://workforcenow.adp.com', 
      label: 'Payroll', 
      icon: DollarSign,
      external: true
    }
  ];

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
        <Link to="/employee/dashboard" className="flex items-center gap-3">
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
      <nav className="p-4 flex flex-col h-[calc(100%-80px)]">
        <div className="space-y-1 flex-1">
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
                data-tour={item.tourId}
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
      </nav>
    </aside>
  );
};

export default EmployeeSidebar;
