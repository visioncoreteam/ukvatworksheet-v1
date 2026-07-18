import { useState, useEffect } from "react";
import AlertModal from "./components/AlertModal";
import { useAlert } from "./hooks/useAlert";


// ─── Extension definitions to install ────────────────────────────────────────
const EXTENSIONS = [
  {
    key: "fc5517da-20d6-4c6f-b600-dd2fb4c60ea9",
    name: "VAT Calculation Worksheet V2",
    placement: "reports",
    label: "VAT Calculation Worksheet V2",
  }
];

// Build query string for the batch check: Keys=<guid>&Keys=<guid>&Business=<name>
function buildBatchCheckPath(businessName) {
  const params = new URLSearchParams();
  EXTENSIONS.forEach((ext) => params.append("Keys", ext.key));
  params.append("Business", businessName);
  return `/api4/extension-batch?${params.toString()}`;
}

// ─── Install status per business: idle | checking | installed | loading | removing | error ──
function useInstallState() {
  const [statuses, setStatuses] = useState({});

  const setStatus = (bizKey, status) =>
    setStatuses((prev) => ({ ...prev, [bizKey]: status }));

  const getStatus = (bizKey) => statuses[bizKey] ?? "idle";

  return { getStatus, setStatus };
}

// ─── Action button — adapts to current status ─────────────────────────────────
function InstallButton({ status, onInstall, onRemove }) {
  const base =
    "min-w-[90px] px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";

  if (status === "checking") {
    return (
      <button disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>
        <span className="inline-block animate-spin mr-1">⏳</span> Checking…
      </button>
    );
  }

  if (status === "loading") {
    return (
      <button disabled className={`${base} bg-indigo-300 text-white cursor-not-allowed`}>
        <span className="inline-block animate-spin mr-1">⏳</span> Installing…
      </button>
    );
  }

  if (status === "removing") {
    return (
      <button disabled className={`${base} bg-red-300 text-white cursor-not-allowed`}>
        <span className="inline-block animate-spin mr-1">⏳</span> Removing…
      </button>
    );
  }

  if (status === "installed") {
    return (
      <button
        onClick={onRemove}
        className={`${base} bg-red-500 hover:bg-red-600 active:scale-95 text-white focus:ring-red-400`}
      >
        🗑 Remove
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        onClick={onInstall}
        className={`${base} bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400`}
      >
        ⚠ Retry
      </button>
    );
  }

  // idle — not installed
  return (
    <button
      onClick={onInstall}
      className={`${base} bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white focus:ring-indigo-400`}
    >
      Install
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function InstallExtension() {
  const { getStatus, setStatus } = useInstallState();
  const { alert, showAlert, closeAlert } = useAlert();
  const [businesses, setBusinesses] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // ── Load business list ──────────────────────────────────────────────────────
  const fnLoadBusinesses = async () => {
    setLoadingList(true);
    try {
      const { managerApi } = await import("./serverjs/managerFuncs.js");
      const response = await managerApi("GET", "/api4/businesses", null);
      const raw = response?.body?.businesses ?? [];

      const mapped = raw.map((item) => {
        const href = item?._links?.self?.href ?? "";
        const key = href.split("/").pop() || item.name;
        return { key, name: item.name };
      });

      setBusinesses(mapped);

      // After loading the list, check install status for each business
      mapped.forEach((biz) => fnCheckInstalled(biz));
    } catch (error) {
      console.error("Failed to load businesses:", error);
      showAlert(
        "Could not load businesses. Check your connection and try again.",
        "error",
        "❌ Load Failed"
      );
    } finally {
      setLoadingList(false);
    }
  };

  // ── Check if extensions are already installed for a given business ──────────
  const fnCheckInstalled = async (biz) => {
    setStatus(biz.key, "checking");
    try {
      const { managerApi } = await import("./serverjs/managerFuncs.js");
      const response = await managerApi("GET", buildBatchCheckPath(biz.name), null);
      const items = response?.body?.items ?? [];

      // Consider fully installed only if ALL extension keys are present in the result
      const installedKeys = new Set(items.map((i) => i.key));
      const allInstalled = EXTENSIONS.every((ext) => installedKeys.has(ext.key));

      setStatus(biz.key, allInstalled ? "installed" : "idle");
    } catch (error) {
      console.error(`Check install failed for "${biz.name}":`, error);
      setStatus(biz.key, "idle"); // fall back to idle so user can still try installing
    }
  };

  // ── Install both extensions for a business ──────────────────────────────────
  const handleInstall = async (biz) => {
    setStatus(biz.key, "loading");
    try {
      const { managerApi } = await import("./serverjs/managerFuncs.js");

      for (const ext of EXTENSIONS) {
        const payload = {
          key: ext.key,
          value: {
            name: ext.name,
            source: 0,                          // 0 = Endpoint (iframe)
            endpoint: process.env.REACT_APP_EXTENSION_URL || window.location.origin, // Extension URL
            placement: ext.placement,
            inactive: false,
            key: ext.key,
          },
          business: biz.name,
        };
        const response = await managerApi("PUT", "/api4/extension", payload);
        if (response?.body !== true) {
          throw new Error(
            `Failed to install ${ext.label} extension: ${JSON.stringify(response?.body)}`
          );
        }
      }

      setStatus(biz.key, "installed");
      showAlert(
        `Extensions installed successfully for "${biz.name}".`,
        "success",
        "✅ Installation Complete"
      );
    } catch (error) {
      console.error("Install error:", error);
      setStatus(biz.key, "error");
      showAlert(
        `Installation failed for "${biz.name}". ${error.message}`,
        "error",
        "❌ Installation Failed"
      );
    }
  };

  // ── Remove both extensions from a business ──────────────────────────────────
  const handleRemove = async (biz) => {
    setStatus(biz.key, "removing");
    try {
      const { managerApi } = await import("./serverjs/managerFuncs.js");

      for (const ext of EXTENSIONS) {
        const params = new URLSearchParams({ Key: ext.key, Business: biz.name });
        const response = await managerApi(
          "DELETE",
          `/api4/extension?${params.toString()}`,
          null
        );
        if (response?.body !== true) {
          throw new Error(
            `Failed to remove ${ext.label} extension: ${JSON.stringify(response?.body)}`
          );
        }
      }

      setStatus(biz.key, "idle");
      showAlert(
        `Extensions removed from "${biz.name}".`,
        "success",
        "🗑 Removal Complete"
      );
    } catch (error) {
      console.error("Remove error:", error);
      setStatus(biz.key, "error");
      showAlert(
        `Removal failed for "${biz.name}". ${error.message}`,
        "error",
        "❌ Removal Failed"
      );
    }
  };

  // Load on mount
  useEffect(() => {
    fnLoadBusinesses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Section title */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">
          UK - VAT Worksheet extension
        </h2>
        <button
          onClick={fnLoadBusinesses}
          disabled={loadingList}
          className="text-sm text-indigo-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingList ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Helps United Kingdom businesses with the country's compliance reports and the tax
        codes those reports depend on. Select a business below to install or remove it.
      </p>

      {/* Business list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
        {loadingList ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            <span className="inline-block animate-spin mr-2">⏳</span>
            Loading businesses…
          </div>
        ) : businesses.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No businesses found.{" "}
            <button
              onClick={fnLoadBusinesses}
              className="text-indigo-600 hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        ) : (
          businesses.map((biz) => {
            const status = getStatus(biz.key);
            return (
              <div
                key={biz.key}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-800 font-medium">{biz.name}</span>
                <InstallButton
                  status={status}
                  onInstall={() => handleInstall(biz)}
                  onRemove={() => handleRemove(biz)}
                />
              </div>
            );
          })
        )}
      </div>

      <AlertModal
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </div>
  );
}

export default InstallExtension;
