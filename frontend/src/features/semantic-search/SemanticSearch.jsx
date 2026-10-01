import React, { useRef, useState } from "react";
import CollapsibleCard from "../../components/CollapsibleCard.jsx";
import Button from "../../components/Button.jsx";
import SearchSubmitButton from "../../components/SearchSubmitButton.jsx";
import { SEMANTIC_SEARCH_SPECIES } from "../../constants/species.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SemanticSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [species, setSpecies] = useState(SEMANTIC_SEARCH_SPECIES[0]);
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
    <CollapsibleCard
      title="Semantic search"
      description="Look for annotated genes within our database. The result retrieval is based on AI."
      expanded={isExpanded}
      onToggle={toggleExpanded}
    >
      <div className="semantic-search__panel">
        <form onSubmit={handleSearch} className="semantic-search__form">
          {/* Species & result count */}
          <div className="semantic-search__filters">
            <div className="field">
              <label className="field__label" htmlFor="semantic-species">Species:</label>
              <select
                id="semantic-species"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="field__control"
              >
                {SEMANTIC_SEARCH_SPECIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="semantic-count">Number of results:</label>
              <input
                id="semantic-count"
                type="number"
                min="1"
                value={numberOfResults}
                onChange={(e) => setNumberOfResults(Number(e.target.value))}
                className="field__control field__control--number"
              />
            </div>
          </div>

          {/* Query bar + round search button */}
          <div className="search-row">
            <div className="search-pill">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="search-pill__input"
              />
            </div>
            <SearchSubmitButton disabled={isSearching} />
          </div>
          {error && <p className="semantic-search__error">{error}</p>}
        </form>

        {results.length > 0 && (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr className="results-table__head-row">
                  <th className="results-table__th semantic-search__col-quarter">Gene ID:</th>
                  <th className="results-table__th results-table__center semantic-search__col-quarter">Similarity score:</th>
                  <th className="results-table__th semantic-search__col-half">Description:</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res, idx) => (
                  <tr key={idx} className="results-table__row">
                    <td className="results-table__cell">{res.Gene}</td>
                    <td className="results-table__cell results-table__center">
                      {typeof res["Similarity score"] === "number"
                        ? res["Similarity score"].toFixed(2)
                        : res["Similarity score"]}
                    </td>
                    <td className="results-table__cell">{res.Description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: result counter + Copy menu and Close */}
        <div className="semantic-search__footer">
          <span className="semantic-search__result-count">
            Number of results: {results.length}
          </span>
          <div className="semantic-search__footer-actions">
            <div className="menu-anchor">
              <Button
                onClick={() => setShowCopyMenu((prev) => !prev)}
                disabled={results.length === 0}
              >
                <span>{copyStatus || "Copy..."}</span>
                <svg className="menu__icon" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </Button>

              {showCopyMenu && (
                <div className="menu menu--above">
                  <button type="button" className="menu__item" onClick={() => handleCopy("table")}>
                    Copy table
                  </button>
                  <button type="button" className="menu__item" onClick={() => handleCopy("ids")}>
                    Copy IDs only
                  </button>
                  <button type="button" className="menu__item" onClick={() => handleCopy("json")}>
                    Copy in JSON format
                  </button>
                </div>
              )}
            </div>

            <Button onClick={() => setIsExpanded(false)}>Close</Button>
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
