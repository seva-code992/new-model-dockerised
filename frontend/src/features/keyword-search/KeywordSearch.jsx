import React, { useState, useRef, useEffect } from "react";
import CollapsibleCard from "../../components/CollapsibleCard.jsx";
import Button from "../../components/Button.jsx";
import SearchSubmitButton from "../../components/SearchSubmitButton.jsx";
import { KEYWORD_SEARCH_SPECIES } from "../../constants/species.js";

// Result table columns: header label + field of the API row
const RESULT_COLUMNS = [
  { label: "Gene ID", field: "Gene" },
  { label: "Description", field: "Description" },
  { label: "Chromosome", field: "Chromosome" },
  { label: "Strand", field: "Strand" },
  { label: "Length", field: "Length" },
  { label: "Start", field: "Start" },
  { label: "End", field: "End" },
  { label: "PFAMs", field: "Pfams" },
  { label: "GO terms", field: "GOs" },
  { label: "KEGG pathway", field: "KEGG" },
];

/** One entry of the upload menu: icon + label. */
function UploadMenuItem({ iconPath, label, onClick }) {
  return (
    <button type="button" className="menu__item menu__item--with-icon" onClick={onClick}>
      <svg className="menu__icon" viewBox="0 0 24 24">
        <path d={iconPath} />
      </svg>
      <span>{label}</span>
    </button>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function KeywordSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [species, setSpecies] = useState(KEYWORD_SEARCH_SPECIES[0]);
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
    <CollapsibleCard
      title="Find about genes"
      description="Look for information about a single gene or a premade list of genes (IDs only)."
      expanded={isExpanded}
      onToggle={toggleExpanded}
    >
      <div className="keyword-search__panel">
        <form onSubmit={handleSearch} className="keyword-search__form">
          <div className="field">
            <label className="field__label" htmlFor="keyword-species">Species:</label>
            <select
              id="keyword-species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="field__control"
            >
              {KEYWORD_SEARCH_SPECIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Query bar (with upload menu inside) + round search button */}
          <div className="search-row">
            <div className="search-pill">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a gene ID, paste or upload an ID list..."
                className="search-pill__input"
              />

              <div className="menu-anchor" ref={uploadMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUploadMenu((prev) => !prev)}
                  className="icon-button icon-button--small"
                  title="Upload or Paste ID list"
                  aria-label="Upload or paste ID list"
                >
                  <svg className="icon-button__icon" viewBox="0 0 24 24">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>

                {showUploadMenu && (
                  <div className="menu menu--above">
                    <UploadMenuItem
                      iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      label="Paste list from clipboard"
                      onClick={handlePasteFromClipboard}
                    />
                    <UploadMenuItem
                      iconPath="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      label="Upload file (.txt, .csv)"
                      onClick={handleTriggerFileInput}
                    />
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

            <SearchSubmitButton disabled={isSearching} />
          </div>

          {error && <p className="keyword-search__error">{error}</p>}
        </form>

        {results.length > 0 && (
          <div className="results-table-wrapper">
            <table className="results-table results-table--nowrap">
              <thead>
                <tr className="results-table__head-row">
                  {RESULT_COLUMNS.map((col) => (
                    <th key={col.field} className="results-table__th">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx} className="results-table__row">
                    {RESULT_COLUMNS.map((col) => (
                      <td key={col.field} className="results-table__cell">{item[col.field] || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {results.length > 0 && (
          <div className="keyword-search__actions">
            <Button onClick={handleCopyResults}>Copy</Button>
            <Button onClick={() => setIsExpanded(false)}>Close</Button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
