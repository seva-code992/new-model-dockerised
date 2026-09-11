import React, { useState } from "react";

function ReportModal({ currentSpecies = "", currentQuery = "" }) {
      const [isOpen, setIsOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_description: reportText,
          species: currentSpecies,
          query: currentQuery,
          current_url: window.location.href,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");

      setStatusMessage("Report sent! Thank you.");
      setReportText("");
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage("");
      }, 1500);
    } catch (err) {
      console.error("Report error:", err);
      setStatusMessage("Error sending report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 text-center">
      {/* Trigger text matching your UI screenshot */}
      <p className="text-sm font-medium text-blue-700">
        Did you find a weird annotation or a dysfunctional feature?{" "}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="underline font-semibold hover:text-blue-900"
        >
          Report it
        </button>{" "}
        to us and we will fix it.
      </p>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md relative border border-gray-300 text-left">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-black font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold mb-3 text-black">What's wrong?</h3>

            <form onSubmit={handleSubmit}>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Type here..."
                rows={5}
                className="w-full p-3 border border-gray-400 rounded focus:outline-none focus:border-purple-600 text-black text-sm resize-none"
              />

              {statusMessage && (
                <p className="text-xs font-semibold my-2 text-purple-700">
                  {statusMessage}
                </p>
              )}

              <div className="mt-4 flex justify-start">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-1.5 bg-[#A0A0FF] text-black font-semibold text-sm rounded shadow hover:bg-purple-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportModal;