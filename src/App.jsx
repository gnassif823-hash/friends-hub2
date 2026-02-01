import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import GroupLounge from './pages/GroupLounge';
import CallCenter from './pages/CallCenter';
import Events from './pages/Events';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ProfileSetup from './pages/ProfileSetup';
import AuthLayout from './components/AuthLayout';
import { AppProvider, useAppContext } from './context/AppContext';

const PrivateRoute = ({ children }) => {
  const { session, loading } = useAppContext();

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-400">Loading...</div>;

  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="setup" element={<ProfileSetup />} />
          </Route>

          {/* Protected Routes */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="lounge" element={<GroupLounge />} />
            <Route path="events" element={<Events />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="calls" element={<CallCenter />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
