# ✅ Gemini CLI Instruction Prompt

*(Refactor Empx UI into a standalone Swap Widget)*

---

## ROLE & GOAL

You are an **expert Web3 frontend engineer** refactoring an existing React + Wagmi DEX application into a **standalone embeddable swap widget**.

### Final Objective

At the end of this task, the codebase must:

* Contain **ONLY a swap application**
* Be deployable as a **standalone widget** at `widget.empx.io`
* Be fully functional:

  * Wallet connection
  * Token approvals
  * Quote fetching
  * Route display
  * Swap execution
* Be configurable **only via URL query parameters**
* Be safe to embed inside an **iframe**

You must **not break swap logic**, **wallet logic**, or **SmartRouter behavior**.

---

## HARD CONSTRAINTS (DO NOT VIOLATE)

### ❌ DO NOT:

* Rewrite swap logic from scratch
* Rewrite SmartRouter
* Remove wallet connection logic (wagmi / WalletConnect)
* Remove approval flow
* Change contract interaction behavior
* Introduce new routing systems
* Convert this into an npm package
* Add script-loader logic

### ✅ YOU MAY:

* Delete unused pages
* Delete unused components
* Simplify routing
* Remove navigation, headers, footers
* Remove non-swap features
* Add URL param parsing
* Move files if needed (but preserve logic)

---

## TARGET ARCHITECTURE (FINAL STATE)

```
src/
├── App.jsx                # renders swap widget directly
├── main.jsx
│
├── pages/
│   └── swap/              # ONLY remaining page
│       ├── Emp.jsx        # main swap logic (mostly unchanged)
│       ├── Token.jsx
│       ├── Amount.jsx
│       ├── Routing.jsx
│       ├── RoutingSplitModal.jsx
│       ├── SlippageCalculator.jsx
│       └── routerAbi.ts
│
├── widget/
│   └── useWidgetConfig.ts # URL-based config hook (NEW)
│
├── utils/
│   ├── services/
│   │   └── SmartRouter.ts # MUST remain unchanged
│   ├── contractCalls.ts
│   └── abis/
│
├── hooks/
│   ├── useChainConfig.ts
│   └── usePriceMonitor.ts (optional)
│
├── Wagmi/
│   ├── config.ts
│   └── WagmiProvider.jsx
│
└── components/
    ├── ui/
    ├── TokenLogo.tsx
    └── LoadingSpinner.jsx
```

---

## STEP 1 — REMOVE UNUSED FEATURES (SAFE DELETIONS)

### DELETE ENTIRE DIRECTORIES

```bash
src/pages/Home/
src/pages/bridge/
src/pages/via-bridge/
src/pages/limit-orders/
src/pages/nativeBridge.jsx
src/pages/GasBridgePage.jsx
src/components/gas/
```

These features **must not exist** in the final widget:

* NFT marketplace
* Any bridge
* Limit orders
* Gas bridge
* Landing/home pages

---

### DELETE UNUSED COMPONENTS

```bash
src/components/ActivityChart.jsx
src/components/ActivityRow.jsx
src/components/ActivityTable.jsx
src/components/CollectionDetail.jsx
src/components/CollectionDetailTable.jsx
src/components/CollectionTable.jsx
src/components/ItemDetailActivity.jsx
src/components/ItemDetails.jsx
src/components/MarketPlaceWallet.jsx
src/components/UserCard.jsx
```

---

### DELETE UNUSED SERVICES & CONFIGS

```bash
src/utils/via-bridge-abis/
src/utils/services/rangoApiServices.js
src/pages/chainsList.json
src/pages/adapters.json
```

---

## STEP 2 — SIMPLIFY ROUTING

### Goal

The app must **always load swap**, regardless of path.

### REQUIRED RESULT

* `/` → swap
* `*` → redirect to `/`
* No navbar
* No breadcrumb
* No tabs except swap

### Action

Simplify or remove React Router so that `App.jsx` directly renders the swap page.

---

## STEP 3 — ADD WIDGET CONFIG VIA URL PARAMS

### Create a NEW hook:

**File:** `src/widget/useWidgetConfig.ts`

```ts
export const useWidgetConfig = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    chain: params.get('chain') || 'pulsechain',
    theme: params.get('theme') || 'dark',
    background: params.get('background') || '#000000',
    primaryColor: params.get('primaryColor') || '#01e401',

    defaultTokenIn: params.get('from'),
    defaultTokenOut: params.get('to'),

    lockTokenIn: params.get('lockFrom') === 'true',
    lockTokenOut: params.get('lockTo') === 'true',

    feePercent: Number(params.get('feePercent') || '0'),
    referrer: params.get('referrer'),
  };
};
```

---

## STEP 4 — INTEGRATE CONFIG INTO SWAP (MINIMAL CHANGE)

### In `Emp.jsx` (or equivalent):

* Read widget config via `useWidgetConfig()`
* Apply:

  * Theme
  * Primary color
  * Default tokens
  * Token locks
  * Fee percent → SmartRouter
* **DO NOT** refactor swap logic
* **ONLY inject configuration values**

Example:

```ts
const config = useWidgetConfig();
```

---

## STEP 5 — REMOVE NON-SWAP UI

### Remove:

* Limit order tabs
* Header navigation
* Footer navigation
* Breadcrumbs

### Keep:

* Slippage settings
* Route visualization
* Errors
* Loading states

---

## STEP 6 — ENSURE WALLET SUPPORT REMAINS

### MUST KEEP:

* Wagmi config
* WalletConnect
* Injected wallets
* Approval logic
* Chain switching

### The widget must:

* Work inside an iframe
* Allow wallet connection
* Execute swaps normally

---

## STEP 7 — ENSURE IFRAME SAFETY

Verify:

* No `window.top` access
* No forced full-screen layouts
* No `position: fixed` overlays blocking parent page
* Scroll works within iframe height

---

## STEP 8 — FINAL VALIDATION CHECKLIST

Before finishing, verify:

✅ Swap loads on `/`
✅ Wallet connects
✅ Token approval works
✅ Quote fetching works
✅ Route is displayed
✅ Swap executes
✅ URL params control behavior
✅ App works inside iframe

---

## FINAL OUTPUT EXPECTATION

At the end, the project should support:

```html
<iframe
  src="https://widget.empx.io?
    chain=pulsechain
    &theme=dark
    &from=WPLS
    &to=USDC
    &feePercent=0.3"
  width="400"
  height="700">
</iframe>
```

---

## IMPORTANT MINDSET FOR GEMINI

> **This is a reduction and isolation task, not a rewrite.**
> Preserve working swap logic at all costs.
> Remove everything else.

---
