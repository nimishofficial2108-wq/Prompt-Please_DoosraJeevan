# Doosra Jeevan — Real Blockchain Layer

Ye folder tumhare `Doosra-Jeevan` repo ke fake/simulated blockchain (jo `public/data.js` me hardcoded hai) ko **real, deployed, verifiable smart contracts** se replace karta hai — Polygon Amoy testnet pe, bilkul free.

## Kya milega isse
- `contracts/DoosraLedger.sol` — real append-only hash-chained ledger (jo `data.js` ke fake "Block #14895 / prevHash / currHash" ko replace karta hai)
- `contracts/PatientIdentityToken.sol` — real ERC-721 NFT minting (jo "unique hex identity token" simulation ko replace karta hai)
- `server/index.js` — Express backend jo frontend ke calls ko real chain transactions me convert karta hai
- Deploy script jo dono contracts ko live testnet pe daal deta hai, PolygonScan pe verifiable

## Step-by-step (30-45 min total, koi paise nahi lagenge)

### 1. Dependencies install karo
```bash
cd doosra-blockchain
npm install
```

### 2. MetaMask wallet banao (agar nahi hai)
- [metamask.io](https://metamask.io) install karo, naya wallet banao
- **Sirf testnet ke liye ek NAYA wallet use karo, apna real wallet nahi**
- MetaMask me "Polygon Amoy Testnet" network add karo: Settings → Networks → Add Network → search "Polygon Amoy"

### 3. Free testnet MATIC lo (gas fees ke liye, real paise nahi)
- Wallet address copy karo MetaMask se
- Faucet: https://faucet.polygon.technology/ (Amoy select karo) ya https://www.alchemy.com/faucets/polygon-amoy
- 1-2 min me free testnet tokens aa jayenge

### 4. `.env` file banao
```bash
cp .env.example .env
```
- MetaMask se **private key export** karo (Account details → Show private key) aur `.env` me `PRIVATE_KEY=` ke aage paste karo
- `HASH_SALT` ko koi bhi random string se replace karo

### 5. Contracts compile karo
```bash
npm run compile
```

### 6. Deploy karo Amoy testnet pe
```bash
npm run deploy:amoy
```
Terminal me do contract addresses aayenge — inhe `.env` me `LEDGER_CONTRACT_ADDRESS` aur `PATIENT_NFT_CONTRACT_ADDRESS` me paste kardo. Ye addresses PolygonScan pe bhi verify kar sakte ho: `https://amoy.polygonscan.com/address/<address>`

### 7. Backend server chalao
```bash
npm run server
```
Ye `localhost:4000` pe REST API dega jo real blockchain se baat karega.

### 8. Apne existing `Doosra-Jeevan` app.js ko is server se connect karo
Abhi `public/app.js` me jahan bhi `data.js` se fake decision-log / hash / patient data read ho raha hai, uski jagah `fetch('http://localhost:4000/api/ledger')` jaisa call daalo. Main tumhare exact `app.js` functions dekh ke ye integration bhi likh sakta hoon — bata dena kaunsa function replace karna hai (jaise `renderDecisionLog()`, `mintPatientToken()` waghera jo already `public/app.js` me maujood hain).

## AI Studio prompt (agar Gemini se aage continue karwana hai)

Ye prompt AI Studio me paste karo jab tum is scaffold ko apne existing app se jodna chaho:

> "I have an Express backend running at http://localhost:4000 with these real endpoints: POST /api/patients/register, POST /api/ledger/append, GET /api/ledger, POST /api/ledger/flag-anomaly. Update the existing public/app.js so that instead of reading hardcoded blockchain data from data.js, it calls these live endpoints and renders the real blockNumber, prevHash, currHash, and txHash (with a PolygonScan link) it gets back. Keep all existing UI/CSS classes exactly the same — only replace the data source."

## Important honesty note (judges/demo ke liye)

"9-node PBFT consensus simulation" jo abhi UI me hai, wo ab actual **Polygon network ke real validators** (100+ nodes) se replace ho jata hai jab deploy karte ho — ye technically stronger claim hai, animation ko "Live validator confirmation" jaisa label kar sakte ho honestly.
