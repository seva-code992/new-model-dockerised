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
    <div className="keyword-search">
      {/* Top Header Row */}
      <div className="keyword-search__header">
        <div>
          <h2 className="keyword-search__title">
            Find about genes
          </h2>

          {!isExpanded && (
            <p className="keyword-search__description">
              Look for information about a single gene or a premade list of genes (IDs only).
            </p>
          )}
        </div>

        {/* Toggle Chevron Arrow */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="keyword-search__toggle-button"
          aria-label="Toggle Expand"
        >
          <svg
            viewBox="0 0 24 24"
            className={`keyword-search__chevron${isExpanded ? " keyword-search__chevron--expanded" : ""}`}
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
        <div className="keyword-search__panel">
          <form onSubmit={handleSearch} className="keyword-search__form">
            {/* Species Select Bar matched with Semantic Search */}
            <div className="keyword-search__species-field">
              <label className="keyword-search__label">
                Species:
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="keyword-search__select"
              >
                {SPECIES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Pill Bar & Blue Button */}
            <div className="keyword-search__search-row">
              <div className="keyword-search__search-pill">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a gene ID, paste or upload an ID list..."
                  className="keyword-search__query-input"
                />

                {/* Upload Button Dropdown */}
                <div className="keyword-search__upload-wrapper" ref={uploadMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUploadMenu((prev) => !prev)}
                    className="keyword-search__upload-button"
                    title="Upload or Paste ID list"
                  >
                    <svg
                      className="keyword-search__upload-icon"
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
                    <div className="keyword-search__upload-menu">
                        <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="keyword-search__upload-menu-item"
                        >
                        <svg className="keyword-search__upload-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Paste list from clipboard</span>
                        </button>
                        <button
                        type="button"
                        onClick={handleTriggerFileInput}
                        className="keyword-search__upload-menu-item"
                        >
                        <svg className="keyword-search__upload-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="keyword-search__file-input"
                  />
                </div>
              </div>

              {/* Blue Search Magnifying Circle matched with Semantic Search size */}
              <button
                type="submit"
                disabled={isSearching}
                className="keyword-search__submit-button"
              >
                <svg
                  className="keyword-search__submit-icon"
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

            {error && <p className="keyword-search__error">{error}</p>}
          </form>

          {/* Results Table */}
          {results.length > 0 && (
            <div className="keyword-search__table-wrapper">
              <table className="keyword-search__results-table">
                <thead>
                  <tr className="keyword-search__table-head-row">
                    <th className="keyword-search__th">Gene ID</th>
                    <th className="keyword-search__th">Description</th>
                    <th className="keyword-search__th">Chromosome</th>
                    <th className="keyword-search__th">Strand</th>
                    <th className="keyword-search__th">Length</th>
                    <th className="keyword-search__th">Start</th>
                    <th className="keyword-search__th">End</th>
                    <th className="keyword-search__th">PFAMs</th>
                    <th className="keyword-search__th">GO terms</th>
                    <th className="keyword-search__th">KEGG pathway</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, idx) => (
                    <tr
                      key={idx}
                      className="keyword-search__table-row"
                    >
                      <td className="keyword-search__cell">{item.Gene || "-"}</td>
                      <td className="keyword-search__cell">{item.Description || "-"}</td>
                      <td className="keyword-search__cell">{item.Chromosome || "-"}</td>
                      <td className="keyword-search__cell">{item.Strand || "-"}</td>
                      <td className="keyword-search__cell">{item.Length || "-"}</td>
                      <td className="keyword-search__cell">{item.Start || "-"}</td>
                      <td className="keyword-search__cell">{item.End || "-"}</td>
                      <td className="keyword-search__cell">{item.Pfams || "-"}</td>
                      <td className="keyword-search__cell">{item.GOs || "-"}</td>
                      <td className="keyword-search__cell">{item.KEGG || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Action Buttons */}
          {results?.length > 0 && (
            <div className="keyword-search__actions">
              <button
                type="button"
                onClick={handleCopyResults}
                className="keyword-search__action-button"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="keyword-search__action-button"
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