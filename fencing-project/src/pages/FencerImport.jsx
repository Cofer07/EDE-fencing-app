// src/pages/FencerImport.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import '../index.css';

export default function FencerImport() {
  const [csvData, setCsvData] = useState([]);

  const handleFile = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed data:', results.data);
        setCsvData(results.data);
      },
    });
  };

  const handleImport = async () => {
    const validFencers = csvData.filter((row) => row.name?.trim() && row.weapon?.trim());

    if (validFencers.length === 0) {
      alert('No valid rows to import.');
      return;
    }

    const result = await window.api.importFencers(validFencers);
    if (result.success) alert('Fencers imported!');
    else alert('Error: ' + result.error);
  };

  return (
    <div className="min-h-screen bg-[#111622] text-white font-sans">
      <header className="flex items-center justify-between border-b border-[#242e47] px-10 py-3">
        <div className="flex items-center gap-3">
          <img src="/src/assets/PointControl.png" className="w-8 h-8" alt="Logo" />
          <h2 className="text-lg font-bold">Tournament Manager</h2>
        </div>
        <div className="text-sm">Fencer Import</div>
      </header>

      <main className="p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2">Import Fencer Data</h1>
        <p className="text-[#93a1c8] mb-8 text-sm">Upload a file or manually enter fencer info</p>

        <div className="w-full max-w-xl border-2 border-dashed border-[#344165] p-8 rounded-xl flex flex-col items-center gap-6">
          <p className="text-lg font-bold">Drag and drop a file here, or browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm text-white file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-[#242e47] file:text-white
              hover:file:bg-[#2f3b5e]"
          />
          <button
            onClick={handleImport}
            className="bg-[#1647ce] hover:bg-[#1e53e6] text-white font-bold py-2 px-6 rounded"
          >
            Import Data
          </button>
        </div>

        {csvData.length > 0 && (
          <div className="mt-10 text-left w-full max-w-xl">
            <h3 className="text-lg font-bold mb-2">Preview</h3>
            <pre className="text-xs whitespace-pre-wrap bg-[#1a2132] p-4 rounded max-h-64 overflow-y-auto">
              {JSON.stringify(csvData.slice(0, 5), null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}