import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ControlPage from "@/pages/control";
import FieldDongPage from "@/pages/field-b1";
import FieldGridPage from "@/pages/field-b2";
import FieldUnitsPage from "@/pages/field-b3";
import DemoPage from "@/pages/demo";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/control" element={<ControlPage />} />
        <Route path="/field" element={<FieldDongPage />} />
        <Route path="/field/grid" element={<FieldGridPage />} />
        <Route path="/field/units" element={<FieldUnitsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
