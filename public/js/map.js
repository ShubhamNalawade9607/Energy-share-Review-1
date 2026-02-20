// ============================================
// MAP INITIALIZATION & CHARGER MANAGEMENT
// ============================================
// Demo: Interactive map showing EV charging stations
// Users can book chargers directly from markers or sidebar list

let map;
let chargers = [];
let markers = [];
let selectedCharger = null;
let chargerModal;

// Get charger status based on availability
// Returns: 'available' (green), 'limited' (yellow), or 'busy' (red)
function getChargerStatus(charger) {
    if (charger.availableSlots === 0) {
        return 'busy';           // 🔴 No slots
    } else if (charger.availableSlots < Math.ceil(charger.totalSlots * 0.3)) {
        return 'limited';        // 🟡 Less than 30% slots
    } else {
        return 'available';      // 🟢 Good availability
    }
}

// Get marker color based on status
// Maps status to hex colors for visual clarity
function getMarkerColor(status) {
    switch(status) {
        case 'available': return '#2ecc71'; // Green
        case 'limited': return '#f39c12';   // Yellow/Orange
        case 'busy': return '#e74c3c';      // Red
        default: return '#95a5a6';          // Gray
    }
}

// Create custom SVG marker icon
// Uses base64 encoding for crisp rendering at any zoom level
function createMarkerIcon(status) {
    const color = getMarkerColor(status);
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 41" width="32" height="41">
            <path d="M16 1C8.3 1 2 7.3 2 15c0 7 8 21 14 27.6 6-6.6 14-20.6 14-27.6 0-7.7-6.3-14-13.9-14z" 
                  fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="16" cy="15" r="7" fill="white" opacity="0.3"/>
        </svg>
    `;
    
    return L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
        iconSize: [32, 41],
        iconAnchor: [16, 41],
        popupAnchor: [0, -41],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [13, 41]
    });
}

// Initialize map
// Sets up Leaflet map centered on London with OpenStreetMap tiles
function initMap() {
    console.log('🗺️ initMap() called');
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return false;
    }
    
    // Check if map already exists (from inline initialization)
    if (window.testMap && window.testMap._container) {
        console.log('✅ Reusing existing inline map');
        map = window.testMap;
        return true;
    }
    
    try {
        console.log(`📐 Creating new map (container: ${mapContainer.offsetWidth}x${mapContainer.offsetHeight}px)`);
        
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            throw new Error('Leaflet library (L) is not available');
        }
        
        // Create map
        map = L.map('map', {
            preferCanvas: false,
            dragging: true,
            touchZoom: true,
            zoomControl: true
        }).setView([51.505, -0.09], 13);
        console.log('✅ Map instance created');
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            crossOrigin: true
        }).addTo(map);
        console.log('✅ Tile layer added');

        // Add zoom control
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Setup charger modal if present
        const modalEl = document.getElementById('chargerModal');
        if (modalEl) {
            chargerModal = new bootstrap.Modal(modalEl);
        }

        // Force multiple size recalculations
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (map && map.invalidateSize) {
                    map.invalidateSize(false);
                    console.log(`🔄 Size invalidation ${i + 1}`);
                }
            }, 100 + (i * 100));
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            if (map && map.invalidateSize) {
                map.invalidateSize(false);
            }
        });

        console.log('✅ Map initialized successfully!');
        return true;
    } catch (err) {
        console.error('❌ Failed to initialize map:', err.message);
        
        // Show error in map container
        mapContainer.style.display = 'flex';
        mapContainer.style.alignItems = 'center';
        mapContainer.style.justifyContent = 'center';
        mapContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; background: white; border-radius: 4px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <div><strong>Map Error</strong></div>
                <div style="font-size: 0.9rem; margin-top: 10px; color: #999;">
                    ${err.message}
                </div>
            </div>
        `;
        
        return false;
    }
}

// Load chargers from API
// Falls back to demo data if API fails
async function loadChargers() {
    console.log('📍 === LOADING CHARGERS ===');
    
    try {
        console.log('   - Calling API.getAllChargers()...');
        const data = await API.getAllChargers();
        console.log('   - API Response received:', data);
        
        if (!data) {
            console.error('   ❌ API returned null/undefined');
            chargers = [];
        } else if (!Array.isArray(data)) {
            console.warn('   ⚠️ API response is not an array:', typeof data);
            // Try to use it as a fallback or use empty array
            if (data.error || data.offline) {
                console.warn('   📊 API error detected - should have returned demo data from API client');
                chargers = [];
            } else {
                console.warn('   ⚠️ Unexpected response format');
                chargers = [];
            }
        } else {
            chargers = data;
            console.log(`   ✅ Loaded ${chargers.length} chargers`);
            chargers.forEach(c => console.log(`      - ${c.name} @ ${c.latitude}, ${c.longitude}`));
        }
        
        console.log('   - Calling renderChargersOnMap()...');
        renderChargersOnMap();
        
        console.log('   - Calling renderChargersList()...');
        renderChargersList();
        
        console.log('✅ === CHARGERS LOADING COMPLETE ===');
    } catch (err) {
        console.error('❌ Error loading chargers:', err.message);
        console.error('   Stack:', err.stack);
        chargers = [];
        // Still render UI even if loading fails
        renderChargersOnMap();
        renderChargersList();
    }
}


