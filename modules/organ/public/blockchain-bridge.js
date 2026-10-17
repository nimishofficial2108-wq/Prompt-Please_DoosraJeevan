/**
 * blockchain-bridge.js
 * ---------------------------------------------
 * Blockchain bridge for DoosraJeevan (demo by default; optional real Polygon testnet).
 * Connects to same-origin /api/blockchain proxy. Local simulation unless on-chain mode configured.
 */
const BLOCKCHAIN_BRIDGE_URL = "/api/blockchain";

(function initDoosraBlockchainBridge() {
  document.addEventListener("DOMContentLoaded", () => {
    // Retry polling briefly until window.app is instantiated
    let attempts = 0;
    const checkAppInterval = setInterval(() => {
      attempts++;
      const app = window.app;
      if (app) {
        clearInterval(checkAppInterval);
        attachBridge(app);
      } else if (attempts > 30) {
        clearInterval(checkAppInterval);
        console.warn("blockchain-bridge.js: window.app not detected within timeout.");
      }
    }, 100);
  });

  function attachBridge(app) {
    console.log("Attaching blockchain bridge (local demo or optional Polygon Amoy)...");

    // Load real on-chain ledger from Polygon Amoy
    app.loadRealLedgerFromChain = async function () {
      try {
        const res = await fetch(`${BLOCKCHAIN_BRIDGE_URL}/ledger`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.blocks && data.blocks.length > 0) {
          if (data.mode !== "onchain") console.info("Local demonstrator ledger only; not an on-chain transaction.");
          console.log(`Loaded ${data.blocks.length} ${data.mode === "onchain" ? "on-chain" : "local demo"} events.`);
          // Format blocks for Doosra Jeevan UI
          const realBlocks = data.blocks.map(b => ({
            blockNumber: Number(b.block_number),
            timestamp: new Date(b.timestamp).toLocaleString(),
            action: b.action,
            clause: b.clause || "THOA Statutory Allocation Protocol",
            prevHash: b.prev_hash,
            currHash: b.curr_hash,
            mintingNode: data.mode === "onchain" ? `${(b.submitted_by || "").slice(0, 8)}... (Polygon Amoy)` : "Local simulated ledger",
            status: data.mode === "onchain" ? "VALIDATED" : "DEMO",
            onChain: data.mode === "onchain",
            explorerUrl: data.mode === "onchain" && b.submitted_by ? `https://amoy.polygonscan.com/address/${b.submitted_by}` : null
          })).reverse(); // newest first

          // Prepend real on-chain blocks to decision logs
          app.decisionLogs = [...realBlocks, ...app.decisionLogs.filter(d => !d.onChain)];
          app.renderDecisionLogs();
          app.updateHeaderMetrics();
        }
      } catch (err) {
        console.info("Blockchain bridge offline. Demo UI remains available; no verified transactions.");
      }
    };

    // Replace fake registration flow with a real on-chain one
    const originalHandleDonorSubmit = app.handleDonorSubmit.bind(app);
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

      this.showToast("Saving educational demo record to the ledger…", "info");

      try {
        // 1. Check/Mint real on-chain identity token (blocks double-listing on-chain)
        const registerRes = await fetch(`${BLOCKCHAIN_BRIDGE_URL}/patients/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: `${fullName}_${age}_${bloodGroup}` }),
          signal: AbortSignal.timeout(10000)
        });

        if (registerRes.status === 409) {
          this.showToast("Duplicate demo identifier blocked by ledger. Use a different synthetic test record.", "error");
          return;
        }
        if (!registerRes.ok) {
          const error = await registerRes.json().catch(() => ({}));
          throw new Error(error.error || `Ledger registration HTTP ${registerRes.status}`);
        }

        // 2. Append real block to the immutable ledger on-chain
        const ledgerRes = await fetch(`${BLOCKCHAIN_BRIDGE_URL}/ledger/append`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordData: { organ, bloodGroup, region, donorAlias: "SYNTHETIC_DEMO" },
            action: `Prototype donor record created (${organ})`,
            clauseRef: "THOA Section 5 & NOTTO Decentralized Allocation Protocol",
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!ledgerRes.ok) {
          const error = await ledgerRes.json().catch(() => ({}));
          throw new Error(error.error || `Ledger write HTTP ${ledgerRes.status}`);
        }
        {
          const ledgerData = await ledgerRes.json();
          this.decisionLogs.unshift({
            mode: ledgerData.mode,
            blockNumber: Number(ledgerData.blockNumber),
            timestamp: new Date().toLocaleString(),
            action: `Prototype donor record (${organ}) — ${ledgerData.mode === "onchain" ? "Polygon Amoy" : "LOCAL DEMO"}`,
            clause: "THOA Section 5 & NOTTO Decentralized Allocation Protocol",
            prevHash: ledgerData.prevHash,
            currHash: ledgerData.currHash,
            status: ledgerData.mode === "onchain" ? "VALIDATED" : "DEMO",
            txHash: ledgerData.txHash || "",
            explorerUrl: ledgerData.explorerUrl,
            onChain: ledgerData.mode === "onchain"
          });
          this.showToast(ledgerData.mode === "onchain" ? `Polygon Amoy transaction confirmed: #${ledgerData.blockNumber}` : `Local demo ledger event #${ledgerData.blockNumber} saved (NOT on-chain)`, "success");
        }
      } catch (err) {
        console.warn("Blockchain bridge unavailable; continuing with original educational demo only:", err);
        this.showToast("Ledger unavailable: " + (err.message || "request failed") + ". Demo UI is not a confirmed registration.", "error");
        return;
      }

      // Execute the educational matching UI ONLY AFTER the demo ledger write succeeds.
      originalHandleDonorSubmit(event);
    };

    // Load ledger on boot
    app.loadRealLedgerFromChain();
    console.log("Blockchain bridge ready; use status endpoint to confirm whether chain transactions are enabled.");
  }
})();
