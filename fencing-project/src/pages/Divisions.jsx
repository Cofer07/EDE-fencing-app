import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Divisions() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const l = await window.api.divisionsList?.() || [];
      setList(l);
    } catch (e) {
      toast.error(`Load divisions failed: ${e?.message || e}`);
    }
  };
  useEffect(() => { refresh(); }, []);

  const createDivs = async () => {
    try {
      setBusy(true);
      const res = await window.api.divisionsCreate?.();
      if (!res?.success) toast.error(res?.error || 'Create divisions failed');
      else {
        toast.success(`Created ${res.created?.length || 0} division(s)`);
        await refresh();
      }
    } catch (e) {
      toast.error(`Create divisions failed: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Divisions</h1>
          <button onClick={createDivs} disabled={busy}
                  className="rounded-md px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Working…' : 'Create Divisions (from Swiss)'}
          </button>
        </div>

        {list.length === 0 && (
          <div className="text-sm opacity-80">No divisions yet. Click the button to create them from Swiss standings.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(d => (
            <div key={d.id}
                 className="cursor-pointer rounded-xl border border-[#232846] bg-[#12162a] p-4 hover:border-indigo-600"
                 onClick={() => nav(`/divisions/${d.id}`)}>
              <div className="text-lg font-semibold">{d.name}</div>
              <div className="text-xs opacity-70">Fencers: {d.size}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
