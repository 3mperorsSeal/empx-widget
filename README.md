# EmpX Widget Integration Guide

This guide provides comprehensive instructions for integrating the EmpX Swap Widget into your application. The widget is designed to be easily embedded via an standard HTML `<iframe>`.

## 1. Quick Start

Embed the widget using the following iframe code. You can adjust the `width` and `height` to fit your layout.

```html
<iframe
  src="https://widget.empx.io/?primaryColor=%23e49c01&background=%23000000&chain=pulsechain"
  allow="clipboard-read; clipboard-write"
  width="450"
  height="900"
  frameborder="0"
></iframe>
```

---

## 2. Configuration Parameters

The widget behavior and appearance can be customized using URL search parameters.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `chain` | `string` | `pulsechain` | The initial blockchain network to load. Supported: `pulsechain`. |
| `background` | `hex` | `#000000` | The main background color (hex code). |
| `primaryColor` | `hex` | `#e49c01ff` | The primary accent color for buttons and highlights (hex code). |
| `integratorId` | `string` | `null` | Your unique Integrator ID (bytes32 hex). If provided, enables fee sharing. |

### Color Customization Example
To match a "Blue & Navy" brand identity:
```
https://widget.empx.io/?primaryColor=%233b82f6&background=%230f172a
```
*Note: Any hex color code should be URL-encoded (e.g., `#` becomes `%23`).*

---

## 3. Integrator Program

The EmpX Integrator Program allows partners to earn per transaction revenue by hosting the swap widget.

### Registration Process
To register as an integrator and obtain your `integratorId`, please contact the EmpX team with the following details:

1.  **Protocol Name**: Name of your project.
2.  **Contact Details**: E-mail, Discord, X (Twitter), Telegram, and Website.
3.  **Registration Data**: Provide the configuration for your preferred fee model.

#### Registration Configuration Examples

**Option A: Split Model (Revenue Sharing)**
*You split the standard protocol fee with EmpX.*
```text
beneficiary (wallet address): 0x530C---------aDd9
feePercent:  This is fixed (50/50 split of the protocol fee)
model:       Split Model
```

**Option B: Additive Fee Model (Extra Fee)**
*You charge an additional fee on top of the swap.*
```text
beneficiary (wallet address): 0x530C---------aDd9
feePercent:  ex.30 (0.30% additional fee) upto 1% i.e 100
model:       Additive Fee Model
```

Once registered, you will be provided with a unique **Integrator ID**.
> Example ID: `0x366b7ad069b00d2882bfbf40e341bb020d8c55bc20ac1de3ed7ceee0445cf079`

### Integrator ID Usage
To participate, you must pass your unique `integratorId` in the widget URL. 
- The ID is a **bytes32** hex string.
- If omitted, the widget defaults to a "direct user" mode with no extra integrator fees.

```html
<iframe
  src="https://widget.empx.io/?integratorId=0x366b7ad069b00d2882bfbf40e341bb020d8c55bc20ac1de3ed7ceee0445cf079"
></iframe>
```

### Revenue Models

> **Note**: Specific fee percentages and tiers are configured at the contract level and may vary based on your agreement.

#### 1. Additive Fee Model
In this model, an additional fee is added on top of the swap execution.
- **Mechanism**: The user sees a slightly higher slippage/fee impact to account for the integrator's cut.
- **Client Impact**: The widget automatically adjusts the protection buffer from **0.5%** (standard) to **1.0%** to accommodate the additive fee without causing failed transactions.
- **Earnings**: You earn the entire additive portion.

#### 2. Fee Split / Revenue Sharing
- **Mechanism**: The standard protocol fee is split between the EmpX protocol and the integrator.
- **Requirements**: Requires whitelisting of specific contract configuration for your `integratorId`.
- **Earnings**: A percentage of the protocol fee (e.g., 50/50 split).

#### 3. Fee Percentage Limits
- **Max Cap**: There is a hard cap on the total fee percentage that can be charged to prevent user impact (typically capped at 3% max total slippage + fee).
- **Dynamic Fees**: Stablecoin pairs may have lower hard caps (e.g., 0.15% base) compared to volatile pairs (0.28% base).