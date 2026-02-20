// ================================================
// MAIN DASHBOARD LOGIC FOR EV USERS
// ================================================
// Demo: User dashboard with map, bookings, and green impact tracking
// Features:
// - Interactive map with charger discovery
// - Booking management (active/completed)
// - Green score and environmental impact tracking
// - Leaderboard showing top eco-friendly users
// - Auto-refresh every 30 seconds

let bookingsModal;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('USER DASHBOARD STARTING');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.log('Leaflet available:', typeof L !== 'undefined');
    
    // Wait a bit for DOM to fully render before initializing map
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize map and public data even for guests
    try {
        console.log('Step 1: Initializing map...');
        console.log('   - Checking if map container exists...');
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Map container#map not found in DOM!');
        }
        console.log(`   - Map container found: ${mapContainer.offsetWidth}x${mapContainer.offsetHeight}px`);

        const mapReady = initMap();
        if (!mapReady) {
            console.warn('Map initialization returned false but continuing...');
        }
        console.log('Step 1 complete');

        // Wait another moment for map to start rendering before loading chargers
        await new Promise(resolve => setTimeout(resolve, 200));

        // Load public data
        console.log('Step 2: Loading public charger data...');
        await loadChargers();          // Load and render chargers on map
        console.log('Step 2 complete');
        
        console.log('Step 3: Loading leaderboard...');
        await loadLeaderboard();       // Load top users
        console.log('Step 3 complete');
        
        // Always load and display green impact for prototype demo
        console.log('Step 4: Loading green impact data...');
        await loadImpact();            // Load green impact stats (demo data for prototype)
        console.log('Step 4 complete');

        // If user is authenticated, load additional private data and set up user UI
        if (Auth.isAuthenticated()) {
            console.log('Step 5: User is authenticated - loading user-specific data...');
            const user = Auth.getCurrentUser();
            console.log(`Welcome ${user.name}`);

            // Update UI with user info
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = user.name || user.email;

            // Load user-specific data
            await updateUserProfile();     // Get user profile data
            await loadRecentSessions();    // Load user's recent sessions
            await loadAcceptedRequests();  // Load accepted booking requests
            console.log('Step 5 complete');

            // Setup event listeners for authenticated users
            console.log('Step 6: Setting up event listeners...');
            bookingsModal = new bootstrap.Modal(document.getElementById('bookingsModal'));
            const viewBookingsBtn = document.getElementById('viewBookings');
            if (viewBookingsBtn) {
                viewBookingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showMyBookings();
                });
            }
            console.log('Step 6 complete');
        } else {
            // For guest/demo users, show generic welcome
            console.log('Guest/Demo mode - no authentication required for prototype');
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = 'Demo User';
        }

        // Setup logout button if present (works for both guest and user views)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
                // Keep using /public/login.html to match file layout
                window.location.href = '/public/login.html';
            });
        }

        // Refresh public data every 30 seconds
        setInterval(() => {
            console.log('Periodic refresh: Reloading chargers and impact data...');
            loadChargers();
            loadImpact();
            if (Auth.isAuthenticated()) {
                updateUserProfile();
            }
        }, 30000);

        console.log('DASHBOARD INITIALIZATION COMPLETE');
        console.log('Map should be visible above.');
        
        // Mark dashboard as loaded
        window.dashboardLoaded = true;
    } catch (err) {
        console.error('CRITICAL: Dashboard initialization error:', err);
        console.error('Error stack:', err.stack);
        // Show error in an alert for visibility
        alert(`Dashboard Error: ${err.message}\n\nCheck browser console for details.`);
    }
});

// Update user profile from API
// PROTOTYPE MODE: Shows static placeholder data
async function updateUserProfile() {
    try {
        console.log('Updating profile (PROTOTYPE MODE - static data)...');
        // PROTOTYPE: Use static data instead of API call
        const profile = { greenScore: 75 };
        
            if (profile && profile.greenScore !== undefined) {
            document.getElementById('userScore').textContent = `Score: ${profile.greenScore}`;
            console.log(`Green score (STATIC): ${profile.greenScore}`);
        }
    } catch (err) {
        console.warn('Profile update failed (non-critical):', err);
        // Continue - not critical for demo
    }
}

