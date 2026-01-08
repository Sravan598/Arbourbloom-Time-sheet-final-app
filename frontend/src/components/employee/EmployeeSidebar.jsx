import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Folder
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
      path: '/employee/documents', 
      label: 'Documents', 
      icon: Folder 
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
      <nav className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
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
