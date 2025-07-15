import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FencerImport from "./pages/FencerImport";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="w-full h-full min-h-screen bg-[#0d1321] text-white">
      <Router>
        <Routes>
          <Route path="/" element={<FencerImport />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b", // Slate
            color: "#fff",
          },
          success: {
            iconTheme: {
              primary: "#4ade80", // Green
              secondary: "#0f172a",
            },
          },
          error: {
            iconTheme: {
              primary: "#f87171", // Red
              secondary: "#0f172a",
            },
          },
        }}
      />
    </div>
  );
}

export default App;
