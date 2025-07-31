import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function PrivateRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('jwt');
  
  if (!token) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

export default PrivateRoute; 