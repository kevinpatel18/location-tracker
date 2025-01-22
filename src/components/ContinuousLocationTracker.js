import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

const LocationTracker = () => {
  const [path, setPath] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  const defaultCenter = { lat: 22.3072, lng: 73.1812 };

  // Function to handle starting location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    
    // Watch position and update path
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setPath((currentPath) => [...currentPath, newLocation]);
        setError(null);
      },
      (err) => {
        console.error("Error getting location:", err);
        setError(`Failed to get location: ${err.message}`);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  };

  // Function to handle stopping location tracking
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const center = useMemo(
    () => (path.length > 0 ? path[0] : defaultCenter),
    [path]
  );

  return (
    <div className="mx-auto px-4">
      <h1 className="text-2xl font-bold text-center my-4">Location Tracker</h1>

      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={isTracking ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
        >
          {isTracking ? "Stop Tracking" : "Start Tracking"}
        </button>
      </div>

      {error && (
        <div className="text-center p-4 text-red-500 mb-4">{error}</div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {path.length > 1 && <PolylineDecorator positions={path} />}

        {path.map((pos, index) => (
          <Marker key={index} position={pos} icon={getCustomMarkerIcon()}>
            <Popup>Location {index + 1}</Popup>
          </Marker>
        ))}

        {/* Add AutoCenter component to keep the map centered on the latest position */}
        {path.length > 0 && <AutoCenter position={path[path.length - 1]} />}
      </MapContainer>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Tracked Coordinates:</h2>
        <div className="max-h-40 overflow-y-auto">
          {path.map((pos, index) => (
            <div key={index} className="text-sm">
              Point {index + 1}: Lat: {pos.lat.toFixed(4)}, Lng: {pos.lng.toFixed(4)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Component to automatically center the map on the latest position
const AutoCenter = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position);
  }, [map, position]);

  return null;
};

// PolylineDecorator component (unchanged)
const PolylineDecorator = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      const polyline = L.polyline(positions, { color: "#0000ff", weight: 4 }).addTo(map);

      L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: "5%",
            repeat: "10%",
            symbol: L.Symbol.dash({ pixelSize: 10, pathOptions: { color: "#ff0000", weight: 2 } }),
          },
        ],
      }).addTo(map);

      return () => {
        map.removeLayer(polyline);
      };
    }
  }, [positions, map]);

  return null;
};

// getCustomMarkerIcon function (unchanged)
const getCustomMarkerIcon = () => {
  return new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

export default LocationTracker;