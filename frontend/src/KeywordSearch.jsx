import React, { useState, useRef, useEffect } from "react";

const SPECIES_OPTIONS = [
  { label: "Pinus Sylvestris", value: "Pinus Sylvestris" },
  { label: "Populus tremula", value: "Populus tremula" },
  { label: "Picea abies", value: "Picea abies" },
  { label: "Betula pendula", value: "Betula pendula" },
  { label: "Tilia tomentosa", value: "Tilia tomentosa" },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function KeywordSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [species, setSpecies] = useState(SPECIES_OPTIONS[0].value);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  // Upload options dropdown state
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputRef = useRef(null);
  const uploadMenuRef = useRef(null);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  // Close upload menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(event.target)
      ) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



 const handleSearch = async (e) => {
  e?.preventDefault();
  setError("");
  setIsSearching(true);

  try {
    const url = `${API_BASE_URL}/FtsSearch/GeneSearch?species=${encodeURIComponent(
      species
    )}&query=${encodeURIComponent(query)}&number_of_results=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();

    // Fallback to empty array if API returns null, undefined, or non-array data
    if (Array.isArray(data)) {
      setResults(data);
    } else if (data && Array.isArray(data.results)) {
      setResults(data.results);
    } else {
      setResults([]);
      if (!data) {
        setError("No results found for this query.");
      }
    }
  } catch (err) {
    console.error("Keyword search fetch error:", err);
    setError("Failed to fetch search results. Make sure backend is running.");
    setResults([]);
  } finally {
    setIsSearching(false);
  }
};


  const handleCopyResults = () => {
    if (results.length === 0) return;
    const header =
      "Gene ID\tDescription\tChromosome\tStrand\tLength\tStart\tEnd\tPFAMs\tGO terms\tKEGG pathway";
    const rows = results
      .map(
        (r) =>
          `${r.Gene || ""}\t${r.Description || ""}\t${r.Chromosome || ""}\t${
            r.Strand || ""
          }\t${r.Length || ""}\t${r.Start || ""}\t${r.End || ""}\t${
            r.Pfams || ""
          }\t${r.GOs || ""}\t${r.KEGG || ""}`
      )
      .join("\n");

    navigator.clipboard.writeText(`${header}\n${rows}`);
  };


  const handlePasteFromClipboard = async () => {
  setShowUploadMenu(false);
  try {
    // Check if the Clipboard API is available in current context
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      throw new Error("Clipboard API not available in unsecure HTTP context.");
    }

    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      setError("Clipboard is empty.");
      return;
    }

    // Clean whitespace/newlines into a single space-separated query
    const cleaned = text
      .split(/[\n,\r\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    setQuery(cleaned);
    setError("");
  } catch (err) {
    console.error("Clipboard read error:", err);
    setError(
      "Unable to read clipboard directly. Please click the search bar and press Ctrl+V (Cmd+V) to paste."
    );
  }
};


  const handleTriggerFileInput = () => {
    setShowUploadMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const cleaned = text
        .split(/[\n,\r\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");

      setQuery(cleaned);
      setError("");
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full bg-white border-4 border-[#CCCCCC] p-6 shadow-lg relative flex flex-col justify-between min-h-[150px]">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">
            Find about genes
          </h2>

          {!isExpanded && (
            <p className="text-sm text-gray-500 mt-2">
              Look for information about a single gene or a premade list of genes (IDs only).
            </p>
          )}
        </div>

        {/* Toggle Chevron Arrow */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="text-[#0004FF] p-1 focus:outline-none shrink-0"
          aria-label="Toggle Expand"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-6 h-6 transition-transform duration-200 ${
              isExpanded ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Content Section */}
      {isExpanded && (
        <div className="mt-4 flex flex-col gap-5">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            {/* Species Select Bar matched with Semantic Search */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-black">
                Species:
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="bg-[#E5E5E5] text-sm text-black px-3 py-1 rounded shadow-sm focus:outline-none border-none cursor-pointer"
              >
                {SPECIES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Pill Bar & Blue Button */}
            <div className="flex items-center gap-3 w-full pr-1">
              <div className="relative flex-1 flex items-center border border-black rounded-full shadow-[0px_4px_4px_rgba(0,0,0,0.25)] px-4 py-2 bg-white min-w-0">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a gene ID, paste or upload an ID list..."
                  className="w-full text-sm text-black text-left placeholder:text-[#64748B] focus:outline-none bg-transparent pr-2 min-w-0"
                />

                {/* Upload Button Dropdown */}
                <div className="relative ml-2 shrink-0" ref={uploadMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUploadMenu((prev) => !prev)}
                    className="bg-[#D9D9D9] p-1.5 border border-black text-black hover:bg-gray-300 flex items-center justify-center rounded-sm"
                    title="Upload or Paste ID list"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </button>

                    {/* Popover Dropup Menu */}
                    {showUploadMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-black shadow-lg z-20 flex flex-col text-xs font-sans">
                        <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-left px-3 py-2 text-black hover:bg-[#D9D9D9] border-b border-gray-200 flex items-center gap-2"
                        >
                        <svg className="w-4 h-4 shrink-0 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Paste list from clipboard</span>
                        </button>
                        <button
                        type="button"
                        onClick={handleTriggerFileInput}
                        className="text-left px-3 py-2 text-black hover:bg-[#D9D9D9] flex items-center gap-2"
                        >
                        <svg className="w-4 h-4 shrink-0 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>Upload file (.txt, .csv)</span>
                        </button>
                    </div>
                    )}                 
                    
                     <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Blue Search Magnifying Circle matched with Semantic Search size */}
              <button
                type="submit"
                disabled={isSearching}
                className="w-9 h-9 shrink-0 rounded-full bg-[#85D8FB] border border-black flex items-center justify-center hover:bg-[#62c3ea] shadow-sm disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>

          {/* Results Table */}
          {results.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 mt-2">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#E5E5E5] text-black font-semibold h-8">
                    <th className="p-2 whitespace-nowrap">Gene ID</th>
                    <th className="p-2 whitespace-nowrap">Description</th>
                    <th className="p-2 whitespace-nowrap">Chromosome</th>
                    <th className="p-2 whitespace-nowrap">Strand</th>
                    <th className="p-2 whitespace-nowrap">Length</th>
                    <th className="p-2 whitespace-nowrap">Start</th>
                    <th className="p-2 whitespace-nowrap">End</th>
                    <th className="p-2 whitespace-nowrap">PFAMs</th>
                    <th className="p-2 whitespace-nowrap">GO terms</th>
                    <th className="p-2 whitespace-nowrap">KEGG pathway</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 text-black font-normal h-8 hover:bg-gray-50"
                    >
                      <td className="p-2 whitespace-nowrap">{item.Gene || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Description || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Chromosome || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Strand || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Length || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Start || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.End || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.Pfams || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.GOs || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{item.KEGG || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Action Buttons */}
          {results?.length > 0 && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyResults}
                className="px-4 py-1 bg-[#D9D9D9] shadow-sm text-black text-xs font-semibold hover:bg-gray-300 rounded"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1 bg-[#D9D9D9] shadow-sm text-black text-xs font-semibold hover:bg-gray-300 rounded"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}