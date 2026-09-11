import React from 'react'
import SemanticSearch from './SemanticSearch.jsx'
import KeywordSearch from './KeywordSearch.jsx'
import ReportModal from './ReportModal.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-[#E2FAD4] py-10 px-4 flex flex-col items-center gap-8 font-['Archivo']">
      {/* PlantGenIE Logo / Badge */}
      <div className="self-start ml-12 bg-[#52B768] text-black font-bold text-xl px-4 py-2 rounded-sm shadow-md">
        PlantGenIE
      </div>

      {/* Main Page Heading */}
      <h1 className="text-3xl font-bold text-black tracking-wide my-2">
        Search your genes
      </h1>

      {/* Container forced to fixed 771px width so all boxes are identical */}
      <div className="w-full max-w-[771px] flex flex-col gap-6 items-stretch">
        {/* Card 1: Semantic Search */}
        <SemanticSearch />

        {/* Card 2: Keyword Search */}
        <KeywordSearch />

        {/* Card 3: Verify your results */}
        <div className="w-full bg-white border-4 border-[#CCCCCC] p-6 shadow-lg relative flex flex-col justify-between min-h-[150px]">
          <div>
            <h2 className="text-[16px] font-bold tracking-[0.1em] text-black mb-2">
              Verify your results
            </h2>
            <p className="text-red-600 font-bold text-xs tracking-[0.1em] mt-4">
              Feature is under development - Not usable yet.
            </p>
          </div>
        </div>

        {/* Footer Report Section */}
        <ReportModal />
      </div>
    </div>
  );
}