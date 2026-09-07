import React, { useState } from "react";

const SPECIES_OPTIONS = [ // UPDATED: Exact strings matching FastAPI enum values
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
  const [species, setSpecies] = useState(SPECIES_OPTIONS[0]); // UPDATED: Renamed state to 'species'
  const [query, setQuery] = useState("");
  const [numberOfResults, setNumberOfResults] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Enter a description of the gene you're looking for.");
      return;
    }
    setError("");
    setIsSearching(true);
    setResults([]);

    try {      
      const url = `${API_BASE_URL}/Search/?species=${encodeURIComponent(
        species // UPDATED: Variable now exists cleanly in component state
      )}&query=${encodeURIComponent(query)}&number_of_results=${numberOfResults}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned error code: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Search fetch error:", err);
      setError("Something went wrong while searching. Please verify the backend is running.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className="flex flex-col items-start p-2.5 gap-2.5 isolate w-[771px]
        bg-[#D9D9D9] shadow-[inset_2px_2px_5.5px_6px_rgba(0,0,0,0.25)]"
    >
      <div
        className={`relative w-[751px] bg-white ${
          isExpanded ? "h-auto" : "h-[150px]"
        }`}
      >
        {/* Title */}
        <h3
          className="absolute left-[38px] top-[46px] h-[17px] flex items-center
            font-['Archivo'] font-bold text-base leading-[17px] tracking-[0.1em]
            text-black z-[1]"
        >
          Semantic search
        </h3>

        {/* Description */}
        <p
          className="absolute left-[38px] right-[35px] top-[85px] h-[29px] flex items-center
            font-['Archivo'] font-bold text-[13px] leading-[14px] tracking-[0.1em]
            text-[#787676] z-[2]"
        >
          Look for annotated genes within our database. The result retrieval is
          based on AI.
        </p>

        {/* Expand / collapse button */}
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-controls="semantic-search-panel"
          aria-label={isExpanded ? "Collapse semantic search" : "Expand semantic search"}
          className="absolute left-[697px] top-[122px] w-[22px] h-[18px] z-[3]
            flex items-center justify-center focus:outline-none
            focus-visible:ring-2 focus-visible:ring-[#0004FF] focus-visible:ring-offset-1"
        >
          <svg
            viewBox="0 0 22 18"
            className={`w-full h-full drop-shadow-[0px_4px_4px_rgba(0,0,0,0.25)]
              transition-transform duration-200 ${isExpanded ? "" : "rotate-180"}`}
          >
            <path
              d="M2 2 L11 15 L20 2"
              fill="none"
              stroke="#0004FF"
              strokeWidth="1"
            />
          </svg>
        </button>

        {/* Expanded panel */}
        {isExpanded && (
          <div
            id="semantic-search-panel"
            className="relative pt-[150px] px-[38px] pb-8 flex flex-col gap-4"
          >
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="semantic-species"
                  className="font-['Archivo'] font-bold text-[11px] tracking-[0.1em] text-[#787676]"
                >
                  Species
                </label>
                <select
                  id="semantic-species"
                  value={species} // UPDATED: Bound to 'species' state
                  onChange={(e) => setSpecies(e.target.value)} // UPDATED: Bound to 'setSpecies'
                  className="border border-[#D9D9D9] px-3 py-2 text-sm font-['Archivo']
                    text-black focus:outline-none focus:border-[#0004FF]"
                >
                  {SPECIES_OPTIONS.map((item) => ( // UPDATED: Iterating SPECIES_OPTIONS
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="semantic-query"
                  className="font-['Archivo'] font-bold text-[11px] tracking-[0.1em] text-[#787676]"
                >
                  Describe the gene you're looking for
                </label>
                <textarea
                  id="semantic-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                  placeholder="e.g. hydrolase"
                  className="border border-[#D9D9D9] px-3 py-2 text-sm font-['Archivo']
                    text-black resize-none focus:outline-none focus:border-[#0004FF]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="semantic-num-results"
                  className="font-['Archivo'] font-bold text-[11px] tracking-[0.1em] text-[#787676]"
                >
                  Number of results
                </label>
                <input
                  id="semantic-num-results"
                  type="number"
                  min="1"
                  max="50"
                  value={numberOfResults}
                  onChange={(e) => setNumberOfResults(Number(e.target.value))}
                  className="border border-[#D9D9D9] px-3 py-2 text-sm font-['Archivo']
                    text-black w-28 focus:outline-none focus:border-[#0004FF]"
                />
              </div>

              {error && (
                <p className="text-sm text-[#FF0000] font-['Archivo']">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSearching}
                className="self-start bg-[#42AC46] text-black font-['Archivo'] font-medium
                  tracking-[0.1em] px-6 py-2 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSearching ? "Searching…" : "Search"}
              </button>
            </form>

            {results.length > 0 && (
              <ul className="flex flex-col gap-2 border-t border-[#D9D9D9] pt-4">
                {results.map((result, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col gap-0.5 border border-[#D9D9D9] px-3 py-2 bg-gray-50"
                  >
                    <span className="font-['Archivo'] font-bold text-sm text-black">
                      {result.Gene}
                    </span>
                    <span className="font-['Archivo'] text-[13px] text-[#787676]">
                      {result.Description}
                    </span>
                    <span className="font-['Archivo'] text-[11px] text-[#787676]">
                      Similarity Score: {(result["Similarity score"] * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}