import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

import AdminRoute from './components/admin/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRequests from './pages/admin/AdminRequests';
import AdminNews from './pages/admin/AdminNews';
import AdminMessages from './pages/admin/AdminMessages';
import AdminSettings from './pages/admin/AdminSettings';
import AdminComments from './pages/admin/AdminComments';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminTeam from './pages/admin/AdminTeam';
import AdminDirections from './pages/admin/AdminDirections';
import AdminPromos from './pages/admin/AdminPromos';
import AdminBonus from './pages/admin/AdminBonus';
import AdminShop from './pages/admin/AdminShop';
import AdminGroups from './pages/admin/AdminGroups'; // Import
import AdminAchievements from './pages/admin/AdminAchievements'; // Import
import AdminBans from './pages/admin/AdminBans'; // Import

import Shop from './pages/Shop'; // Import
import ProductDetails from './pages/ProductDetails';
import Favorites from './pages/Favorites';

import { FavoritesProvider } from './context/FavoritesContext';
import { useAuth } from './context/AuthContext';
import BannedScreen from './components/BannedScreen';

const App: React.FC = () => {
  const { banDetails } = useAuth();

  if (banDetails?.isBanned) {
    return <BannedScreen banDetails={banDetails} />;
  }

  return (
    <FavoritesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<Shop />} /> {/* Public Shop Route */}
          <Route path="/shop/favorites" element={<Favorites />} />
          <Route path="/shop/:id" element={<ProductDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminDashboard />} /> {/* Dashboard default */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="news" element={<AdminNews />} />
            <Route path="directions" element={<AdminDirections />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="comments" element={<AdminComments />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="promos" element={<AdminPromos />} />
            <Route path="bonus" element={<AdminBonus />} />
            <Route path="shop" element={<AdminShop />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="achievements" element={<AdminAchievements />} /> {/* Route */}
            <Route path="bans" element={<AdminBans />} />
          </Route>
        </Routes>
      </Router>
    </FavoritesProvider>
  );
};

export default App;