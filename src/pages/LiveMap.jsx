import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Redundant if in index.css but safe

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle user click on map to set location
const LocationMarker = ({ setPosition, position }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position ? (
        <Marker position={position}>
            <Popup>You are here!</Popup>
        </Marker>
    ) : null;
};

const LiveMap = () => {
    const { user, updateProfile } = useAuth();
    const [friends, setFriends] = useState([]);
    const [myPosition, setMyPosition] = useState(null);

    // Custom Icon generator for friends
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
        if (user.location_lat && user.location_lng) {
            setMyPosition({ lat: user.location_lat, lng: user.location_lng });
        }
    }, [user]);

    useEffect(() => {
        // Save my position when it changes
        if (myPosition) {
            updateProfile({
                location_lat: myPosition.lat,
                location_lng: myPosition.lng
            });
        }
    }, [myPosition]);

    useEffect(() => {
        const fetchFriends = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .not('location_lat', 'is', null); // Only friends with location

            if (data) setFriends(data);
        };

        fetchFriends();

        const channel = supabase
            .channel('public:map_profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                if (payload.new.id === user.id) return;
                setFriends((prev) => {
                    const exists = prev.find(f => f.id === payload.new.id);
                    if (exists) {
                        return prev.map(f => f.id === payload.new.id ? payload.new : f);
                    } else if (payload.new.location_lat) {
                        return [...prev, payload.new];
                    }
                    return prev;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Default center (New Yorkish) if no location
    const defaultCenter = [40.7128, -74.0060];
    const center = myPosition || defaultCenter;

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="bg-slate-900 z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Friends Markers */}
                {friends.map(friend => (
                    (friend.location_lat && friend.location_lng) && (
                        <Marker
                            key={friend.id}
                            position={[friend.location_lat, friend.location_lng]}
                            icon={createCustomIcon(friend.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${friend.username}`)}
                        >
                            <Popup className="custom-popup">
                                <div className="text-center">
                                    <strong className="block text-slate-900">{friend.username}</strong>
                                    <span className="text-xs text-slate-500">{friend.status}</span>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* My Marker Control */}
                <LocationMarker setPosition={setMyPosition} position={myPosition} />
            </MapContainer>

            {!myPosition && (
                <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 text-white p-4 rounded-xl border border-slate-700 shadow-xl max-w-xs backdrop-blur">
                    <h3 className="font-bold mb-1">Set your location</h3>
                    <p className="text-sm text-slate-400">Click anywhere on the map to let friends know where you are!</p>
                </div>
            )}
        </div>
    );
};

export default LiveMap;
