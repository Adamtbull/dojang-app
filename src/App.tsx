import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LibraryProvider } from "./hooks/useLibrary";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MovementPage } from "./pages/MovementPage";
import { GuidePage } from "./pages/GuidePage";
import { ExportPage } from "./pages/ExportPage";

export default function App() {
  return (
    <LibraryProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:id" element={<MovementPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LibraryProvider>
  );
}
