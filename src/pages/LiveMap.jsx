import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, EyeOff, Coffee, Utensils } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// POI Icons
const cafeIcon = L.divIcon({
    html: '<div class="bg-amber-700 text-white p-1 rounded-full border border-white shadow flex items-center justify-center w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg></div>',
    className: 'bg-transparent',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const foodIcon = L.divIcon({
    html: '<div class="bg-red-600 text-white p-1 rounded-full border border-white shadow flex items-center justify-center w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>',
    className: 'bg-transparent',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const LocationMarker = ({ setPosition, position, isGhostMode }) => {
    const map = useMapEvents({
        click(e) {
            if (isGhostMode) {
                alert("You are in Ghost Mode! Disable it in Settings (or toggle eye icon) to share location.");
                return;
            }
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position && !isGhostMode ? (
        <Marker position={position}>
            <Popup>You are here!</Popup>
        </Marker>
    ) : null;
};

// Component to fetch POIs
const PoiLayer = ({ showPois }) => {
    const map = useMap();
    const [pois, setPois] = useState([]);

    useEffect(() => {
        if (!showPois) {
            setPois([]);
            return;
        }

        const fetchPois = async () => {
            const bounds = map.getBounds();
            const query = `
        [out:json];
        (
          node["amenity"~"cafe|restaurant"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        );
        out; // 50 limit for demo to avoid heavy load
      `;

            try {
                const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
                const data = await response.json();
                setPois(data.elements || []);
            } catch (err) {
                console.error("Overpass API Error", err);
            }
        };

        // Fetch initially
        fetchPois();

        // Re-fetch on move end
        map.on('moveend', fetchPois);

        return () => {
            map.off('moveend', fetchPois);
        };
    }, [map, showPois]);

    return (
        <>
            {pois.map(poi => (
                <Marker
                    key={poi.id}
                    position={[poi.lat, poi.lon]}
                    icon={poi.tags.amenity === 'cafe' ? cafeIcon : foodIcon}
                >
                    <Popup>
                        <strong>{poi.tags.name || 'Unknown Place'}</strong><br />
                        <span className="capitalize text-xs text-slate-500">{poi.tags.amenity}</span>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};

// Helper to auto-center
const RecenterMap = ({ center }) => {
    const map = useMap();
    const [hasCentered, setHasCentered] = useState(false);

    useEffect(() => {
        if (center && !hasCentered) {
            map.flyTo(center, 15, { animate: true });
            setHasCentered(true);
        }
    }, [center, map, hasCentered]);

    return null;
};

const LiveMap = () => {
    const { user, updateProfile } = useAuth();
    const [friends, setFriends] = useState([]);
    const [myPosition, setMyPosition] = useState(null);
    const [isGhostMode, setIsGhostMode] = useState(user.is_visible === false);
    const [showPois, setShowPois] = useState(true); // Default to TRUE as requested

    const createCustomIcon = (avatarUrl) => {
        return L.divIcon({
            html: `
        <div class="relative">
          <img src="${avatarUrl}" class="w-10 h-10 rounded-full border-2 border-white shadow-lg object-cover bg-slate-800" />
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
        </div>
      `,
            className: 'bg-transparent',
            iconSize: [40, 48],
            iconAnchor: [20, 48],
            popupAnchor: [0, -48]
        });
    };

    useEffect(() => {
        // Restore saved position if available
        if (user.location_lat && user.location_lng) {
            setMyPosition({ lat: user.location_lat, lng: user.location_lng });
        }

        // Auto-locate on startup if no position or just to be helpful
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const newPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setMyPosition(newPos);
                // Also update DB immediately so they appear online
                updateProfile({
                    location_lat: newPos.lat,
                    location_lng: newPos.lng
                });
            }, (error) => {
                console.warn("Geolocation error:", error);
            });
        }

        setIsGhostMode(user.is_visible === false);
    }, [user]);

    useEffect(() => {
        // Save my position only if NOT ghost mode
        if (myPosition && !isGhostMode) {
            updateProfile({
                location_lat: myPosition.lat,
                location_lng: myPosition.lng
            });
        }
    }, [myPosition, isGhostMode]);

    const toggleGhostMode = async () => {
        const newState = !isGhostMode;
        setIsGhostMode(newState);
        await updateProfile({ is_visible: !newState }); // is_visible is opposite of isGhostMode
    };

    useEffect(() => {
        const fetchFriends = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .not('location_lat', 'is', null); // Only show people with location

            if (data) setFriends(data);
        };

        fetchFriends();

        const channel = supabase
            .channel('public:profiles_map')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                // If it's me, ignore
                if (payload.new && payload.new.id === user.id) return;

                // Simple strategy: Just refetch everyone to ensure state is consistent
                // This avoids complex merge logic errors
                fetchFriends();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    const defaultCenter = [40.7128, -74.0060];
    const center = myPosition ? [myPosition.lat, myPosition.lng] : defaultCenter;

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="bg-slate-900 z-0 text-slate-900"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Force Auto-Center */}
                {myPosition && <RecenterMap center={[myPosition.lat, myPosition.lng]} />}

                {/* Friends Markers */}
                {friends.map(friend => (
                    (friend.location_lat && friend.location_lng) && (
                        <Marker
                            key={friend.id}
                            position={[friend.location_lat, friend.location_lng]}
                            icon={createCustomIcon(friend.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${friend.username}`)}
                        >
                            <Popup className="custom-popup">
                                <div className="text-center min-w-[100px]">
                                    <strong className="block text-slate-900 text-lg">{friend.username}</strong>
                                    <div className="text-xs text-slate-500 mb-1">
                                        {friend.location_text || 'Nearby'}
                                    </div>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800 border">
                                        {friend.status_message || friend.status}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                <LocationMarker setPosition={setMyPosition} position={myPosition} isGhostMode={isGhostMode} />
                <PoiLayer showPois={showPois} />
            </MapContainer>

            {/* Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button
                    onClick={toggleGhostMode}
                    className={`p-3 rounded-full shadow-xl border-2 transition-all ${isGhostMode
                        ? 'bg-slate-800 text-slate-400 border-slate-600'
                        : 'bg-violet-600 text-white border-white'
                        }`}
                    title={isGhostMode ? "You are invisible" : "You are visible"}
                >
                    {isGhostMode ? <EyeOff /> : <Eye />}
                </button>

                <button
                    onClick={() => setShowPois(!showPois)}
                    className={`p-3 rounded-full shadow-xl border-2 transition-all ${showPois
                        ? 'bg-amber-600 text-white border-white'
                        : 'bg-slate-800 text-amber-400 border-slate-600'
                        }`}
                    title="Show Places (Cafes/Restaurants)"
                >
                    {showPois ? <Coffee /> : <Utensils />}
                </button>
            </div>

            {!myPosition && (
                <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 text-white p-4 rounded-xl border border-slate-700 shadow-xl max-w-xs backdrop-blur">
                    <h3 className="font-bold mb-1">Set your location</h3>
                    <p className="text-sm text-slate-400">Click map to pin. Enable visibility to share.</p>
                </div>
            )}
        </div>
    );
};

export default LiveMap;
