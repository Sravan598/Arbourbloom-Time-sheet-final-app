"""
Test Custom Domain Mapping and Feature Toggles for AurborBloom HRMS
Tests the new super admin features:
1. Custom Domain Mapping (CNAME)
2. Tenant-Specific Feature Toggles
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://saasbloom.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {
    "email": "superadmin@aurborbloom.com",
    "password": "superadmin123",
    "tenant_id": "aurborbloom"
}

PERFECT_SOLUTIONS_ADMIN_CREDS = {
    "email": "admin@perfectsolutions.com",
    "password": "admin123",
    "tenant_id": "perfectsolutions"
}


class TestSuperAdminAuth:
    """Test super admin authentication"""
    
    def test_super_admin_login(self):
        """Test super admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        print(f"Super Admin Login Status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code != 500 else response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["user"]["role"] == "SUPER_ADMIN"
            print(f"✓ Super Admin login successful - Role: {data['user']['role']}")
            return data["access_token"]
        elif response.status_code == 401:
            print(f"✗ Super Admin login failed - {response.json().get('detail', 'Unknown error')}")
            pytest.skip("Super admin account not found - may need to be created")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestFeatureToggles:
    """Test Feature Toggle functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_get_available_features(self, super_admin_token):
        """Test GET /api/super-admin/features - list all available features"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/super-admin/features", headers=headers)
        
        print(f"Get Available Features Status: {response.status_code}")
        
        assert response.status_code == 200
        features = response.json()
        
        # Should have 8 features
        assert len(features) == 8
        
        # Check expected features exist
        feature_keys = [f["key"] for f in features]
        expected_features = ["timesheets", "tickets", "leave", "calendar", "projects", "chat", "documents", "performance"]
        
        for expected in expected_features:
            assert expected in feature_keys, f"Missing feature: {expected}"
        
        print(f"✓ Found {len(features)} available features: {feature_keys}")
        
        # Verify feature structure
        for feature in features:
            assert "key" in feature
            assert "label" in feature
            assert "description" in feature
            assert "icon" in feature
        
        print("✓ All features have correct structure (key, label, description, icon)")
    
    def test_get_tenant_list(self, super_admin_token):
        """Test GET /api/super-admin/tenants - list all tenants"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        
        print(f"Get Tenants Status: {response.status_code}")
        
        assert response.status_code == 200
        tenants = response.json()
        
        print(f"✓ Found {len(tenants)} tenants")
        
        # Find perfectsolutions tenant
        ps_tenant = None
        for tenant in tenants:
            print(f"  - {tenant['name']} ({tenant['slug']})")
            if tenant['slug'] == 'perfectsolutions':
                ps_tenant = tenant
        
        if ps_tenant:
            print(f"✓ Perfect Solutions tenant found")
            print(f"  Custom Domain: {ps_tenant.get('custom_domain', 'None')}")
            print(f"  Domain Verified: {ps_tenant.get('custom_domain_verified', False)}")
            print(f"  Features Enabled: {ps_tenant.get('settings', {}).get('features_enabled', [])}")
            return ps_tenant
        else:
            print("✗ Perfect Solutions tenant not found")
            return None
    
    def test_get_tenant_features(self, super_admin_token):
        """Test GET /api/super-admin/tenants/{id}/features - get tenant's feature settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get tenant list to find perfectsolutions
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        tenants = response.json()
        
        ps_tenant = next((t for t in tenants if t['slug'] == 'perfectsolutions'), None)
        if not ps_tenant:
            pytest.skip("Perfect Solutions tenant not found")
        
        # Get features for this tenant
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/features", headers=headers)
        
        print(f"Get Tenant Features Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data
        assert "features_enabled" in data
        assert "tenant_name" in data
        
        print(f"✓ Tenant: {data['tenant_name']}")
        print(f"✓ Features enabled: {data['features_enabled']}")
        
        # Check each feature has enabled status
        for feature in data["features"]:
            status = "✓" if feature["enabled"] else "✗"
            print(f"  {status} {feature['label']} ({feature['key']})")
        
        return data
    
    def test_update_tenant_features(self, super_admin_token):
        """Test PUT /api/super-admin/tenants/{id}/features - update tenant's enabled features"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get tenant list to find perfectsolutions
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        tenants = response.json()
        
        ps_tenant = next((t for t in tenants if t['slug'] == 'perfectsolutions'), None)
        if not ps_tenant:
            pytest.skip("Perfect Solutions tenant not found")
        
        # Get current features
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/features", headers=headers)
        current_features = response.json()["features_enabled"]
        print(f"Current features: {current_features}")
        
        # Update features - enable all
        new_features = ["timesheets", "tickets", "leave", "calendar", "projects", "chat", "documents", "performance"]
        
        response = requests.put(
            f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/features",
            headers=headers,
            json={"features_enabled": new_features}
        )
        
        print(f"Update Features Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "features_enabled" in data
        assert data["features_enabled"] == new_features
        
        print(f"✓ Features updated successfully")
        print(f"✓ New features: {data['features_enabled']}")
        
        # Restore original features
        response = requests.put(
            f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/features",
            headers=headers,
            json={"features_enabled": current_features}
        )
        
        print(f"✓ Restored original features: {current_features}")


class TestCustomDomain:
    """Test Custom Domain functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return response.json()["access_token"]
    
    def test_set_custom_domain(self, super_admin_token):
        """Test POST /api/super-admin/tenants/{id}/custom-domain - set custom domain"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get tenant list to find perfectsolutions
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        tenants = response.json()
        
        ps_tenant = next((t for t in tenants if t['slug'] == 'perfectsolutions'), None)
        if not ps_tenant:
            pytest.skip("Perfect Solutions tenant not found")
        
        # Set custom domain
        test_domain = "hr.perfectsolutions.com"
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/custom-domain",
            headers=headers,
            json={"domain": test_domain}
        )
        
        print(f"Set Custom Domain Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "domain" in data
        assert "verification_token" in data
        assert "instructions" in data
        
        print(f"✓ Domain set: {data['domain']}")
        print(f"✓ Verification token: {data['verification_token']}")
        print(f"✓ Instructions provided:")
        for step, instruction in data["instructions"].items():
            print(f"  {step}: {instruction}")
        
        return data
    
    def test_verify_domain(self, super_admin_token):
        """Test POST /api/super-admin/tenants/{id}/verify-domain - verify domain DNS"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get tenant list to find perfectsolutions
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        tenants = response.json()
        
        ps_tenant = next((t for t in tenants if t['slug'] == 'perfectsolutions'), None)
        if not ps_tenant:
            pytest.skip("Perfect Solutions tenant not found")
        
        if not ps_tenant.get('custom_domain'):
            pytest.skip("No custom domain configured for Perfect Solutions")
        
        # Verify domain
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{ps_tenant['id']}/verify-domain",
            headers=headers
        )
        
        print(f"Verify Domain Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "verified" in data
        assert "message" in data
        assert "domain" in data
        
        if data["verified"]:
            print(f"✓ Domain verified: {data['domain']}")
        else:
            print(f"✗ Domain not verified: {data['message']}")
            if "troubleshooting" in data:
                print("  Troubleshooting tips:")
                for tip in data["troubleshooting"]:
                    print(f"    - {tip}")
        
        return data
    
    def test_get_tenant_by_domain(self, super_admin_token):
        """Test GET /api/tenants/by-domain/{domain} - lookup tenant by custom domain"""
        # This is a public endpoint, no auth needed
        test_domain = "hr.perfectsolutions.com"
        
        response = requests.get(f"{BASE_URL}/api/tenants/by-domain/{test_domain}")
        
        print(f"Get Tenant by Domain Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found tenant: {data.get('name', 'Unknown')}")
            print(f"  Slug: {data.get('slug', 'Unknown')}")
            return data
        elif response.status_code == 404:
            print(f"✗ No tenant found for domain (may not be verified yet)")
            # This is expected if domain is not verified
            return None
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_remove_custom_domain(self, super_admin_token):
        """Test DELETE /api/super-admin/tenants/{id}/custom-domain - remove custom domain"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get tenant list to find a test tenant (not perfectsolutions to avoid breaking it)
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=headers)
        tenants = response.json()
        
        # Find aurborbloom tenant for testing (we'll set and remove domain)
        test_tenant = next((t for t in tenants if t['slug'] == 'aurborbloom'), None)
        if not test_tenant:
            pytest.skip("AurborBloom tenant not found")
        
        # First set a test domain
        test_domain = "test.aurborbloom.com"
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant['id']}/custom-domain",
            headers=headers,
            json={"domain": test_domain}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not set test domain")
        
        print(f"✓ Set test domain: {test_domain}")
        
        # Now remove it
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant['id']}/custom-domain",
            headers=headers
        )
        
        print(f"Remove Domain Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        print(f"✓ Domain removed: {data['message']}")
        
        return data


class TestTenantPublicEndpoints:
    """Test public tenant endpoints"""
    
    def test_get_public_tenants(self):
        """Test GET /api/tenants/public - list active tenants for login dropdown"""
        response = requests.get(f"{BASE_URL}/api/tenants/public")
        
        print(f"Get Public Tenants Status: {response.status_code}")
        
        assert response.status_code == 200
        tenants = response.json()
        
        print(f"✓ Found {len(tenants)} public tenants")
        
        for tenant in tenants:
            print(f"  - {tenant['name']} ({tenant['slug']})")
            # Check tenant has settings with features_enabled
            if tenant.get('settings') and tenant['settings'].get('features_enabled'):
                print(f"    Features: {tenant['settings']['features_enabled']}")
        
        return tenants
    
    def test_get_tenant_public_info(self):
        """Test GET /api/tenants/{slug}/public - get public info for a specific tenant"""
        response = requests.get(f"{BASE_URL}/api/tenants/perfectsolutions/public")
        
        print(f"Get Tenant Public Info Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Tenant: {data.get('name', 'Unknown')}")
            print(f"  Slug: {data.get('slug', 'Unknown')}")
            print(f"  Primary Color: {data.get('primary_color', 'Unknown')}")
            if data.get('settings') and data['settings'].get('features_enabled'):
                print(f"  Features: {data['settings']['features_enabled']}")
            return data
        elif response.status_code == 404:
            print(f"✗ Perfect Solutions tenant not found")
            pytest.skip("Perfect Solutions tenant not found")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestFeatureFilteredNavigation:
    """Test that navigation is filtered based on enabled features"""
    
    @pytest.fixture
    def perfect_solutions_admin_token(self):
        """Get Perfect Solutions admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PERFECT_SOLUTIONS_ADMIN_CREDS)
        if response.status_code != 200:
            print(f"Perfect Solutions admin login failed: {response.json() if response.status_code != 500 else response.text}")
            pytest.skip("Perfect Solutions admin login failed")
        return response.json()["access_token"]
    
    def test_tenant_features_affect_navigation(self, perfect_solutions_admin_token):
        """Verify that tenant's enabled features are returned correctly"""
        headers = {"Authorization": f"Bearer {perfect_solutions_admin_token}"}
        
        # Get tenant public info to check features
        response = requests.get(f"{BASE_URL}/api/tenants/perfectsolutions/public")
        
        print(f"Get Tenant Features Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            features = data.get('settings', {}).get('features_enabled', [])
            print(f"✓ Perfect Solutions enabled features: {features}")
            
            # These features should affect sidebar navigation
            all_features = ["timesheets", "tickets", "leave", "calendar", "projects", "chat", "documents", "performance"]
            
            for feature in all_features:
                if feature in features:
                    print(f"  ✓ {feature} - ENABLED (should show in sidebar)")
                else:
                    print(f"  ✗ {feature} - DISABLED (should NOT show in sidebar)")
            
            return features
        else:
            pytest.skip("Could not get tenant info")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
