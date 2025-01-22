import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const LocationTracker = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  const defaultCenter = { lat: 22.3072, lng: 73.1812 };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(pos);
        setError(null);
      },
      (err) => {
        setError(`Error: ${err.message}`);
        setIsTracking(false);
      }
    );

    navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(pos);
        setError(null);
      },
      (err) => {
        setError(`Error: ${err.message}`);
        setIsTracking(false);
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const icon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <div className="mx-auto px-4">
      <h1 className="text-2xl font-bold text-center my-4">Location Tracker</h1>

      <button
        onClick={isTracking ? stopTracking : startTracking}
        className={`px-4 py-2 rounded-md text-white ${
          isTracking ? "bg-red-500" : "bg-green-500"
        }`}
      >
        {isTracking ? "Stop Tracking" : "Start Tracking"}
      </button>

      {error && <div className="text-red-500 mt-2">{error}</div>}

      <div className="mt-4">
        <MapContainer
          center={currentPosition || defaultCenter}
          zoom={15}
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {currentPosition && (
            <Marker position={currentPosition} icon={icon}>
              <Popup>
                Your location:<br />
                Lat: {currentPosition.lat.toFixed(6)}<br />
                Lng: {currentPosition.lng.toFixed(6)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {currentPosition && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Current Location:</h2>
          <div>
            Latitude: {currentPosition.lat.toFixed(6)}<br />
            Longitude: {currentPosition.lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;