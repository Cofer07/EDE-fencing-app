import { useEffect, useMemo, useState } from 'react';

export default function ValidateFencers() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    const data = await window.api.listFencers(query);
    setRows(data || []);
    setSelected(new Set());
  };

  useEffect(() => { load(); }, []);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected]
  );
  const someSelected = useMemo(
    () => rows.some((r) => selected.has(r.id)) && !allSelected,
    [rows, selected]
  );

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkSet = async (valid) => {
    if (selected.size === 0) return;
    await window.api.updateFencerValidity([...selected], valid);
    await load();
  };

  const onSearch = async (e) => {
    e.preventDefault();
    await load();
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Validate Fencers</h1>

        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / club / weapon"
            className="flex-1 rounded-md bg-[#181c2f] border border-[#2a2f4a] px-3 py-2 outline-none"
          />
          <button className="rounded-md px-4 py-2 bg-[#222743] border border-[#2a2f4a] hover:bg-[#2a3059]">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => bulkSet(true)}
            className="rounded-md px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            disabled={selected.size === 0}
          >
            Mark as Valid
          </button>
          <button
            onClick={() => bulkSet(false)}
            className="rounded-md px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
            disabled={selected.size === 0}
          >
            Mark as Invalid
          </button>
          <div className="text-sm opacity-80">Selected: {selected.size}</div>
        </div>

        <div className="rounded-lg border border-[#232846] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#171b2d]">
              <tr>
                <th className="p-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Club</th>
                <th className="p-3 text-left">Weapon</th>
                <th className="p-3 text-left">Valid?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="odd:bg-[#12162a] even:bg-[#0f1325] border-t border-[#232846]">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                    />
                  </td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.club || '-'}</td>
                  <td className="p-3">{r.weapon || '-'}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${r.is_valid ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                      {r.is_valid ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-6 text-center opacity-70" colSpan={5}>
                    No fencers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
