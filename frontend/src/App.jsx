import React from 'react'
import SemanticSearch from './SemanticSearch.jsx'
import KeywordSearch from './KeywordSearch.jsx'
import ReportModal from './ReportModal.jsx'
import GraphMaker from './GraphMaker.jsx'

export default function App() {
  return (
    <div className="app">
      {/* PlantGenIE Logo / Badge */}
      <div className="app__badge">
        PlantGenIE
      </div>

      {/* Main Page Heading */}
      <h1 className="app__title">
        Search your genes
      </h1>

      {/* Container forced to fixed 771px width so all boxes are identical */}
      <div className="app__content">
        {/* Card 1: Semantic Search */}
        <SemanticSearch />

        {/* Card 2: Keyword Search */}
        <KeywordSearch />

        {/* Card 3: Verify your results */}
        <div className="app__verify-card">
          <div>
            <h2 className="app__verify-title">
              Verify your results
            </h2>
            <p className="app__verify-note">
              Feature is under development - Not usable yet.
            </p>
          </div>
        </div>

        {/* Card 4: Graph maker */}
        <GraphMaker />

        {/* Footer Report Section */}
        <ReportModal />
      </div>
    </div>
  );
}