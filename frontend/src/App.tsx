import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { useEffect } from 'react';

function App() {
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);
  const theme = useThemeStore((state) => state.theme);

  // Apply theme to document
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className={theme === 'dark' ? 'bg-gray-900 text-white min-h-screen' : 'bg-white text-gray-900 min-h-screen'}>
        <Router>
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
