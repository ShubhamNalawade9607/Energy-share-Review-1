// ================================================
// OWNER DASHBOARD LOGIC
// ================================================
// Demo: Owner management of charging stations
// Features:
// - Add/edit/delete charging stations
// - Monitor booking activity
// - View station statistics
// - Track revenue and utilization

// Array of chargers (stations) owned by the current user
let ownerStations = [];
let editingChargerId = null; // id of the charger currently being edited
let editChargerModal;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Owner dashboard loading...');
    
    if (!Auth.requireAuth()) return;

    try {
        const user = Auth.getCurrentUser();
        
        console.log(`Owner: ${user.name} (${user.email})`);
        
        if (user.role !== 'owner') {
            console.error(' Non-owner trying to access owner dashboard');
            alert(' Access denied - Owner role required');
            Auth.logout();
            return;
        }

        // Update UI
        document.getElementById('businessName').textContent = user.name || 'Business';
        
        // Initialize modals
        editChargerModal = new bootstrap.Modal(document.getElementById('editChargerModal'));

        // Setup event listeners
        document.getElementById('addChargerForm').addEventListener('submit', handleAddCharger);
        document.getElementById('saveEditBtn').addEventListener('click', handleSaveEdit);

        // Load initial data
        console.log('Loading owner data...');
        await loadOwnerStations();
        await loadStatistics();
        await loadPendingRequests();

        console.log('Owner dashboard ready');

        // Refresh data every 30 seconds
        setInterval(() => {
            console.log('Refreshing owner data...');
            loadOwnerStations();
            loadStatistics();
            loadPendingRequests();
        }, 30000);

    } catch (err) {
        console.error(' Owner dashboard initialization error:', err);
        // Continue anyway - demo-safe
    }
});

