import React from 'react'
import SemanticSearch from './features/semantic-search/SemanticSearch.jsx'
import KeywordSearch from './features/keyword-search/KeywordSearch.jsx'
import ReportModal from './features/report/ReportModal.jsx'
import GraphMaker from './features/graph-maker/GraphMaker.jsx'

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
        <section className="card">
          <h2 className="card__title">Verify your results</h2>
          <p className="app__verify-note">
            Feature is under development - Not usable yet.
          </p>
        </section>

        {/* Card 4: Graph maker */}
        <GraphMaker />

        {/* Footer Report Section */}
        <ReportModal />
      </div>
    </div>
  );
}