import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PastPapersPage } from './pages/PastPapersPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { DiscussionPage } from './pages/DiscussionPage';
import { VideosPage } from './pages/VideosPage';
import { VideosBySubjectPage } from './pages/VideosBySubjectPage';
import { MostWatchedVideosPage } from './pages/MostWatchedVideosPage';
import { StudyPacksPage } from './pages/StudyPacksPage';
import { StudyPackDetailPage } from './pages/StudyPackDetailPage';
import { SignInPage } from './pages/SignInPage';
import { ProfilePage } from './pages/ProfilePage';
import { PricingPage } from './pages/PricingPage';
import { CoStudyRoomsHub } from './pages/costudy/CoStudyRoomsHub';
import { CoStudyRoom } from './pages/costudy/CoStudyRoom';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminPapersPage } from './pages/admin/AdminPapersPage';
import { AdminResourcesPage } from './pages/admin/AdminResourcesPage';
import { AdminVideosPage } from './pages/admin/AdminVideosPage';
import { AdminDiscussionsPage } from './pages/admin/AdminDiscussionsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminStudyPacksPage } from './pages/admin/AdminStudyPacksPage';
import { AdminRoomSafetyPage } from './pages/admin/AdminRoomSafetyPage';
import { AddVideoPage } from './pages/admin/AddVideoPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminManagementPage } from './pages/admin/AdminManagementPage';
import { AdminContentHub } from './pages/admin/AdminContentHub';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';
import { InstallBanner } from './components/ui/InstallBanner';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { AdminExamTimetablesPage } from './pages/admin/AdminExamTimetablesPage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/past-papers" element={<PastPapersPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/discussion" element={<DiscussionPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/subject/:subject" element={<VideosBySubjectPage />} />
          <Route path="/videos/trending" element={<MostWatchedVideosPage />} />
          <Route path="/study-packs" element={<StudyPacksPage />} />
          <Route path="/study-packs/:id" element={<StudyPackDetailPage />} />
          <Route path="/study-rooms" element={<CoStudyRoomsHub />} />
          <Route path="/study-rooms/:roomId" element={<CoStudyRoom />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="audit" element={<AdminAuditLogPage />} />
            <Route path="content" element={<AdminContentHub />} />
            <Route path="papers" element={<AdminPapersPage />} />
            <Route path="exam-timetables" element={<AdminExamTimetablesPage />} />
            <Route path="resources" element={<AdminResourcesPage />} />
            <Route path="videos" element={<AdminVideosPage />} />
            <Route path="add-video" element={<AddVideoPage />} />
            <Route path="discussions" element={<AdminDiscussionsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="manage" element={<AdminManagementPage />} />
            <Route path="study-packs" element={<AdminStudyPacksPage />} />
            <Route path="safety" element={<AdminRoomSafetyPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
        <InstallBanner />
      </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