// Load the list of chargers (stations) for the current owner and render them
async function loadOwnerStations() {
    try {
        console.log('Loading chargers for owner...');
        const data = await API.getOwnerChargers();
        ownerStations = Array.isArray(data) ? data : [];

        console.log(`Found ${ownerStations.length} chargers`);

        let html = '';
        if (ownerChargers.length === 0) {
            html = '<p class="text-muted">No stations yet. Add your first charging station above!</p>';
        } else {
            html = `
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Station Name</th>
                                <th>Type</th>
                                <th>Slots</th>
                                <th>Bookings</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (const charger of ownerStations) {
                // Fetch booking count for this charger
                try {
                    const bookings = await API.getChargerBookings(charger._id);
                    const bookingCount = Array.isArray(bookings) ? bookings.filter(b => b.status !== 'cancelled').length : 0;

                    html += `
                        <tr>
                            <td>
                                <strong>${charger.name}</strong>
                                <br>
                                <small class="text-muted">${charger.address}</small>
                            </td>
                            <td><span class="badge bg-secondary">${charger.chargerType}</span></td>
                                <td>${charger.availableSlots}/${charger.totalSlots}</td>
                            <td><strong>${bookingCount}</strong></td>
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="openEditModal('${charger._id}', '${charger.name}', '${(charger.description || '').replace(/'/g, "&apos;")}', ${charger.totalSlots})">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteCharger('${charger._id}')">Delete</button>
                                </td>
                        </tr>
                    `;
                } catch (err) {
                    console.warn(`Could not load bookings for charger ${charger._id}:`, err);
                    html += `
                        <tr>
                            <td>
                                <strong>${charger.name}</strong>
                                <br>
                                <small class="text-muted">${charger.address}</small>
                            </td>
                            <td><span class="badge bg-secondary">${charger.chargerType}</span></td>
                            <td>${charger.availableSlots}/${charger.totalSlots}</td>
                            <td><span class="text-muted">-</span></td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="openEditModal('${charger._id}', '${charger.name}', '${(charger.description || '').replace(/'/g, "&apos;")}', ${charger.totalSlots})">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCharger('${charger._id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        document.getElementById('myChargersList').innerHTML = html;
    } catch (err) {
        console.error('Failed to load chargers:', err);
        document.getElementById('myChargersList').innerHTML = '<p class="text-warning">Could not load chargers. Please refresh the page.</p>';
    }
}

// Handle submission of the "Add Charger" form
async function handleAddCharger(e) {
    e.preventDefault();

    try {
        console.log('Adding new charger...');
        
        const data = {
            name: document.getElementById('chargerName').value,
            address: document.getElementById('chargerAddress').value,
            latitude: parseFloat(document.getElementById('chargerLatitude').value),
            longitude: parseFloat(document.getElementById('chargerLongitude').value),
            chargerType: document.getElementById('chargerType').value,
            totalSlots: parseInt(document.getElementById('chargerSlots').value),
            description: document.getElementById('chargerDescription').value
        };

        if (isNaN(data.latitude) || isNaN(data.longitude)) {
            console.warn('Invalid coordinates');
            alert('Please enter valid coordinates');
            return;
        }

        console.log(`New charger: ${data.name} at (${data.latitude}, ${data.longitude})`);
        
        const result = await API.createCharger(data);
        if (result.error || result.message) {
            throw new Error(result.message || result.error);
        }
        
        console.log(`Charger created: ${data.name}`);
        alert('Charging station added successfully!');
        e.target.reset();
        await loadOwnerStations();
        await loadStatistics();
    } catch (err) {
        console.error('Failed to add charger:', err);
        alert('Failed to add charger: ' + (err.message || 'Please try again'));
    }
}

function openEditModal(id, name, description, slots) {
    // Populate edit modal with current charger info
    console.log(`Editing charger: ${name}`);
    document.getElementById('editChargerId').value = id;
    document.getElementById('editChargerName').value = name;
    document.getElementById('editChargerDescription').value = description || '';
    document.getElementById('editChargerSlots').value = slots;
    editChargerModal.show();
}

async function handleSaveEdit() {
    try {
        const id = document.getElementById('editChargerId').value;
        const name = document.getElementById('editChargerName').value;
        console.log(`Saving changes to charger: ${name}`);
        
        const result = await API.updateCharger(id, {
            name: name,
            description: document.getElementById('editChargerDescription').value,
            totalSlots: parseInt(document.getElementById('editChargerSlots').value)
        });

        if (result.error || result.message) {
            throw new Error(result.message || result.error);
        }
        
        console.log(`Charger updated: ${name}`);
        alert('Station updated successfully!');
        editChargerModal.hide();
        await loadOwnerStations();
        await loadStatistics();
    } catch (err) {
        console.error('Failed to update charger:', err);
        alert('Failed to update: ' + (err.message || 'Please try again'));
    }
}

async function deleteCharger(id) {
    if (!confirm('Are you sure you want to delete this station?')) return;

    try {
        console.log(`Deleting charger: ${id}`);
        const result = await API.deleteCharger(id);
        if (!result.error) {
            console.log(`Charger deleted: ${id}`);
            alert('Station deleted');
            await loadOwnerStations();
            await loadStatistics();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (err) {
        console.error('Failed to delete charger:', err);
        alert('Failed to delete station: ' + (err.message || 'Please try again'));
    }
}

async function loadStatistics() {
    try {
        console.log('Loading owner statistics...');
        let totalBookings = 0;
        let totalAvailableSlots = 0;

        for (const charger of ownerStations) {
            totalAvailableSlots += charger.availableSlots;
            try {
                const bookings = await API.getChargerBookings(charger._id);
                if (Array.isArray(bookings)) {
                    totalBookings += bookings.filter(b => b.status !== 'cancelled').length;
                }
            } catch (err) {
                console.warn(`Could not load bookings for charger ${charger._id}:`, err);
            }
        }

        // Total slots in use = total slots - available slots across all chargers
        const totalSlotsInUse = ownerStations.reduce((sum, c) => sum + (c.totalSlots - c.availableSlots), 0);

        document.getElementById('totalStations').textContent = ownerStations.length;
        document.getElementById('totalBookings').textContent = totalBookings;
        document.getElementById('totalSlots').textContent = totalSlotsInUse;

        console.log(`Statistics: ${ownerStations.length} stations, ${totalBookings} bookings, ${totalSlotsInUse} slots in use`);

        await loadRecentBookings();
    } catch (err) {
        console.error('Failed to load statistics:', err);
        document.getElementById('totalStations').textContent = '0';
        document.getElementById('totalBookings').textContent = '0';
        document.getElementById('totalSlots').textContent = '0';
    }
}

async function loadRecentBookings() {
    try {
        console.log('Loading recent bookings...');
        let allBookings = [];

        for (const charger of ownerStations) {
            try {
                const bookings = await API.getChargerBookings(charger._id);
                if (Array.isArray(bookings)) {
                    allBookings = allBookings.concat(bookings.map(b => ({
                        ...b,
                        chargerName: charger.name
                    })));
                }
            } catch (err) {
                console.warn(`Could not load bookings for charger ${charger._id}:`, err);
            }
        }

        allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`Found ${allBookings.length} total bookings`);

        let html = '';
        if (allBookings.length === 0) {
            html = '<p class="text-muted">No bookings yet</p>';
        } else {
            allBookings.slice(0, 5).forEach(booking => {
                const startTime = new Date(booking.startTime).toLocaleString();
                const statusBadge = {
                    'active': 'bg-info',
                    'completed': 'bg-success',
                    'cancelled': 'bg-danger'
                }[booking.status] || 'bg-secondary';

            html += `
                <div class="mb-3 pb-3 border-bottom">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong>${booking.userId.name}</strong>
                            <br>
                            <small class="text-muted">${booking.chargerName}</small>
                        </div>
                        <span class="badge ${statusBadge}">${booking.status}</span>
                    </div>
                    <small class="text-muted">${startTime}</small>
                    <br>
                    <small>${booking.durationHours}h charging</small>
                </div>
            `;
        });
            }

        document.getElementById('recentBookings').innerHTML = html;
    } catch (err) {
        console.error('Failed to load recent bookings:', err);
        document.getElementById('recentBookings').innerHTML = '<p class="text-muted">No bookings yet</p>';
    }
}

// Load pending booking requests for owner
async function loadPendingRequests() {
    try {
        console.log('Loading pending booking requests...');
        const requests = await OwnerBookingManagement.loadPendingRequests();

        console.log(`Found ${requests.length} pending requests`);

        const html = OwnerBookingManagement.renderRequests(requests);
        document.getElementById('pendingRequests').innerHTML = html;
        
        // Update count badge
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        document.getElementById('pendingRequestCount').textContent = pendingCount;

    } catch (err) {
        console.error('Failed to load pending requests:', err);
        document.getElementById('pendingRequests').innerHTML = '<p class="text-danger">Failed to load requests</p>';
    }
}
