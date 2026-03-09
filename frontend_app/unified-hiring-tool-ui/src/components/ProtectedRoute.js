import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole, matchUserId = false }) => {
  const location = useLocation();
  const params = useParams();
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (matchUserId && user.user_id !== params.userId) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
