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

const EmployeeSidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { 
      path: '/employee/dashboard', 
      label: 'Dashboard', 
      icon: Home 
    },
    { 
      path: '/employee/timesheet', 
      label: 'My Timesheet', 
      icon: FileText 
    },
    { 
      path: '/employee/projects', 
      label: 'My Projects', 
      icon: FolderKanban 
    },
    { 
      path: '/employee/documents', 
      label: 'Documents', 
      icon: Folder 
    },
    { 
      path: '/employee/leave', 
      label: 'Leave / PTO', 
      icon: Calendar 
    },
    { 
      path: '/employee/tickets', 
      label: 'Support Tickets', 
      icon: Ticket 
    },
    { 
      path: '/employee/calendar', 
      label: 'Calendar', 
      icon: CalendarDays 
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

  return (
    <aside className="w-64 bg-white shadow-lg fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/employee/dashboard" className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
            alt="CORtracker" 
            className="h-8"
          />
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active 
                    ? 'bg-brand-red/10 text-brand-red font-medium' 
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
