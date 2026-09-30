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
    <div className="report-modal">
      {/* Trigger text matching your UI screenshot */}
      <p className="report-modal__prompt">
        Did you find a weird annotation or a dysfunctional feature?{" "}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="report-modal__trigger"
        >
          Report it
        </button>{" "}
        to us and we will fix it.
      </p>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="report-modal__overlay">
          <div className="report-modal__dialog">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="report-modal__close-button"
            >
              ✕
            </button>

            <h3 className="report-modal__title">What's wrong?</h3>

            <form onSubmit={handleSubmit}>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Type here..."
                rows={5}
                className="report-modal__textarea"
              />

              {statusMessage && (
                <p className="report-modal__status">
                  {statusMessage}
                </p>
              )}

              <div className="report-modal__actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="report-modal__submit-button"
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