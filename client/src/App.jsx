import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import StudiosAdminPage from "./pages/admin/StudiosAdminPage.jsx";
import ServicesAdminPage from "./pages/admin/ServicesAdminPage.jsx";
import InstructorsAdminPage from "./pages/admin/InstructorsAdminPage.jsx";
import ClassesAdminPage from "./pages/admin/ClassesAdminPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="studios" replace />} />
          <Route path="studios" element={<StudiosAdminPage />} />
          <Route path="services" element={<ServicesAdminPage />} />
          <Route path="instructors" element={<InstructorsAdminPage />} />
          <Route path="classes" element={<ClassesAdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  );
}
