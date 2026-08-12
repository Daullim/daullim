import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import ControlLayout from "@/pages/control";
import ControlOverviewPage from "@/pages/control-overview";
import ControlPendingPage from "@/pages/control-pending";
import ControlRiskPage from "@/pages/control-risk";
import FieldDongPage from "@/pages/field-b1";
import FieldGridPage from "@/pages/field-b2";
import FieldUnitsPage from "@/pages/field-b3";
import FieldProgressPage from "@/pages/field-progress";
import RecordsPage from "@/pages/records";
import DemoPage from "@/pages/demo";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import SettingsPage from "@/pages/settings";
import { setUnauthorizedHandler } from "@/api/client";

/**
 * 세션이 만료되면 로그인으로 돌려보냄.
 */
function SessionExpiryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => navigate("/login", { replace: true }));
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionExpiryRedirect />
      <Routes>
        {/* 진입점 = 로그인 (ADR-004 §1 v1.3). 가드는 두지 않아 /control 직접 진입도 된다 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/demo" element={<DemoPage />} />
        {/* 관제 5탭 — 레이아웃이 관할 스코프·요약 바를 들고 탭이 Outlet으로 들어온다 */}
        <Route path="/control" element={<ControlLayout />}>
          <Route index element={<ControlOverviewPage />} />
          <Route path="risk" element={<ControlRiskPage />} />
          <Route path="progress" element={<ControlPendingPage tab="추진 현황" />} />
          <Route path="materials" element={<ControlPendingPage tab="소요 물량" />} />
          <Route path="report" element={<ControlPendingPage tab="실적 통계" />} />
        </Route>
        <Route path="/field" element={<FieldDongPage />} />
        <Route path="/field/grid" element={<FieldGridPage />} />
        <Route path="/field/units" element={<FieldUnitsPage />} />
        <Route path="/field/progress" element={<FieldProgressPage />} />
      </Routes>
    </BrowserRouter>
  );
}
