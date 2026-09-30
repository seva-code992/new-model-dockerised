import React, { useRef, useState } from "react";

const SPECIES_OPTIONS = [
  "Populus tremula",
  "Picea abies",
  "Pinus Sylvestris",
  "Betula pendula",
  "Tilia tomentosa",
  "Arabidopsis thaliana",
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SemanticSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [species, setSpecies] = useState(SPECIES_OPTIONS[0]);
  const [query, setQuery] = useState("");
  const [numberOfResults, setNumberOfResults] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const lastSearch = useRef(null); // parameters of the search that produced `results`

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      setError("Enter a description of the gene you're looking for.");
      return;
    }
    setError("");
    setIsSearching(true);

    try {
      const url = `${API_BASE_URL}/Search/?species=${encodeURIComponent(
        species
      )}&query=${encodeURIComponent(query)}&number_of_results=${numberOfResults}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned error code: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      lastSearch.current = { species, query, numberOfResults };
    } catch (err) {
      console.error("Search fetch error:", err);
      setError("Something went wrong while searching. Please verify the backend is running.");
    } finally {
      setIsSearching(false);
    }
  };





const handleCopy = async (format) => {
  if (results.length === 0) return;

  let textToCopy = "";

  if (format === "table") {
    const header = "Gene ID\tSimilarity score\tDescription";
    const rows = results
      .map((r) => `${r.Gene}\t${r["Similarity score"]}\t${r.Description}`)
      .join("\n");
    textToCopy = `${header}\n${rows}`;
    setCopyStatus("Copied Table!");
  } else if (format === "ids") {
    textToCopy = results.map((r) => r.Gene).join("\n");
    setCopyStatus("Copied IDs!");
  } else if (format === "json") {
    // ID, description, similarity and embedding vector for every gene (used by the Graph maker)
    setShowCopyMenu(false);
    setCopyStatus("Fetching embeddings...");
    try {
      const { species: sp, query: q, numberOfResults: n } = lastSearch.current;
      const res = await fetch(
        `${API_BASE_URL}/Search/?species=${encodeURIComponent(sp)}&query=${encodeURIComponent(q)}&number_of_results=${n}&include_embeddings=true`
      );
      if (!res.ok) throw new Error(`Server returned error code: ${res.status}`);
      const full = await res.json();
      textToCopy = JSON.stringify(
        {
          query: q,
          species: sp,
          genes: full.map((r) => ({
            id: r.Gene,
            description: r.Description,
            similarity: r["Similarity score"],
            embedding: r.Embedding,
          })),
        },
        null,
        2
      );
      setCopyStatus("Copied JSON!");
    } catch (err) {
      console.error("Embedding fetch error:", err);
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(""), 2000);
      return;
    }
  }

  await navigator.clipboard.writeText(textToCopy);
  setShowCopyMenu(false);

  // Reset indicator message after 2 seconds
  setTimeout(() => setCopyStatus(""), 2000);
};

  return (
    <div className="semantic-search">
      {/* Top Card Bar */}
      <div className="semantic-search__header">
        <div>
          <h2 className="semantic-search__title">Semantic search</h2>
          {!isExpanded && (
            <p className="semantic-search__description">
              Look for annotated genes within our database. The result retrieval is based on AI.
            </p>
          )}
        </div>
        <button
          onClick={toggleExpanded}
          className="semantic-search__toggle-button"
          aria-label="Toggle Expand"
        >
          <svg
            viewBox="0 0 22 18"
            className={`semantic-search__chevron${isExpanded ? " semantic-search__chevron--expanded" : ""}`}
          >
            <path d="M2 2 L11 15 L20 2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="semantic-search__panel">
          <form onSubmit={handleSearch} className="semantic-search__form">
            {/* Top Inputs: Species & Result count */}
            <div className="semantic-search__filters">
              <div className="semantic-search__field">
                <label className="semantic-search__label">Species:</label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="semantic-search__select"
                >
                  {SPECIES_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="semantic-search__field">
                <label className="semantic-search__label">Number of results:</label>
                <input
                  type="number"
                  min="1"
                  value={numberOfResults}
                  onChange={(e) => setNumberOfResults(Number(e.target.value))}
                  className="semantic-search__number-input"
                />
              </div>
            </div>

            {/* Search Input Bar with Glass Icon Button */}
            <div className="semantic-search__search-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="semantic-search__query-input"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="semantic-search__submit-button"
              >
                <svg
                  className="semantic-search__submit-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
            {error && <p className="semantic-search__error">{error}</p>}
          </form>

          {/* Results Table matching Figma layout */}
          {results.length > 0 && (
            <div className="semantic-search__table-wrapper">
              <table className="semantic-search__results-table">
                <thead>
                  <tr className="semantic-search__table-head-row">
                    <th className="semantic-search__th semantic-search__th--id">Gene ID:</th>
                    <th className="semantic-search__th semantic-search__th--score">Similarity score:</th>
                    <th className="semantic-search__th semantic-search__th--description">Description:</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, idx) => (
                    <tr
                      key={idx}
                      className="semantic-search__table-row"
                    >
                      <td className="semantic-search__cell">{res.Gene}</td>
                      <td className="semantic-search__cell semantic-search__cell--center">
                        {typeof res["Similarity score"] === "number"
                          ? res["Similarity score"].toFixed(2)
                          : res["Similarity score"]}
                      </td>
                      <td className="semantic-search__cell">{res.Description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Controls: Results counter + Copy & Close buttons */}
          <div className="semantic-search__footer">
            <span className="semantic-search__result-count">
              Number of results: {results.length}
            </span>
            <div className="semantic-search__footer-actions">
              <div className="semantic-search__copy-wrapper">
  <button
    type="button"
    onClick={() => setShowCopyMenu((prev) => !prev)}
    disabled={results.length === 0}
    className="semantic-search__copy-button"
  >
    <span>{copyStatus || "Copy..."}</span>
    <svg className="semantic-search__copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showCopyMenu && (
    <div className="semantic-search__copy-menu">
      <button
        type="button"
        onClick={() => handleCopy("table")}
        className="semantic-search__copy-menu-item"
      >
        Copy table
      </button>
      <button
        type="button"
        onClick={() => handleCopy("ids")}
        className="semantic-search__copy-menu-item"
      >
        Copy IDs only
      </button>
      <button
        type="button"
        onClick={() => handleCopy("json")}
        className="semantic-search__copy-menu-item"
      >
        Copy in JSON format
      </button>
    </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="semantic-search__close-button"
        >
          Close
        </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}