import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import AdminLayout from './admin/components/AdminLayout.jsx';
import Dashboard from './admin/pages/Dashboard.jsx';
import AddCategory from './admin/pages/AddCategory.jsx';
import AddMusic from './admin/pages/AddMusic.jsx';
import ViewUsers from './admin/pages/ViewUsers.jsx';
import ViewCategories from './admin/pages/ViewCategories.jsx';
import ViewMusic from './admin/pages/ViewMusic.jsx';
import UserLayout from './user/components/UserLayout.jsx';
import UserDashboard from './user/pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      if (
        location.pathname === '/login' ||
        location.pathname === '/signup' ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/user') ||
        location.pathname === '/'
      ) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setUserRole(null);
        return;
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log('App auth check:', res.data);
        setUserRole(res.data.role);
        if (res.data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      } catch (error) {
        console.log('Not authenticated', error.response?.data);
        setUserRole(null);
      }
    };
    checkAuth();
  }, [navigate, location.pathname]);

  return (
    <div className="container">
      <Routes>
        <Route path="/login" element={<Login setUserRole={setUserRole} />} />
        <Route path="/signup" element={<Signup setUserRole={setUserRole} />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="manage-categories" element={<Dashboard />} />
          <Route path="manage-music" element={<Dashboard />} />
          <Route path="manage-users" element={<ViewUsers />} />
          <Route path="add-category" element={<AddCategory />} />
          <Route path="add-music" element={<AddMusic />} />
          <Route path="view-categories" element={<ViewCategories />} />
          <Route path="view-music" element={<ViewMusic />} />
          <Route path="view-users" element={<ViewUsers />} />
        </Route>
        <Route
          path="/user/*"
          element={
            <ProtectedRoute requiredRole="user" allowGuest={true}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboard />} />
        </Route>
        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="user" allowGuest={true}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboard />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;