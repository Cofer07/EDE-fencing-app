// src/pages/FencerImport.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function FencerImport() {
  const [csvData, setCsvData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ name: '', club: '', weapon: '' });
  const navigate = useNavigate();

  const handleFile = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed data:', results.data);
        setCsvData(results.data);
        setColumns(Object.keys(results.data[0] || {}));
      },
    });
  };

  const handleImport = async () => {
    const { name, club, weapon } = mapping;

    if (!name || !weapon) {
      toast.error('Please select required fields for Name and Weapon.');
      return;
    }

    const validFencers = csvData.filter((row) => row[name]?.trim() && row[weapon]?.trim());

    if (validFencers.length === 0) {
      toast.error('No valid rows to import.');
      return;
    }

    const result = await window.api.importFencers(
      validFencers.map((row) => ({
        name: row[name],
        club: row[club] || '',
        weapon: row[weapon],
      }))
    );

    if (result.success) {
      toast.success('Fencers successfully imported!');
      navigate('/validate-fencers'); // ✅ Redirect after success
    } else {
      toast.error('Error: Fencers not imported.');
    }
  };

  return (
    <div className="min-h-screen bg-[#111622] text-white font-sans flex flex-col">
      <main className="flex-1 p-10 w-full max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Import Fencer Data</h1>
        <p className="text-[#93a1c8] mb-6 text-sm">Upload a file or manually enter fencer info</p>

        <div className="w-full border-2 border-dashed border-[#344165] p-8 rounded-xl flex flex-col items-center gap-6">
          <p className="text-lg font-bold">Drag and drop a file here, or browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#242e47] file:text-white hover:file:bg-[#2f3b5e]"
          />
        </div>

        {columns.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">
            {/* Preview */}
            <div>
              <h3 className="text-md font-bold mb-2">Preview</h3>
              <div className="text-sm bg-[#1a2132] rounded p-4 max-h-64 overflow-y-auto">
                <table className="table-auto w-full text-left text-xs">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-2 py-1 border-b border-[#344165]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t border-[#2b364d]">
                        {columns.map((col) => (
                          <td key={col} className="px-2 py-1">
                            {row[col] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping */}
            <div>
              <h3 className="text-md font-bold mb-2">Data Mapping</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block mb-1">Name</label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="w-full bg-[#1a2132] text-white px-4 py-2 rounded"
                  >
                    <option value="">Select Field</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Club</label>
                  <select
                    value={mapping.club}
                    onChange={(e) => setMapping({ ...mapping, club: e.target.value })}
                    className="w-full bg-[#1a2132] text-white px-4 py-2 rounded"
                  >
                    <option value="">Select Field</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Weapon</label>
                  <select
                    value={mapping.weapon}
                    onChange={(e) => setMapping({ ...mapping, weapon: e.target.value })}
                    className="w-full bg-[#1a2132] text-white px-4 py-2 rounded"
                  >
                    <option value="">Select Field</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full flex justify-end mt-10">
          <button
            onClick={handleImport}
            className="bg-[#1647ce] hover:bg-[#1e53e6] text-white font-bold py-2 px-6 rounded"
          >
            Import Data
          </button>
        </div>
      </main>
    </div>
  );
}
