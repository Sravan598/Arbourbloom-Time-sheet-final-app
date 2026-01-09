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
  Settings
} from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: Home 
    },
    { 
      path: '/admin/employees', 
      label: 'Employees', 
      icon: Users 
    },
    { 
      path: '/admin/performance', 
      label: 'Performance Insights', 
      icon: BarChart3 
    },
    { 
      path: '/admin/timesheets', 
      label: 'All Timesheets', 
      icon: FileText 
    },
    { 
      path: '/admin/projects', 
      label: 'Projects', 
      icon: FolderKanban 
    },
    { 
      path: '/admin/employee-docs', 
      label: 'Employee Docs', 
      icon: Folder 
    },
    { 
      path: '/admin/leave-requests', 
      label: 'Leave Requests', 
      icon: Calendar 
    },
    { 
      path: '/admin/leave-settings', 
      label: 'Leave Settings', 
      icon: Settings 
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="w-64 bg-white shadow-lg fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
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
                    ? 'bg-purple-100 text-purple-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* Admin Badge */}
        <div className="mt-8 p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
          </div>
          <p className="text-xs text-purple-600">Full access to all features</p>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
