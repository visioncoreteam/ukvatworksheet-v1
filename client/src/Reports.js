// Reports tab content — VAT Calculation Worksheet filter bar for the
// currently selected business. Sample/placeholder for now, no functionality wired up yet.

function Reports({ business }) {
  return (
    <div>
      {!business ? (
        <p className="text-gray-500 text-sm">
          Pick a business above to see its available reports.
        </p>
      ) : (
        <>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            VAT Calculation Worksheet
          </h2>

          {/* Filter bar — Period / Quarter / Year / Accounting basis + Generate */}
          <div className="flex flex-wrap items-end gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col">
              <label htmlFor="period" className="text-xs text-gray-500 mb-1">
                Period
              </label>
              <select
                id="period"
                defaultValue="quarter"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="quarter">Quarter</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="quarter" className="text-xs text-gray-500 mb-1">
                Quarter
              </label>
              <select
                id="quarter"
                defaultValue="q2"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="q1">Q1 (Jan-Mar)</option>
                <option value="q2">Q2 (Apr-Jun)</option>
                <option value="q3">Q3 (Jul-Sep)</option>
                <option value="q4">Q4 (Oct-Dec)</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="year" className="text-xs text-gray-500 mb-1">
                Year
              </label>
              <select
                id="year"
                defaultValue="2026"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="accounting-basis" className="text-xs text-gray-500 mb-1">
                Accounting basis
              </label>
              <select
                id="accounting-basis"
                defaultValue="accrual"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="accrual">Accrual</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Generate
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
