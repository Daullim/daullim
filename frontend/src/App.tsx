import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ControlPage from "@/pages/control";
import FieldDongPage from "@/pages/field-b1";
import FieldGridPage from "@/pages/field-b2";
import FieldUnitsPage from "@/pages/field-b3";
import RecordsPage from "@/pages/records";
import DemoPage from "@/pages/demo";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import SettingsPage from "@/pages/settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 진입점 = 로그인 (ADR-004 §1 v1.3). 가드는 두지 않아 /control 직접 진입도 된다 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/control" element={<ControlPage />} />
        <Route path="/field" element={<FieldDongPage />} />
        <Route path="/field/grid" element={<FieldGridPage />} />
        <Route path="/field/units" element={<FieldUnitsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
