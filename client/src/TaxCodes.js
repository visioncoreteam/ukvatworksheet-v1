// Tax codes tab content — lists the standard tax codes for the selected
// business and lets the user create/update them. Sample/placeholder for now.

function TaxCodes({ business }) {
  return (
    <div>
      {!business ? (
        <p className="text-gray-500 text-sm">
          Pick a business above to see its tax codes.
        </p>
      ) : (
        <>
          <p className="text-gray-600 leading-relaxed mb-6">
            Tax codes for{' '}
            <span className="font-medium text-gray-900">{business.name}</span>.
          </p>

          {/* Placeholder tax code rows — real tax code list wired up later */}
          <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Rate</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-gray-900">Standard Rate</td>
                  <td className="px-4 py-3 text-gray-600">20%</td>
                  <td className="px-4 py-3 text-green-600">Linked</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-blue-600 hover:underline">
                      Update
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-900">Reduced Rate</td>
                  <td className="px-4 py-3 text-gray-600">5%</td>
                  <td className="px-4 py-3 text-amber-600">Missing</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-blue-600 hover:underline">
                      Create
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-900">Zero Rate</td>
                  <td className="px-4 py-3 text-gray-600">0%</td>
                  <td className="px-4 py-3 text-green-600">Linked</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-blue-600 hover:underline">
                      Update
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default TaxCodes;
