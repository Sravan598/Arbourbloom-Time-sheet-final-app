import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  X, 
  Check,
  Copy,
  Eye,
  EyeOff,
  Upload,
  Palette,
  Globe,
  Settings,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileText,
  Ticket,
  Calendar,
  CalendarDays,
  FolderKanban,
  MessageCircle,
  Folder,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { Button } from '../../components/ui/Button';

const API = process.env.REACT_APP_BACKEND_URL;

// Feature icon mapping
const FEATURE_ICONS = {
  timesheets: FileText,
  tickets: Ticket,
  leave: Calendar,
  calendar: CalendarDays,
  projects: FolderKanban,
  chat: MessageCircle,
  documents: Folder,
  performance: BarChart3
};

const TenantManagement = () => {
  const { user, token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showAdminCode, setShowAdminCode] = useState({});
  const [featuresList, setFeaturesList] = useState([]);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainData, setDomainData] = useState({ domain: '' });
  const [domainInstructions, setDomainInstructions] = useState(null);
  const [domainStatus, setDomainStatus] = useState(null);
  const [checkingDns, setCheckingDns] = useState(false);
  
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    primary_color: '#1a1a1a',
    secondary_color: '#D4AF37',
    email: '',
    phone: '',
    address: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${API}/api/super-admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(response.data);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-generate slug from name
    if (name === 'name' && !showEditModal) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData({ ...formData, name: value, slug });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFile(reader.result);
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      name: '',
      primary_color: '#1a1a1a',
      secondary_color: '#D4AF37',
      email: '',
      phone: '',
      address: ''
    });
    setLogoFile(null);
    setLogoPreview(null);
    setError('');
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Create tenant
      const response = await axios.post(`${API}/api/super-admin/tenants`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newTenant = response.data;
      
      // Upload logo if provided
      if (logoFile) {
        await axios.post(`${API}/api/super-admin/tenants/${newTenant.id}/upload-logo`, 
          { logo: logoFile },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      
      setSuccess('Tenant created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchTenants();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create tenant');
    }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await axios.put(`${API}/api/super-admin/tenants/${selectedTenant.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Upload logo if changed
      if (logoFile && logoFile !== selectedTenant.logo_url) {
        await axios.post(`${API}/api/super-admin/tenants/${selectedTenant.id}/upload-logo`, 
          { logo: logoFile },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      
      setSuccess('Tenant updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchTenants();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete "${tenant.name}"? This will permanently delete all users, timesheets, and data associated with this tenant.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/api/super-admin/tenants/${tenant.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Tenant deleted successfully!');
      fetchTenants();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete tenant');
    }
  };

  const viewTenantDetails = async (tenant) => {
    try {
      const response = await axios.get(`${API}/api/super-admin/tenants/${tenant.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTenant(response.data);
      setShowDetailsModal(true);
    } catch (err) {
      setError('Failed to load tenant details');
    }
  };

  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      slug: tenant.slug,
      name: tenant.name,
      primary_color: tenant.primary_color || '#1a1a1a',
      secondary_color: tenant.secondary_color || '#D4AF37',
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || ''
    });
    setLogoPreview(tenant.logo_url);
    setShowEditModal(true);
  };

  // Feature Toggles
  const openFeaturesModal = async (tenant) => {
    setSelectedTenant(tenant);
    try {
      const response = await axios.get(`${API}/api/super-admin/tenants/${tenant.id}/features`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeaturesList(response.data.features);
      setShowFeaturesModal(true);
    } catch (err) {
      setError('Failed to load features');
    }
  };

  const toggleFeature = (featureKey) => {
    setFeaturesList(featuresList.map(f => 
      f.key === featureKey ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const saveFeatures = async () => {
    setSavingFeatures(true);
    try {
      const enabledFeatures = featuresList.filter(f => f.enabled).map(f => f.key);
      await axios.put(`${API}/api/super-admin/tenants/${selectedTenant.id}/features`, 
        { features_enabled: enabledFeatures },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('Features updated successfully!');
      setShowFeaturesModal(false);
      fetchTenants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update features');
    } finally {
      setSavingFeatures(false);
    }
  };

  // Custom Domain
  const openDomainModal = async (tenant) => {
    setSelectedTenant(tenant);
    setDomainData({ domain: tenant.custom_domain || '' });
    setDomainInstructions(null);
    setDomainStatus(null);
    setShowDomainModal(true);
    
    // Fetch domain status if domain exists
    if (tenant.custom_domain) {
      setCheckingDns(true);
      try {
        const response = await axios.get(
          `${API}/api/super-admin/tenants/${tenant.id}/domain-status`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setDomainStatus(response.data);
      } catch (err) {
        console.error('Failed to fetch domain status:', err);
      } finally {
        setCheckingDns(false);
      }
    }
  };

  const setCustomDomain = async () => {
    if (!domainData.domain.trim()) {
      setError('Please enter a domain');
      return;
    }
    setDomainLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/super-admin/tenants/${selectedTenant.id}/custom-domain`,
        { domain: domainData.domain },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setDomainInstructions(response.data.instructions);
      setSuccess('Domain configured! Follow the instructions below.');
      fetchTenants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set domain');
    } finally {
      setDomainLoading(false);
    }
  };

  const verifyDomain = async () => {
    setDomainLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/super-admin/tenants/${selectedTenant.id}/verify-domain`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      if (response.data.verified) {
        setSuccess('Domain verified successfully!');
        setShowDomainModal(false);
        fetchTenants();
      } else {
        setError(response.data.message);
        // Fetch detailed status on failure
        fetchDomainStatus();
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed');
      fetchDomainStatus();
    } finally {
      setDomainLoading(false);
    }
  };

  const fetchDomainStatus = async () => {
    if (!selectedTenant?.id) return;
    setCheckingDns(true);
    try {
      const response = await axios.get(
        `${API}/api/super-admin/tenants/${selectedTenant.id}/domain-status`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setDomainStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch domain status:', err);
    } finally {
      setCheckingDns(false);
    }
  };

  const removeDomain = async () => {
    if (!window.confirm('Are you sure you want to remove the custom domain?')) return;
    setDomainLoading(true);
    try {
      await axios.delete(
        `${API}/api/super-admin/tenants/${selectedTenant.id}/custom-domain`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('Domain removed successfully!');
      setShowDomainModal(false);
      fetchTenants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove domain');
    } finally {
      setDomainLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Check if user is super admin
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 p-8 ml-64">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
            <p className="text-gray-600 mt-2">Only Super Admins can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8 ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark">Tenant Management</h1>
            <p className="text-gray-600 mt-1">Manage companies using AurborBloom</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2"
            data-testid="create-tenant-btn"
          >
            <Plus className="w-5 h-5" />
            Add New Tenant
          </Button>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
            >
              <X className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tenants Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Loading tenants...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header with color */}
                <div 
                  className="h-3"
                  style={{ backgroundColor: tenant.primary_color }}
                />
                
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-brand-dark truncate">{tenant.name}</h3>
                      <p className="text-sm text-gray-500">{tenant.slug}</p>
                    </div>
                  </div>
                  
                  {/* Domain Status */}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    {tenant.custom_domain ? (
                      <span className={`flex items-center gap-1 ${tenant.custom_domain_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        {tenant.custom_domain}
                        {tenant.custom_domain_verified ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">No custom domain</span>
                    )}
                  </div>
                  
                  {/* Feature count */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Settings className="w-4 h-4" />
                    <span>{tenant.settings?.features_enabled?.length || 0} features enabled</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewTenantDetails(tenant)}
                      data-testid={`view-tenant-${tenant.slug}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFeaturesModal(tenant)}
                      data-testid={`features-tenant-${tenant.slug}`}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Features
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDomainModal(tenant)}
                      data-testid={`domain-tenant-${tenant.slug}`}
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Domain
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(tenant)}
                      data-testid={`edit-tenant-${tenant.slug}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {tenant.slug !== 'aurborbloom' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTenant(tenant)}
                        className="text-red-500 hover:text-red-600 hover:border-red-300"
                        data-testid={`delete-tenant-${tenant.slug}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {(showCreateModal || showEditModal) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-brand-dark">
                      {showEditModal ? 'Edit Tenant' : 'Create New Tenant'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <form onSubmit={showEditModal ? handleUpdateTenant : handleCreateTenant} className="p-6 space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Company Logo
                    </label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Preview" 
                          className="w-16 h-16 object-contain rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <span className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Max 2MB. PNG, JPG, or SVG.</p>
                  </div>
                  
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                      placeholder="e.g., Perfect Solutions"
                      required
                    />
                  </div>
                  
                  {/* Slug (URL identifier) */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      URL Identifier *
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                      placeholder="e.g., perfect-solutions"
                      pattern="^[a-z0-9-]+$"
                      disabled={showEditModal}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only.</p>
                  </div>
                  
                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-dark mb-2">
                        <Palette className="w-4 h-4 inline mr-1" />
                        Primary Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-dark mb-2">
                        <Palette className="w-4 h-4 inline mr-1" />
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                      placeholder="contact@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                      placeholder="123 Business St, City, State"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {showEditModal ? 'Update Tenant' : 'Create Tenant'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedTenant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDetailsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="h-3 rounded-t-2xl"
                  style={{ backgroundColor: selectedTenant.primary_color }}
                />
                
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    {selectedTenant.logo_url ? (
                      <img 
                        src={selectedTenant.logo_url} 
                        alt={selectedTenant.name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                        style={{ backgroundColor: selectedTenant.primary_color }}
                      >
                        {selectedTenant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-brand-dark">{selectedTenant.name}</h2>
                      <p className="text-gray-500">{selectedTenant.slug}</p>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Stats */}
                  {selectedTenant.stats && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-brand-dark">{selectedTenant.stats.admin_count}</p>
                        <p className="text-sm text-gray-500">Admins</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-brand-dark">{selectedTenant.stats.employee_count}</p>
                        <p className="text-sm text-gray-500">Employees</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-brand-dark">{selectedTenant.stats.total_users}</p>
                        <p className="text-sm text-gray-500">Total Users</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Admin Signup Code */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <label className="block text-sm font-medium text-amber-800 mb-2">
                      Admin Signup Code
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-mono border">
                        {showAdminCode[selectedTenant.id] 
                          ? selectedTenant.admin_signup_code 
                          : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowAdminCode({
                          ...showAdminCode, 
                          [selectedTenant.id]: !showAdminCode[selectedTenant.id]
                        })}
                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        {showAdminCode[selectedTenant.id] ? (
                          <EyeOff className="w-5 h-5 text-amber-700" />
                        ) : (
                          <Eye className="w-5 h-5 text-amber-700" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedTenant.admin_signup_code)}
                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <Copy className="w-5 h-5 text-amber-700" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Share this code with the company admin to create their account.
                    </p>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    {selectedTenant.email && (
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span> {selectedTenant.email}
                      </p>
                    )}
                    {selectedTenant.phone && (
                      <p className="text-gray-600">
                        <span className="font-medium">Phone:</span> {selectedTenant.phone}
                      </p>
                    )}
                    {selectedTenant.address && (
                      <p className="text-gray-600">
                        <span className="font-medium">Address:</span> {selectedTenant.address}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Toggle Modal */}
        <AnimatePresence>
          {showFeaturesModal && selectedTenant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowFeaturesModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-brand-dark">Feature Toggles</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedTenant.name}</p>
                    </div>
                    <button
                      onClick={() => setShowFeaturesModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Enable or disable modules for this tenant. Disabled features will not appear in their navigation.
                  </p>
                  
                  <div className="space-y-3">
                    {featuresList.map((feature) => {
                      const Icon = FEATURE_ICONS[feature.key] || Settings;
                      return (
                        <div
                          key={feature.key}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                            feature.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => toggleFeature(feature.key)}
                          data-testid={`toggle-feature-${feature.key}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              feature.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-brand-dark">{feature.label}</p>
                              <p className="text-xs text-gray-500">{feature.description}</p>
                            </div>
                          </div>
                          {feature.enabled ? (
                            <ToggleRight className="w-8 h-8 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-3 pt-6 mt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowFeaturesModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveFeatures}
                      disabled={savingFeatures}
                      className="flex-1"
                    >
                      {savingFeatures ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Domain Modal */}
        <AnimatePresence>
          {showDomainModal && selectedTenant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDomainModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-brand-dark">Custom Domain</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedTenant.name}</p>
                    </div>
                    <button
                      onClick={() => setShowDomainModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {selectedTenant.custom_domain ? (
                    <div className="mb-6">
                      <div className={`p-4 rounded-xl border ${
                        selectedTenant.custom_domain_verified 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          {selectedTenant.custom_domain_verified ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                          )}
                          <span className="font-medium">
                            {selectedTenant.custom_domain_verified ? 'Domain Verified' : 'Pending Verification'}
                          </span>
                        </div>
                        <p className="text-lg font-mono">{selectedTenant.custom_domain}</p>
                      </div>
                      
                      {/* DNS Status Details */}
                      {!selectedTenant.custom_domain_verified && domainStatus?.dns_checks && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-700">DNS Check Results</h4>
                            <button
                              onClick={fetchDomainStatus}
                              disabled={checkingDns}
                              className="text-sm text-brand-black hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${checkingDns ? 'animate-spin' : ''}`} />
                              Refresh
                            </button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <span className="text-gray-600">CNAME Record</span>
                              <span className={`flex items-center gap-1 ${
                                domainStatus.dns_checks.cname_record?.status === 'found' 
                                  ? 'text-green-600' 
                                  : 'text-red-500'
                              }`}>
                                {domainStatus.dns_checks.cname_record?.status === 'found' ? (
                                  <><CheckCircle className="w-4 h-4" /> Found</>
                                ) : (
                                  <><AlertCircle className="w-4 h-4" /> Not Found</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <span className="text-gray-600">Domain Resolves</span>
                              <span className={`flex items-center gap-1 ${
                                domainStatus.dns_checks.resolves?.status === 'success' 
                                  ? 'text-green-600' 
                                  : 'text-red-500'
                              }`}>
                                {domainStatus.dns_checks.resolves?.status === 'success' ? (
                                  <><CheckCircle className="w-4 h-4" /> Yes ({domainStatus.dns_checks.resolves.ip})</>
                                ) : (
                                  <><AlertCircle className="w-4 h-4" /> No</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <span className="text-gray-600">TXT Verification</span>
                              <span className={`flex items-center gap-1 ${
                                domainStatus.dns_checks.txt_record?.found 
                                  ? 'text-green-600' 
                                  : 'text-amber-500'
                              }`}>
                                {domainStatus.dns_checks.txt_record?.found ? (
                                  <><CheckCircle className="w-4 h-4" /> Verified</>
                                ) : (
                                  <><AlertCircle className="w-4 h-4" /> Optional</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {checkingDns && (
                        <div className="mt-4 flex items-center justify-center text-gray-500 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Checking DNS records...
                        </div>
                      )}
                      
                      <div className="flex gap-3 mt-4">
                        {!selectedTenant.custom_domain_verified && (
                          <Button
                            onClick={verifyDomain}
                            disabled={domainLoading}
                            className="flex-1"
                          >
                            {domainLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Verify Domain
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={removeDomain}
                          disabled={domainLoading}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-brand-dark mb-2">
                        Enter Custom Domain
                      </label>
                      <input
                        type="text"
                        value={domainData.domain}
                        onChange={(e) => setDomainData({ domain: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                        placeholder="hr.yourcompany.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your custom domain (e.g., hr.perfectsolutions.com)
                      </p>
                      
                      <Button
                        onClick={setCustomDomain}
                        disabled={domainLoading || !domainData.domain}
                        className="w-full mt-4"
                      >
                        {domainLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Globe className="w-4 h-4 mr-2" />
                        )}
                        Configure Domain
                      </Button>
                    </div>
                  )}
                  
                  {domainInstructions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                      <h4 className="font-medium text-blue-800 mb-3">DNS Configuration Instructions</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-blue-700">Step 1:</p>
                          <p className="text-blue-600">{domainInstructions.step1}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-700">Step 2:</p>
                          <p className="text-blue-600">{domainInstructions.step2}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-700">Step 3:</p>
                          <p className="text-blue-600">{domainInstructions.step3}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-xl p-4 mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">How it works</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Users can access the app via your custom domain</li>
                      <li>• The app will automatically detect the tenant</li>
                      <li>• DNS changes may take up to 48 hours to propagate</li>
                      <li>• System automatically checks DNS every hour</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TenantManagement;
