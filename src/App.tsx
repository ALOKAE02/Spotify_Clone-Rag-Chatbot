import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthProvider';
import { UIProvider } from './context/UIProvider';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { SectionPage } from './pages/SectionPage';
import { ComingSoon } from './pages/ComingSoon';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="section/:id" element={<SectionPage />} />
              <Route path="*" element={<ComingSoon />} />
            </Route>
          </Routes>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
