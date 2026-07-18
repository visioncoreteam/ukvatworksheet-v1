// Welcome tab content — intro copy shown on the extension's landing tab.

function Eyebrow({ children }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </span>
  );
}

function Welcome() {
  return (
    <div>
      {/* Intro */}
      <p className="text-gray-600 leading-relaxed mb-8">
        This extension helps United Kingdom businesses with the country's compliance reports
        and the tax codes those reports depend on.
      </p>

      {/* Reports */}
      <section className="mb-6">
        <div className="flex items-start gap-4 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
            📊
          </div>
          <div>
            <Eyebrow>Reports</Eyebrow>
            <p className="text-gray-600 leading-relaxed mt-1">
              Install country-specific reports (VAT/GST returns, payroll worksheets, and so on)
              into a business. Once installed, each report appears as a button on that
              business's <span className="font-medium text-gray-900">Reports</span> tab.
            </p>
          </div>
        </div>
      </section>

      {/* Tax codes */}
      <section className="mb-8">
        <div className="flex items-start gap-4 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-lg shrink-0">
            🏷️
          </div>
          <div>
            <Eyebrow>Tax codes</Eyebrow>
            <p className="text-gray-600 leading-relaxed mt-1">
              The country ships with a standard set of tax codes pre-linked to the reporting
              categories the reports use. From the{" "}
              <span className="font-medium text-gray-900">Tax codes</span> tab you can create
              any missing codes in a business with a single click, or update an existing code
              to attach the right reporting categories.
            </p>
          </div>
        </div>
      </section>

      <p className="text-gray-400 text-sm">
        Pick a business above, then switch to{" "}
        <span className="font-medium text-gray-500">Reports</span> or{" "}
        <span className="font-medium text-gray-500">Tax codes</span> to get started.
      </p>
    </div>
  );
}

export default Welcome;
