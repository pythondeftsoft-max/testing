import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shouldShow404, setShouldShow404] = useState(false);

  useEffect(() => {
    // Check if the path contains encoded query string characters
    if (location.pathname.includes('%3F') || location.pathname.includes('%3D')) {
      // Decode the pathname and redirect
      const decodedPath = decodeURIComponent(location.pathname);
      console.log('Redirecting encoded URL:', location.pathname, '→', decodedPath);
      navigate(decodedPath + location.search, { replace: true });
    } else {
      setShouldShow404(true);
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, location.search, navigate]);

  if (!shouldShow404) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
