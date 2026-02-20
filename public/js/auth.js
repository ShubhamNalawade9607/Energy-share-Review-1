// ================================================
// AUTHENTICATION & USER MANAGEMENT
// ================================================
// Demo: Handles user registration, login, logout
// Stores JWT token in localStorage for API requests
// Role-based access control (user vs owner)

const Auth = {
    // Login user
    // Validates credentials, verifies role, stores token
    async login(email, password, role) {
        console.log(`🔓 Login attempt: ${email} as ${role}`);
        
        try {
            console.log('📡 Sending login request to server...');
            const result = await API.login(email, password);
            console.log('📨 Login response received:', result);

            // API returns { token, user, message } on success
            // Treat missing token as failure — don't treat a present "message" as an error
            if (!result || !result.token) {
                console.error('❌ Login failed:', result?.message || result?.error || 'No token received');
                alert('❌ Login failed: ' + (result?.message || result?.error || 'Please check your credentials') + '\n\nTip: Try demo@example.com / password123');
                return;
            }

            // Verify role matches the login portal
            if (result.user.role !== role) {
                console.warn(`⚠️ Role mismatch. User is ${result.user.role}, tried ${role}`);
                alert(`❌ Wrong login portal!\n\nYou are a ${result.user.role}.\nPlease use the ${result.user.role} login page.`);
                return;
            }

            // Store auth token and user data
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            console.log(`✅ Login successful: ${result.user.name}`);

            // Redirect to appropriate dashboard (use /public/ paths to match project layout)
            const dashboard = result.user.role === 'owner' ? '/public/owner.html' : '/public/dashboard.html';
            console.log(`📍 Redirecting to ${dashboard}`);
            window.location.href = dashboard;
        } catch (err) {
            console.error('❌ Login error:', err);
            alert('❌ Login error: ' + err.message);
        }
    },

    // Register new user
    // Creates account, stores auth token, redirects to dashboard
    async register(name, email, password, role) {
        console.log(`📝 Registration attempt: ${email} as ${role}`);
        
        try {
            console.log('📡 Sending registration request to server...');
            const result = await API.register(name, email, password, role);
            console.log('📨 Registration response received:', result);

            // Expect a token on success
            if (!result || !result.token) {
                console.error('❌ Registration failed:', result?.message || result?.error || 'No token received');
                alert('❌ Registration failed: ' + (result?.message || result?.error || 'Please try again'));
                return;
            }

            // Store auth token and user data
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            console.log(`✅ Registration successful: ${result.user.name}`);

            // Redirect to dashboard (use /public/ paths to match project layout)
            const dashboard = result.user.role === 'owner' ? '/public/owner.html' : '/public/dashboard.html';
            console.log(`📍 Redirecting to ${dashboard}`);
            window.location.href = dashboard;
        } catch (err) {
            console.error('❌ Registration error:', err);
            alert('❌ Registration error: ' + err.message);
        }
    },

    // Logout user
    // Clears token and user data, redirects to home
    logout() {
        console.log('🚪 Logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to the public index page to match provided HTML paths
        window.location.href = '/public/index.html';
    },

    // Check if user is logged in
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Get current user data from localStorage
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Require authentication - redirect if not logged in
    // Used on dashboard pages to protect routes
    requireAuth() {
        if (!this.isAuthenticated()) {
            console.warn('⚠️ Unauthorized access - redirecting to home');
            window.location.href = '/public/index.html';
            return false;
        }
        console.log('✅ User authenticated');
        return true;
    }
};

// Setup authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Page loaded - checking authentication');
    
    // Setup logout button if present
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    // PROTOTYPE DEMO MODE: Allow dashboard pages to load without authentication
    // This enables viewing the map and UI without requiring backend login
    // Full auth flow will be implemented in Review 2
    console.log('✅ PROTOTYPE MODE: Allowing dashboard without authentication for demo purposes');
});