// Render chargers on map
function renderChargersOnMap() {
    console.log('🗺️ === RENDER CHARGERS ON MAP ===');
    
    if (!map) {
        console.error('   ❌ CRITICAL: map is not initialized!');
        console.error('   - map =', map);
        return false;
    }
    console.log('   ✅ Map object exists');
    
    console.log(`   - ${chargers.length} chargers to render`);
    
    // Clear existing markers
    console.log('   - Removing old markers...');
    markers.forEach(m => {
        try {
            map.removeLayer(m);
        } catch (e) {
            console.warn('   ⚠️ Problem removing marker:', e.message);
        }
    });
    markers = [];
    console.log('   ✅ Old markers cleared');

    // Add new markers
    console.log('   - Adding new markers...');
    chargers.forEach((charger, idx) => {
        try {
            const status = getChargerStatus(charger);
            const icon = createMarkerIcon(status);
            const popupContent = createMarkerPopup(charger, status);
            
            const marker = L.marker([charger.latitude, charger.longitude], { icon })
                .addTo(map)
                .bindPopup(popupContent, { 
                    maxWidth: 300,
                    className: 'charger-popup'
                })
                .on('click', () => {
                    selectedCharger = charger;
                });
            
            markers.push(marker);
            console.log(`      ✅ [${idx+1}] Added ${charger.name} @ ${charger.latitude}, ${charger.longitude}`);
        } catch (e) {
            console.error(`      ❌ Error adding marker for ${charger.name}:`, e.message);
        }
    });

    console.log(`   ✅ ${markers.length} markers added to map`);

    // Fit bounds to show all markers
    if (markers.length > 0) {
        try {
            console.log('   - Calculating bounds for all markers...');
            const group = new L.featureGroup(markers);
            const bounds = group.getBounds();
            console.log(`   ✅ Bounds calculated - fitting map..`);
            map.fitBounds(bounds.pad(0.1), { maxZoom: 15 });
            console.log('   ✅ Map fitted to bounds');
        } catch (e) {
            console.warn('   ⚠️ Error fitting bounds:', e.message);
            // Fallback: center on London
            map.setView([51.505, -0.09], 13);
        }
    } else {
        console.warn('   ⚠️ No chargers to display - centering on London');
        if (map) {
            map.setView([51.505, -0.09], 13);
        }
    }
    
    console.log('✅ === RENDER COMPLETE ===');
    return true;
}

// Create popup HTML for marker
function createMarkerPopup(charger, status) {
    const statusBadgeClass = {
        'available': 'bg-success',
        'limited': 'bg-warning',
        'busy': 'bg-danger'
    }[status];

    const statusLabel = {
        'available': '✅ Available',
        'limited': '⚠️ Limited',
        'busy': '❌ Busy'
    }[status];

    const user = Auth.getCurrentUser();
    const isUser = user && user.role === 'user';

    let bookingButton = '';
    if (isUser && charger.availableSlots > 0) {
        bookingButton = `
            <button class="btn btn-sm btn-success w-100 mt-2" 
                    onclick="selectAndShowBooking('${charger._id}')"
                    style="font-size: 0.85rem;">
                📅 Book Slot
            </button>
        `;
    } else if (isUser && charger.availableSlots === 0) {
        bookingButton = `<p class="alert alert-danger mb-0 mt-2 p-2">❌ No available slots</p>`;
    }

    return `
        <div class="charger-popup-content" style="font-size: 0.9rem;">
            <div style="min-width: 240px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px;">
                    <strong style="font-size: 1rem;">${escapeHtml(charger.name)}</strong>
                    <span class="badge ${statusBadgeClass}" style="white-space: nowrap; font-size: 0.75rem;">${statusLabel}</span>
                </div>
                
                <div style="border-top: 1px solid #e9ecef; padding-top: 8px;">
                    ${charger.address ? `<div style="margin-bottom: 6px;"><small style="color: #666;">📍 ${escapeHtml(charger.address)}</small></div>` : ''}
                    <div style="margin-bottom: 6px;"><small style="color: #666;">⚡ ${charger.chargerType}</small></div>
                    <div style="margin-bottom: 8px;"><small style="color: #666;">Slots: <strong>${charger.availableSlots}</strong> / ${charger.totalSlots}</small></div>
                    ${charger.rating ? `<div style="margin-bottom: 8px;"><small style="color: #666;">⭐ ${charger.rating.toFixed(1)} / 5.0</small></div>` : ''}
                    ${charger.description ? `<div style="margin-bottom: 8px; color: #666;"><small>${escapeHtml(charger.description)}</small></div>` : ''}
                </div>
                
                ${bookingButton}
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render chargers in sidebar list
function renderChargersList() {
    const container = document.getElementById('chargersList');
    if (!container) return;

    let html = '';
    chargers.slice(0, 10).forEach(charger => {
        const status = getChargerStatus(charger);
        const statusClass = {
            'available': 'border-success',
            'limited': 'border-warning',
            'busy': 'border-danger'
        }[status];
        
        const statusText = {
            'available': '✅ Available',
            'limited': '⚠️ Limited',
            'busy': '❌ Busy'
        }[status];
        
        html += `
            <div class="card mb-2 ${statusClass} border-2 cursor-pointer" 
                 onclick="showChargerDetail(${JSON.stringify(charger).replace(/"/g, '&quot;')})">
                <div class="card-body p-3">
                    <h6 class="mb-1">${escapeHtml(charger.name)}</h6>
                    <small class="text-muted d-block">📍 ${escapeHtml(charger.address || 'No address')}</small>
                    <small class="text-muted d-block">⚡ ${charger.chargerType}</small>
                    <div class="mt-2 d-flex justify-content-between">
                        <small><strong>${charger.availableSlots}/${charger.totalSlots}</strong> slots</small>
                        <span class="badge ${statusClass.replace('border-', 'bg-')}">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p class="text-muted">No chargers available</p>';
}

