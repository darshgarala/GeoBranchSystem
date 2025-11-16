import React, { useState, useEffect, useRef } from 'react'
import './App.css';

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [allBranches, setAllBranches] = useState([]);
  const [nearestBranch, setNearestBranch] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const nearestBranchMarkerRef = useRef(null);
  const allBranchMarkersRef = useRef(null); 

  useEffect(() => {
    if (typeof window.L !== 'undefined') {
      setLeafletLoaded(true);
      return;
    }

    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhpmA9TwKBEZpUcSprPtfLhFwtplnSINSdaA=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
    
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.async = true;
      document.body.appendChild(script);
  
      script.onload = () => {
        setLeafletLoaded(true);
      };
  
      script.onerror = () => {
        setError('Failed to load Leaflet library.');
      };
    } else {
        const checkLeaflet = setInterval(() => {
            if (typeof window.L !== 'undefined') {
                setLeafletLoaded(true);
                clearInterval(checkLeaflet);
            }
        }, 100);
    }

  }, []); 

  useEffect(() => {
    if (!leafletLoaded) {
      return;
    }

    try {
      delete window.L.Icon.Default.prototype._getIconUrl;
      window.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    } catch (e) {
      console.error('Could not apply Leaflet icon fix:', e);
    }

    const map = window.L.map('map').setView([0,0], 10);
    mapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    detectUserLocation();
    
    fetchAllBranches();

    return () => {
      map.remove();
    };
  }, [leafletLoaded]);

  const createPopupContent = (branch) => {
    return `
      <div class="popup-content">
        <h3>${branch.name}</h3>
        <p>${branch.city}</p>
      </div>
    `;
  };

  const fetchAllBranches = async () => {
    const API_URL = 'http://localhost:3000/api/branch';
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      const data = await response.json();
      setAllBranches(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!mapRef.current || !allBranches.length) {
      return;
    }
    
    if (allBranchMarkersRef.current) {
        allBranchMarkersRef.current.clearLayers();
    }

    const markers = [];
    allBranches.forEach(branch => {
      const [lng, lat] = branch.location.coordinates;
      const marker = window.L.marker([lat, lng])
        .bindPopup(createPopupContent(branch));
      markers.push(marker);
    });

    allBranchMarkersRef.current = window.L.layerGroup(markers).addTo(mapRef.current);

  }, [allBranches]);

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);
        setError(null);
      },
      () => {
        setError('Unable to retrieve your location. Please enable location services.');
      }
    );
  };

  const handleFindNearest = async () => {
    if (!userLocation) {
      setError('Please allow location access first.');
      detectUserLocation(); 
      return;
    }

    setIsLoading(true);
    setError(null);
    setNearestBranch(null); 

    if (nearestBranchMarkerRef.current) {
      nearestBranchMarkerRef.current.remove();
      nearestBranchMarkerRef.current = null;
    }

    const { lat, lng } = userLocation;
    const API_URL = `http://localhost:3000/api/branch/nearest?lat=${lat}&lng=${lng}`;

    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Error: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        if (data.length > 0) {
          setNearestBranch(data[0]);
        } else {
          setError('No branches found within a 50km radius.');
          setNearestBranch(null);
        }
      } else if (data) {
        setNearestBranch(data);
      } else {
        setError('No branches found within a 50km radius.');
        setNearestBranch(null);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mapRef.current && userLocation) {
      const { lat, lng } = userLocation;

      const userIcon = new window.L.DivIcon({
        className: 'user-location-icon',
        html: `<div></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      userMarkerRef.current = window.L.marker([lat, lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Your Location</b>');

      mapRef.current.setView([lat, lng], 13);
    }
  }, [userLocation]);

  useEffect(() => {
    if (mapRef.current && nearestBranch && userLocation) {
      const [lng, lat] = nearestBranch.location.coordinates;

      if (nearestBranchMarkerRef.current) {
        nearestBranchMarkerRef.current.remove();
      }

      nearestBranchMarkerRef.current = window.L.marker([lat, lng])
        .addTo(mapRef.current)
        .bindPopup(createPopupContent(nearestBranch))
        .openPopup();

      const userLatLng = [userLocation.lat, userLocation.lng];
      const branchLatLng = [lat, lng];
      mapRef.current.fitBounds([userLatLng, branchLatLng], {
        padding: [50, 50]
      });
    }
  }, [nearestBranch, userLocation]);

  return (
    <>
      <div className="container">
        <div className="card">
          <div className="header">
            <h1>Branch Locator</h1>
            <p>Find the branch nearest to your current location.</p>
          </div>

          <div id="map" className="map-container">
            {!leafletLoaded && (
              <div className="map-loading">
                Loading Map...
              </div>
            )}
          </div>

          <div className="controls">
            <button
              onClick={handleFindNearest}
              disabled={isLoading || !userLocation || !leafletLoaded}
            >
              {isLoading ? 'Finding Branch...' : 'Find Nearest Branch'}
            </button>

            {!userLocation && leafletLoaded && (
              <p className="message-prompt">
                Please enable location access to find the nearest branch.
              </p>
            )}

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            {nearestBranch && (
              <div className="success-message">
                <h3>Nearest Branch Found:</h3>
                <p>
                  <span>{nearestBranch.name}</span>, {nearestBranch.city}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}