// Load user impact (green score, sessions, CO2 saved)
// PROTOTYPE MODE: Shows static placeholder data
async function loadImpact() {
    try {
        console.log('Loading user impact (PROTOTYPE MODE - static data)...');
        
        // Check if required DOM elements exist
        const scoreEl = document.getElementById('greenScoreValue');
        const progressEl = document.getElementById('greenProgress');
        const percentEl = document.getElementById('greenScorePercent');
        const sessionsEl = document.getElementById('totalSessions');
        const co2El = document.getElementById('co2Saved');
        
        if (!scoreEl || !progressEl || !percentEl) {
            console.warn('Impact elements missing from DOM, skipping update');
            return;
        }

        // PROTOTYPE: Use static data instead of API call
        const impact = {
            greenScore: 75,
            totalSessions: 12,
            estimatedCO2Saved: 45.6
        };

        const score = Math.max(0, Math.min(100, impact.greenScore || 0));
        const percent = Math.round((score / 100) * 100);

        scoreEl.textContent = `${score}`;
        progressEl.style.width = `${percent}%`;
        progressEl.setAttribute('aria-valuenow', percent);
        percentEl.textContent = `${percent}%`;
        
        if (sessionsEl) sessionsEl.textContent = impact.totalSessions || 0;
        if (co2El) co2El.textContent = `${(impact.estimatedCO2Saved || 0).toFixed(1)} kg`;

        console.log(`Impact loaded (STATIC): Score=${score}, Sessions=${impact.totalSessions}, CO2=${(impact.estimatedCO2Saved || 0).toFixed(1)}kg`);

        // Also update navbar quick score
        const profileScore = document.getElementById('userScore');
        if (profileScore) profileScore.textContent = `Score: ${score}`;
    } catch (err) {
        console.error('Impact load error:', err);
        // Show default values - demo-safe fallback
        try {
            const scoreEl = document.getElementById('greenScoreValue');
            const progressEl = document.getElementById('greenProgress');
            const percentEl = document.getElementById('greenScorePercent');
            const sessionsEl = document.getElementById('totalSessions');
            const co2El = document.getElementById('co2Saved');
            
            if (scoreEl) scoreEl.textContent = '75';
            if (progressEl) progressEl.style.width = '75%';
            if (percentEl) percentEl.textContent = '75%';
            if (sessionsEl) sessionsEl.textContent = '12';
            if (co2El) co2El.textContent = '45.6 kg';
        } catch (fallbackErr) {
            console.warn('Could not set fallback values:', fallbackErr);
        }
    }
}

