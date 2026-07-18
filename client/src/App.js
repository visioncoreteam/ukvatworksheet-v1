import { useState, useEffect } from 'react';
import Welcome from './Welcome';
import InstallExtension from './InstallExtension';
import TaxCodes from './TaxCodes';
import Reports from './Reports';
import AlertModal from './components/AlertModal';
import { useAlert } from './hooks/useAlert';
import { useBusinesses } from './hooks/useBusinesses';

const TABS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'extension', label: 'Extensions' },
  { key: 'taxcodes', label: 'Tax codes' },
];

function App() {
  const [isInIframe, setIsInIframe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExtensionPage, setIsExtensionPage] = useState(false);
  const [currentTab, setCurrentTab] = useState('welcome');
  const [selectedBusinessKey, setSelectedBusinessKey] = useState('');
  const { alert: alertState, closeAlert } = useAlert();
  const { businesses, loading: businessesLoading, loadBusinesses } = useBusinesses();

  async function fnCheckExtension() {
      const { postMessageWithResponse } = await import("./serverjs/managerFuncs.js");
     const formResponse = await postMessageWithResponse({
          type: 'page-request'
        });
     console.log('📋 FormResponse received:', formResponse);
     console.log('📋 Handler value:', formResponse?.handler);
     const handler = formResponse?.handler;
     console.log('📋 Final handler:', handler, 'Type:', typeof handler);
     console.log('📋 Handler length:', handler?.length);
     console.log('📋 Handler charCodes:', handler?.split('').map(c => c.charCodeAt(0)));
     console.log('📋 Handler === "Extensions":', handler === 'Extensions');
     console.log('📋 Handler.trim() === "Extensions":', handler?.trim?.() === 'Extensions');
     return handler;
  }
  
  useEffect(() => {
    const init = async () => {
      try {
        const inIframe = window.self !== window.top;
        setIsInIframe(inIframe);

        if (inIframe) {
          await loadBusinesses();

          const handler = await fnCheckExtension();
          setIsExtensionPage(handler?.trim?.() === 'Extensions');
        }

      } catch (error) {
        console.error('❌ Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadBusinesses]);

  useEffect(() => {
    if (!selectedBusinessKey && businesses.length > 0) {
      setSelectedBusinessKey(businesses[0].key);
    }
  }, [businesses, selectedBusinessKey]);

  const selectedBusiness = businesses.find((b) => b.key === selectedBusinessKey) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  // Outside of Manager's iframe there is nothing to show — this extension
  // only makes sense rendered inside the Manager UI.
  if (!isInIframe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm text-center">
          This extension is designed to run inside Manager Accounting.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <AlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={closeAlert}
      />

      <div className="max-w-4xl mx-auto">

        {isExtensionPage ? (
          <>
            {/* Header — country title + tab strip */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl leading-none">🇬🇧</span>
                <h1 className="text-2xl font-bold text-gray-900">United Kingdom</h1>
              </div>
              <div className="flex items-center gap-6 border-b border-gray-200">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCurrentTab(tab.key)}
                    className={`pb-3 text-sm font-medium transition-colors ${
                      currentTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Business selector — only needed for tabs that act on a single business */}
            {currentTab === 'taxcodes' && (
              <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <label htmlFor="business" className="block text-xs text-gray-500 mb-1">
                  Business
                </label>
                <select
                  id="business"
                  value={selectedBusinessKey}
                  onChange={(e) => setSelectedBusinessKey(e.target.value)}
                  disabled={businessesLoading || businesses.length === 0}
                  className="w-full sm:w-96 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                >
                  {businesses.length === 0 && <option value="">No businesses found</option>}
                  {businesses.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tab content */}
            {currentTab === 'welcome' && <Welcome />}
            {currentTab === 'extension' && <InstallExtension />}
            {currentTab === 'taxcodes' && <TaxCodes business={selectedBusiness} />}
          </>
        ) : (
          <Reports business={selectedBusiness} />
        )}
      </div>
    </div>
  );
}

export default App;
