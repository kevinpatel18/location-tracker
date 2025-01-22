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
  const [debugInfo, setDebugInfo] = useState(""); // Add debug info state

  const defaultCenter = { lat: 22.3072, lng: 73.1812 };

  // Simplified distance check
  const isSignificantMove = (newLocation, lastLocation) => {
    if (!lastLocation) return true;
    
    // Simplified distance check using coordinate differences
    const latDiff = Math.abs(newLocation.lat - lastLocation.lat);
    const lngDiff = Math.abs(newLocation.lng - lastLocation.lng);
    
    // Return true if movement is more than 0.00001 degrees (roughly 1 meter)
    return latDiff > 0.00001 || lngDiff > 0.00001;
  };

  // Function to handle starting location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setDebugInfo("Starting tracking..."); // Debug info
    
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy
        };
        setPath([initialLocation]);
        setDebugInfo(prev => prev + "\nGot initial position: " + JSON.stringify(initialLocation));
      },
      (err) => {
        setError(`Initial position error: ${err.message}`);
        setDebugInfo(prev => prev + "\nInitial position error: " + err.message);
      }
    );
    
    // Watch position and update path
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy
        };
        
        setDebugInfo(prev => prev + "\nNew location received: " + JSON.stringify(newLocation));
        
        setPath((currentPath) => {
          const lastLocation = currentPath[currentPath.length - 1];
          
          // Always add the first point or if it's a significant move
          if (!lastLocation || isSignificantMove(newLocation, lastLocation)) {
            setDebugInfo(prev => prev + "\nAdding new point to path");
            return [...currentPath, newLocation];
          }
          setDebugInfo(prev => prev + "\nIgnoring duplicate location");
          return currentPath;
        });
        
        setError(null);
      },
      (err) => {
        console.error("Error getting location:", err);
        setError(`Failed to get location: ${err.message}`);
        setDebugInfo(prev => prev + "\nLocation error: " + err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased timeout
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setDebugInfo(prev => prev + "\nTracking stopped");
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const center = useMemo(
    () => (path.length > 0 ? path[path.length - 1] : defaultCenter),
    [path]
  );

  return (
    <div className="mx-auto px-4">
      <h1 className="text-2xl font-bold text-center my-4">Location Tracker</h1>

      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`px-4 py-2 rounded-md text-white ${
            isTracking ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
          }`}
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
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {path.length > 1 && <PolylineDecorator positions={path} />}

        {path.map((pos, index) => (
          <Marker 
            key={`${pos.lat}-${pos.lng}-${index}`} 
            position={[pos.lat, pos.lng]} 
            icon={getCustomMarkerIcon()}
          >
            <Popup>
              Location {index + 1}<br/>
              Lat: {pos.lat.toFixed(6)}<br/>
              Lng: {pos.lng.toFixed(6)}<br/>
              Accuracy: {pos.accuracy?.toFixed(2)}m<br/>
              Time: {new Date(pos.timestamp).toLocaleTimeString()}
            </Popup>
          </Marker>
        ))}

        {path.length > 0 && <AutoCenter position={path[path.length - 1]} />}
      </MapContainer>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Tracked Coordinates:</h2>
        <div className="max-h-40 overflow-y-auto">
          {path.map((pos, index) => (
            <div key={index} className="text-sm">
              Point {index + 1}: Lat: {pos.lat.toFixed(6)}, Lng: {pos.lng.toFixed(6)}, 
              Accuracy: {pos.accuracy?.toFixed(2)}m, 
              Time: {new Date(pos.timestamp).toLocaleTimeString()}
            </div>
          ))}
        </div>
      </div>

      {/* Debug Information */}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <pre className="text-xs whitespace-pre-wrap">
          {debugInfo}
        </pre>
      </div>
    </div>
  );
};

// AutoCenter component to keep the map centered on the latest position
const AutoCenter = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position);
  }, [map, position]);

  return null;
};

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