// Load and render recent sessions (user bookings)
async function loadRecentSessions() {
    try {
        console.log('Loading recent sessions...');
        const bookings = await API.getUserBookings();
        const container = document.getElementById('recentSessions');
        if (!container) return;

        if (!Array.isArray(bookings) || bookings.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent sessions.</p>';
            return;
        }

        let html = '<div class="list-group">';
        bookings.slice(0,5).forEach(b => {
            const charger = b.chargerId || {};
            const start = new Date(b.startTime).toLocaleString();
            const end = b.endTime ? new Date(b.endTime).toLocaleString() : '-';
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${charger.name || 'Unknown'}</strong>
                            <div class="small text-muted">${charger.address || ''}</div>
                        </div>
                        <div class="text-end small">
                            <div>${b.status ? b.status.toUpperCase() : ''}</div>
                            <div>${start} → ${end}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load recent sessions:', err);
        const container = document.getElementById('recentSessions');
        if (container) container.innerHTML = '<p class="text-danger">Error loading sessions</p>';
    }
}

// Load accepted booking requests (requests approved by owner)
async function loadAcceptedRequests() {
    try {
        console.log('Loading booking requests...');
        const requests = await BookingRequest.loadUserBookingRequests();
        const container = document.getElementById('acceptedRequests');
        if (!container) return;

        const accepted = (Array.isArray(requests) ? requests : []).filter(r => r.status === 'approved' || r.status === 'session_active' || r.status === 'session_ended');
        if (accepted.length === 0) {
            container.innerHTML = '<p class="text-muted">No accepted requests.</p>';
            return;
        }

        let html = '<div class="list-group">';
        accepted.slice(0,5).forEach(r => {
            const charger = r.chargerId || {};
            const approvedAt = r.approvedAt ? new Date(r.approvedAt).toLocaleString() : '-';
            const bookingId = r.bookingId || '';
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${charger.name || 'Unknown'}</strong>
                            <div class="small text-muted">Approved: ${approvedAt}</div>
                            <div class="small text-muted">Duration: ${r.durationHours * 60} minutes</div>
                        </div>
                        <div class="text-end small">
                            <div>${BookingRequest.getStatusBadge(r.status)}</div>
                            ${bookingId ? `<div class="mt-1"><small>Booking: ${bookingId}</small></div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load accepted requests:', err);
        const container = document.getElementById('acceptedRequests');
        if (container) container.innerHTML = '<p class="text-danger">Error loading accepted requests</p>';
    }
}

async function showMyBookings() {
    try {
        console.log('Loading bookings and requests...');
        // Load both active bookings and pending requests
        const bookings = await API.getUserBookings();
        const requests = await BookingRequest.loadUserBookingRequests();

        // Populate active bookings tab
        let html = '';
        if (!Array.isArray(bookings) || bookings.length === 0) {
            html = '<p class="text-muted">No active bookings yet. Find and book a charger!</p>';
        } else {
            bookings.forEach(booking => {
                const charger = booking.chargerId;
                const startTime = new Date(booking.startTime);
                const endTime = booking.endTime ? new Date(booking.endTime) : null;
                const statusBadgeClass = {
                    'active': 'bg-info',
                    'completed': 'bg-success',
                    'cancelled': 'bg-danger'
                }[booking.status] || 'bg-secondary';
                html += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="mb-1">${charger && charger.name ? charger.name : 'Unknown Charger'}</h6>
                                    <small class="text-muted">${charger && charger.address ? charger.address : ''}</small>
                                </div>
                                <span class="badge ${statusBadgeClass}">${booking.status ? booking.status.toUpperCase() : ''}</span>
                            </div>
                            <div class="small text-muted">
                                <div>Start: ${startTime.toLocaleString()}</div>
                                ${endTime ? `<div>End: ${endTime.toLocaleString()}</div>` : ''}
                                <div>Duration: ${booking.durationHours || 0}h | Green Points: ${booking.greenPointsEarned || 0}</div>
                            </div>
                            ${booking.status === 'active' ? `
                                <button class="btn btn-sm btn-success mt-2" onclick="completeBooking('${booking._id}')">Complete</button>
                                <button class="btn btn-sm btn-danger mt-2" onclick="cancelBooking('${booking._id}')">Cancel</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }
        document.getElementById('bookings-content').innerHTML = html;

        // Populate booking requests tab
        let requestsHtml = '';
        try {
            requestsHtml = BookingRequest.renderUserRequests(requests);
        } catch (e) {
            requestsHtml = '<p class="text-danger">Error loading requests</p>';
        }
        document.getElementById('requests-content').innerHTML = requestsHtml;

        if (bookingsModal) bookingsModal.show();
    } catch (err) {
        console.error('Error loading bookings:', err);
        document.getElementById('bookings-content').innerHTML = '<p class="text-danger">Error loading bookings</p>';
        document.getElementById('requests-content').innerHTML = '<p class="text-danger">Error loading requests</p>';
        if (bookingsModal) bookingsModal.show();
    }
}

async function completeBooking(bookingId) {
    if (!confirm('Mark this booking as complete?')) return;

    try {
        console.log(`Completing booking: ${bookingId}`);
        const result = await API.completeBooking(bookingId);
        if (!result.error) {
            console.log('Booking completed successfully');
            alert('Booking completed. Green points earned.');
            updateUserProfile();
            showMyBookings();
            loadChargers();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (err) {
        console.error('Failed to complete booking:', err);
        alert('Failed to complete booking: ' + (err.message || 'Please try again'));
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking? Slot will be freed up.')) return;
    
    try {
        console.log(`Cancelling booking: ${bookingId}`);
        const result = await API.cancelBooking(bookingId);
        if (!result.error) {
            console.log('Booking cancelled successfully');
            alert('Booking cancelled. Slot is now available for others.');
            updateUserProfile();
            showMyBookings();
            loadChargers();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (err) {
        console.error('Failed to cancel booking:', err);
        alert('Failed to cancel booking: ' + (err.message || 'Please try again'));
    }
}
