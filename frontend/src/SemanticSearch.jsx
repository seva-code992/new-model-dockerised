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
    <div className="w-full bg-white border-4 border-[#CCCCCC] p-6 shadow-lg relative transition-all">
      {/* Top Card Bar */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-black">Semantic search</h2>
          {!isExpanded && (
            <p className="text-gray-500 font-medium text-sm mt-2">
              Look for annotated genes within our database. The result retrieval is based on AI.
            </p>
          )}
        </div>
        <button
          onClick={toggleExpanded}
          className="text-[#0004FF] focus:outline-none"
          aria-label="Toggle Expand"
        >
          <svg
            viewBox="0 0 22 18"
            className={`w-5 h-5 transition-transform duration-200 ${
              isExpanded ? "" : "rotate-180"
            }`}
          >
            <path d="M2 2 L11 15 L20 2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="mt-6 flex flex-col gap-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            {/* Top Inputs: Species & Result count */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label className="font-bold text-sm text-black">Species:</label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="bg-[#E0E0E0] border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none"
                >
                  {SPECIES_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="font-bold text-sm text-black">Number of results:</label>
                <input
                  type="number"
                  min="1"
                  value={numberOfResults}
                  onChange={(e) => setNumberOfResults(Number(e.target.value))}
                  className="bg-[#E0E0E0] border border-gray-300 px-3 py-1.5 text-sm text-black w-20 text-center focus:outline-none"
                />
              </div>
            </div>

            {/* Search Input Bar with Glass Icon Button */}
            <div className="flex items-center gap-3 mt-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="flex-1 border border-black rounded-full px-6 py-2 text-sm text-black placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="w-10 h-10 rounded-full bg-[#62D0F6] border border-black flex items-center justify-center shadow-md hover:bg-[#4bc3eb] disabled:opacity-50"
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
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>

          {/* Results Table matching Figma layout */}
          {results.length > 0 && (
            <div className="border border-gray-300 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#D9D9D9] border-b border-gray-300 text-black text-sm font-bold">
                    <th className="p-3 w-1/4">Gene ID:</th>
                    <th className="p-3 w-1/4 text-center">Similarity score:</th>
                    <th className="p-3 w-2/4">Description:</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-200 bg-[#F9F9F9] hover:bg-gray-100 text-sm text-black"
                    >
                      <td className="p-3 font-normal">{res.Gene}</td>
                      <td className="p-3 text-center font-normal">
                        {typeof res["Similarity score"] === "number"
                          ? res["Similarity score"].toFixed(2)
                          : res["Similarity score"]}
                      </td>
                      <td className="p-3 font-normal">{res.Description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Controls: Results counter + Copy & Close buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-black font-medium">
              Number of results: {results.length}
            </span>
            <div className="flex gap-3">
              <div className="relative">
  <button
    type="button"
    onClick={() => setShowCopyMenu((prev) => !prev)}
    disabled={results.length === 0}
    className="bg-[#D9D9D9] hover:bg-gray-300 border border-gray-400 text-black px-4 py-1.5 text-sm shadow-sm disabled:opacity-50 flex items-center gap-1"
  >
    <span>{copyStatus || "Copy..."}</span>
    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showCopyMenu && (
    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-400 shadow-md z-10 flex flex-col">
      <button
        type="button"
        onClick={() => handleCopy("table")}
        className="text-left px-3 py-2 text-xs text-black hover:bg-gray-100 border-b border-gray-200"
      >
        Copy table
      </button>
      <button
        type="button"
        onClick={() => handleCopy("ids")}
        className="text-left px-3 py-2 text-xs text-black hover:bg-gray-100 border-b border-gray-200"
      >
        Copy IDs only
      </button>
      <button
        type="button"
        onClick={() => handleCopy("json")}
        className="text-left px-3 py-2 text-xs text-black hover:bg-gray-100"
      >
        Copy in JSON format
      </button>
    </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="bg-[#D9D9D9] hover:bg-gray-300 border border-gray-400 text-black px-4 py-1.5 text-sm shadow-sm"
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