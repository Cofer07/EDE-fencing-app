import React, { useState } from 'react';
import Papa from 'papaparse';

export default function App() {
  const [csvData, setCsvData] = useState([]);

  const handleFile = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("CSV headers:", Object.keys(results.data[0]));
        console.log("Parsed data:", results.data);
        setCsvData(results.data);
      },
    });
  };


  const handleImport = async () => {
  const validFencers = csvData.filter((row) =>
    row.name?.trim() && row.weapon?.trim()
  );

  if (validFencers.length === 0) {
    alert("No valid rows to import.");
    return;
  }

  console.log("Importing:", validFencers);

  const result = await window.api.importFencers(validFencers);

  if (result.success) {
    alert("Fencers imported!");
  } else {
    alert("Error: " + result.error);
  }
};


  return (
    <div className="p-6">
      <input type="file" accept=".csv" onChange={handleFile} />
      <button onClick={handleImport} className="ml-2 bg-blue-500 text-white px-4 py-1 rounded">Import Fencers</button>
    </div>
  );
}
