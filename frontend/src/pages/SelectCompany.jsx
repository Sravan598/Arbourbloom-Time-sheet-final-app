import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, Shield } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SelectCompany = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await axios.get(`${API}/api/tenants/public`);
        setTenants(response.data);
      } catch (err) {
        console.error('Failed to fetch tenants:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Your Company</h1>
          <p className="text-gray-600">Choose your organization to continue</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.slug}
              to={`/${tenant.slug}/login`}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
            >
              {tenant.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name}
                  className="w-12 h-12 object-contain rounded-lg"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: tenant.primary_color }}
                >
                  {tenant.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                <p className="text-sm text-gray-500">/{tenant.slug}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        {/* Super Admin Access */}
        <div className="mt-6 text-center">
          <Link
            to="/super-admin/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Super Admin Access
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SelectCompany;