// Show charger details in modal
function showChargerDetail(charger) {
    selectedCharger = charger;
    const status = getChargerStatus(charger);
    
    document.getElementById('chargerModalTitle').textContent = charger.name;
    
    const statusBadgeClass = {
        'available': 'bg-success',
        'limited': 'bg-warning',
        'busy': 'bg-danger'
    }[status];

    const statusLabel = {
        'available': '✅ Available',
        'limited': '⚠️ Limited',
        'busy': '❌ Busy'
    }[status];

    let html = `
        <div class="row mb-3">
            <div class="col-6">
                <small class="text-muted d-block">Type</small>
                <strong>${charger.chargerType}</strong>
            </div>
            <div class="col-6">
                <small class="text-muted d-block">Available Slots</small>
                <strong>${charger.availableSlots}/${charger.totalSlots}</strong>
            </div>
        </div>
        <div class="mb-3">
            <span class="badge ${statusBadgeClass}">${statusLabel}</span>
        </div>
        <hr>
        <p><strong>📍 Address:</strong> ${escapeHtml(charger.address || 'N/A')}</p>
        <p><strong>⭐ Rating:</strong> ${charger.rating ? charger.rating.toFixed(1) : 'N/A'} / 5.0</p>
        ${charger.description ? `<p><strong>Description:</strong> ${escapeHtml(charger.description)}</p>` : ''}
    `;

    document.getElementById('chargerModalBody').innerHTML = html;
    
    const bookBtn = document.getElementById('bookChargerBtn');
    bookBtn.disabled = charger.availableSlots === 0;
    bookBtn.textContent = charger.availableSlots > 0 ? '✅ Book Now' : '❌ No Slots Available';
    bookBtn.onclick = () => handleBooking();

    if (chargerModal) {
        chargerModal.show();
    }
}

// Select charger from map popup and show booking
function selectAndShowBooking(chargerId) {
    const charger = chargers.find(c => c._id === chargerId);
    if (charger) {
        showChargerDetail(charger);
    }
}

// Handle booking from modal
async function handleBooking() {
    if (!selectedCharger) return;

    const bookDurationModal = new bootstrap.Modal(document.getElementById('bookDurationModal'));
    bookDurationModal.show();
}

// Confirm booking with selected duration (in minutes)
// PROTOTYPE MODE: Shows alert instead of actual booking
async function confirmBooking(minutes) {
    if (!selectedCharger) return;

    const bookDurationModal = bootstrap.Modal.getInstance(document.getElementById('bookDurationModal'));
    if (bookDurationModal) bookDurationModal.hide();

    // PROTOTYPE: Show placeholder message instead of processing booking
    alert('🚀 Booking module under development – will be demonstrated in next review.\n\nThis is a Phase 1 Architecture Demo. Full booking and approval workflow coming soon.');
    if (chargerModal) chargerModal.hide();
}

// Load leaderboard
async function loadLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    const data = await API.getLeaderboard();
    const leaders = Array.isArray(data) ? data : [];
    
    let html = '';
    if (leaders.length === 0) {
        html = '<p class="text-muted">No users yet</p>';
    } else {
        leaders.forEach((user, idx) => {
            const medalIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
            html += `
                <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <div>
                        <span class="fw-bold">${medalIcon} ${escapeHtml(user.name)}</span>
                        <br>
                        <small class="text-muted">${user.totalChargingTime} hrs charged</small>
                    </div>
                    <span class="badge bg-success">🌱 ${user.greenScore}</span>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}
