import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

const LocationTracker = () => {
  const [path, setPath] = useState([]);
  console.log('path: ', path);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [isBackgroundSupported, setIsBackgroundSupported] = useState(false);
  const [serviceWorkerReg, setServiceWorkerReg] = useState(null);

  const defaultCenter = { lat: 22.3072, lng: 73.1812 };

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          setServiceWorkerReg(registration);
          setDebugInfo(prev => prev + "\nService Worker registered");
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          setDebugInfo(prev => prev + "\nService Worker registration failed: " + error.message);
        });
    }
  }, []);

  // Check for background location support
  useEffect(() => {
    checkBackgroundSupport();
  }, []);

  const checkBackgroundSupport = async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setIsBackgroundSupported(true);
        setDebugInfo("Background location supported");
      } catch (err) {
        setIsBackgroundSupported(false);
        setDebugInfo("Background location not supported");
      }
    }
  };

  const isSignificantMove = (newLocation, lastLocation) => {
    if (!lastLocation) return true;
    const latDiff = Math.abs(newLocation.lat - lastLocation.lat);
    const lngDiff = Math.abs(newLocation.lng - lastLocation.lng);
    return latDiff > 0.00001 || lngDiff > 0.00001;
  };

  // Store location data in localStorage
  const saveLocationToStorage = (location) => {
    try {
      const storedPath = JSON.parse(localStorage.getItem('locationPath') || '[]');
      storedPath.push(location);
      localStorage.setItem('locationPath', JSON.stringify(storedPath));
      setDebugInfo(prev => prev + "\nLocation saved to storage");
    } catch (err) {
      console.error('Error saving to storage:', err);
    }
  };

  // Load locations from storage on start
  useEffect(() => {
    try {
      const storedPath = JSON.parse(localStorage.getItem('locationPath') || '[]');
      if (storedPath.length > 0) {
        setPath(storedPath);
        setDebugInfo("Loaded stored locations: " + storedPath.length);
      }
    } catch (err) {
      console.error('Error loading from storage:', err);
    }
  }, []);

  // Background tracking setup
  const setupBackgroundTracking = () => {
    // Request wake lock to prevent device sleep
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => {
          setDebugInfo(prev => prev + "\nWake lock acquired");
        })
        .catch(err => {
          setDebugInfo(prev => prev + "\nWake lock error: " + err.message);
        });
    }

    // Set up background sync if service worker is available
    if (serviceWorkerReg && 'sync' in serviceWorkerReg) {
      serviceWorkerReg.sync.register('locationSync')
        .then(() => {
          setDebugInfo(prev => prev + "\nBackground sync registered");
        })
        .catch(err => {
          setDebugInfo(prev => prev + "\nBackground sync error: " + err.message);
        });
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    // Request permission for background location
    if ('permissions' in navigator) {
      try {
        await navigator.permissions.query({ name: 'geolocation' });
      } catch (err) {
        setError("Background location permission denied");
        return;
      }
    }

    setIsTracking(true);
    setupBackgroundTracking();
    
    // Initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy
        };
        setPath([initialLocation]);
        saveLocationToStorage(initialLocation);
      },
      (err) => setError(`Initial position error: ${err.message}`),
      { enableHighAccuracy: true }
    );
    
    // Continuous tracking
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy
        };
        
        setPath((currentPath) => {
          const lastLocation = currentPath[currentPath.length - 1];
          if (!lastLocation || isSignificantMove(newLocation, lastLocation)) {
            saveLocationToStorage(newLocation);
            return [...currentPath, newLocation];
          }
          return currentPath;
        });
      },
      (err) => {
        setError(`Location error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
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
    
    // Release wake lock if acquired
    if ('wakeLock' in navigator) {
      navigator.wakeLock.release()
        .then(() => setDebugInfo(prev => prev + "\nWake lock released"));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        stopTracking();
      }
    };
  }, [watchId]);

  const center = useMemo(
    () => (path.length > 0 ? path[path.length - 1] : defaultCenter),
    [path]
  );

  return (
    <div className="mx-auto px-4">
      <h1 className="text-2xl font-bold text-center my-4">Background Location Tracker</h1>

      {!isBackgroundSupported && (
        <div className="text-center p-4 text-yellow-500 mb-4">
          Warning: Background location tracking may not be fully supported on this device
        </div>
      )}

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
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <pre className="text-xs whitespace-pre-wrap">
          {debugInfo}
        </pre>
      </div>
    </div>
  );
};

// Helper components (AutoCenter, PolylineDecorator, getCustomMarkerIcon) remain the same
const AutoCenter = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position);
  }, [map, position]);

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