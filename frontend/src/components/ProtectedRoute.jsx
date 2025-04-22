import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

function ProtectedRoute({ children, requiredRole, allowGuest = false }) {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    redirectPath: null
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthState({
          loading: false,
          isAuthenticated: allowGuest,
          redirectPath: allowGuest ? null : '/login'
        });
        return;
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        
        if (res.data.role === requiredRole) {
          setAuthState({ loading: false, isAuthenticated: true, redirectPath: null });
        } else {
          // Redirect to appropriate dashboard based on actual role
          const redirectPath = res.data.role === 'admin' ? '/admin' : '/user';
          setAuthState({ loading: false, isAuthenticated: false, redirectPath });
        }
      } catch (error) {
        console.error('ProtectedRoute error:', error.response?.data);
        localStorage.removeItem('token');
        setAuthState({ loading: false, isAuthenticated: false, redirectPath: '/login' });
      }
    };
    
    checkAuth();
  }, [requiredRole, allowGuest]);

  if (authState.loading) return <div>Loading...</div>;
  
  if (authState.redirectPath) {
    return <Navigate to={authState.redirectPath} replace />;
  }

  return authState.isAuthenticated ? children : null;
}

export default ProtectedRoute;