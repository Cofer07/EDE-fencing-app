import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function FencerImport() {
  const [csvData, setCsvData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ name: '', club: '', weapon: '' });

  const [existing, setExisting] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // last CSV name for UX (safe to store; path may not be accessible in renderer)
  const [lastCsvName, setLastCsvName] = useState('');

  const navigate = useNavigate();

  // Load existing roster + last mapping + last CSV name
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const lastMap = localStorage.getItem('pc:lastMapping');
        if (lastMap) setMapping(JSON.parse(lastMap));
      } catch {}

      try {
        const name = await window.api.getSetting('lastCsvName');
        if (name && mounted) setLastCsvName(name);
      } catch {}

      try {
        const rows = await window.api.listFencers('');
        if (mounted) setExisting(rows || []);
      } catch (e) {
        console.error('Failed to load existing fencers:', e);
      } finally {
        if (mounted) setLoadingExisting(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Persist mapping
  useEffect(() => {
    try { localStorage.setItem('pc:lastMapping', JSON.stringify(mapping)); } catch {}
  }, [mapping]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Persist last CSV "file name" (safe)
    try { await window.api.setSetting('lastCsvName', file.name); setLastCsvName(file.name); } catch {}

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setColumns(Object.keys(results.data[0] || {}));
      },
      error: (err) => {
        console.error(err);
        toast.error('Could not parse CSV.');
      }
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

    if (result?.success) {
      const { inserted = validFencers.length, ignored = 0 } = result;
      toast.success(`Imported ${inserted} fencers${ignored ? ` (${ignored} duplicates ignored)` : ''}.`);
      try {
        const rows = await window.api.listFencers('');
        setExisting(rows || []);
      } catch {}
      navigate('/validate-fencers');
    } else {
      toast.error(`Error: Fencers not imported.${result?.error ? ` ${result.error}` : ''}`);
    }
  };

  const clearRoster = async () => {
    const yes = window.confirm('This will remove all fencers from the roster. Continue?');
    if (!yes) return;
    const res = await window.api.clearFencers();
    if (res?.success) {
      toast.success(`Cleared ${res.deleted} rows.`);
      setExisting([]);
    } else {
      toast.error('Failed to clear roster.');
    }
  };

  return (
    <div className="min-h-screen bg-[#111622] text-white font-sans flex flex-col">
      <main className="flex-1 p-10 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Import Fencer Data</h1>
            <p className="text-[#93a1c8] mb-6 text-sm">Upload a file or manually enter fencer info</p>
          </div>
          {existing.length > 0 && (
            <button
              onClick={clearRoster}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded border border-rose-800"
              title="Remove all current fencers"
            >
              Clear Roster
            </button>
          )}
        </div>

        {/* Persistence panel: show already-imported roster */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-bold">Currently imported</h3>
            <div className="text-xs text-gray-400">
              {loadingExisting ? 'Loading…' : `${existing.length} fencers`}
            </div>
          </div>
          <div className="bg-[#141b2b] border border-[#2a3550] rounded-lg p-3 max-h-48 overflow-auto text-sm">
            {loadingExisting ? (
              <div className="opacity-70">Loading roster…</div>
            ) : existing.length === 0 ? (
              <div className="opacity-70">No fencers in the database yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#12182a]">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Club</th>
                    <th className="text-left p-2">Weapon</th>
                    <th className="text-left p-2">Valid?</th>
                  </tr>
                </thead>
                <tbody>
                  {existing.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-t border-[#263355]">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.club || '-'}</td>
                      <td className="p-2">{r.weapon || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] ${r.is_valid ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                          {r.is_valid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {existing.length > 50 && (
              <div className="text-[11px] mt-2 opacity-70">Showing first 50…</div>
            )}
          </div>
        </section>

        {/* Upload */}
        <div className="w-full border-2 border-dashed border-[#344165] p-8 rounded-xl flex flex-col items-center gap-4">
          <p className="text-lg font-bold">Drag and drop a file here, or browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#242e47] file:text-white hover:file:bg-[#2f3b5e]"
          />
          <div className="text-xs text-gray-400">
            {lastCsvName ? `Last CSV: ${lastCsvName}` : 'No CSV chosen yet.'}
          </div>
        </div>

        {/* Mapping + Preview */}
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
                      <option key={col} value={col}>{col}</option>
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
                      <option key={col} value={col}>{col}</option>
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
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import */}
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
