/**
 * blockchain-bridge.js
 * ---------------------------------------------
 * STEP 3 of the real-blockchain conversion.
 * Include this AFTER app.js in index.html:
 *   <script src="/app.js"></script>
 *   <script src="/blockchain-bridge.js"></script>
 *
 * This does NOT rewrite your app.js. It patches the two places that were
 * faking blockchain data (this.generateHash() and this.decisionLogs.unshift)
 * so they call the real Express bridge server (server/index.js) instead,
 * which talks to the real deployed smart contracts.
 *
 * Change BACKEND_URL once you deploy server/index.js somewhere reachable
 * (localhost:4000 while testing, your real server URL in production).
 */
const BACKEND_URL = "http://localhost:4000";

(function patchOrganTwinApp() {
  // Wait for the app instance the same way app.js creates it
  document.addEventListener("DOMContentLoaded", () => {
    // app.js should expose the instance as window.app — if it uses a
    // different variable name, change `window.app` below to match.
    const app = window.app;
    if (!app) {
      console.warn("blockchain-bridge.js: couldn't find the OrganTwinApp instance (window.app). Check what variable app.js stores it in and update this file.");
      return;
    }

    const originalHandleDonorSubmit = app.handleDonorSubmit.bind(app);

    // Replace the fake registration flow with a real on-chain one.
    app.handleDonorSubmit = async function (event) {
      event.preventDefault();

      const fullName = document.getElementById("donorFullName")?.value.trim();
      const age = parseInt(document.getElementById("donorAge")?.value, 10);
      const bloodGroup = document.getElementById("donorBloodGroup")?.value;
      const region = document.getElementById("donorRegion")?.value;
      const organ = document.getElementById("donorOrgan")?.value;

      if (!fullName || isNaN(age) || !bloodGroup || !region || !organ) {
        this.showToast("Please fill out all required donor fields.", "error");
        return;
      }

      this.showToast("Submitting to blockchain — please confirm in MetaMask if prompted...", "info");

      try {
        // 1. Mint a real on-chain identity token for this patient (blocks double-listing for real)
        const registerRes = await fetch(`${BACKEND_URL}/api/patients/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: fullName + age + bloodGroup }), // swap for real Aadhaar/UID field later
        });
        const registerData = await registerRes.json();

        if (!registerRes.ok) {
          this.showToast(registerData.error || "Registration failed on-chain.", "error");
          return;
        }

        // 2. Append a real block to the immutable ledger for this action
        const ledgerRes = await fetch(`${BACKEND_URL}/api/ledger/append`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordData: { fullName, age, bloodGroup, region, organ },
            action: `DONOR REGISTERED ON-CHAIN: ${fullName} donated ${organ}.`,
            clauseRef: "THOA Section 5 & NOTTO Decentralized Allocation Protocol",
          }),
        });
        const ledgerData = await ledgerRes.json();

        if (!ledgerRes.ok) {
          this.showToast(ledgerData.error || "Ledger write failed.", "error");
          return;
        }

        // 3. Feed the REAL block data into the existing UI rendering (no UI changes needed)
        this.decisionLogs.unshift({
          blockNumber: ledgerData.blockNumber,
          timestamp: new Date().toLocaleString(),
          action: `DONOR REGISTERED ON-CHAIN: ${fullName} (${organ}). Token: ${registerData.identityHash.slice(0, 10)}...`,
          clause: "THOA Section 5 & NOTTO Decentralized Allocation Protocol",
          prevHash: ledgerData.prevHash,
          currHash: ledgerData.currHash,
          status: "VALIDATED",
          txHash: ledgerData.txHash,
          explorerUrl: ledgerData.explorerUrl, // real PolygonScan link — show this in the UI!
        });

        this.saveState();
        this.renderDecisionLogs();
        this.updateHeaderMetrics();

        this.showToast(`Registered on real blockchain! Tx: ${ledgerData.txHash.slice(0, 10)}...`, "success");
      } catch (err) {
        console.error(err);
        this.showToast("Could not reach blockchain server. Is server/index.js running?", "error");
      }
    };

    // --- Also replace the ledger reader so the Decision Log tab shows the REAL chain ---
    const originalRenderDecisionLogs = app.renderDecisionLogs.bind(app);
    app.loadRealLedgerFromChain = async function () {
      try {
        const res = await fetch(`${BACKEND_URL}/api/ledger`);
        const data = await res.json();
        this.decisionLogs = data.blocks.reverse(); // newest first, matches existing UI expectation
        originalRenderDecisionLogs();
      } catch (err) {
        console.warn("Could not load real ledger, falling back to local state:", err);
      }
    };

    // Pull the real chain state once on load
    app.loadRealLedgerFromChain();

    console.log("✅ blockchain-bridge.js loaded — donor registration and decision log now use the real smart contracts.");
  });
})();
