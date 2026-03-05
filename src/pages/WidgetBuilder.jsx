import { useMemo, useState } from "react";
import { DEFAULT_WIDGET_CONFIG } from "../widget/useWidgetConfig";

const WidgetBuilder = () => {
  const [chain, setChain] = useState(DEFAULT_WIDGET_CONFIG.chain);
  const [background, setBackground] = useState(
    DEFAULT_WIDGET_CONFIG.background,
  );
  const [primaryColor, setPrimaryColor] = useState(
    DEFAULT_WIDGET_CONFIG.primaryColor,
  );
  const [borderColor, setBorderColor] = useState(
    DEFAULT_WIDGET_CONFIG.borderColor,
  );
  const [integratorId, setIntegratorId] = useState("");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [width, setWidth] = useState(450);
  const [height, setHeight] = useState(900);
  const [copied, setCopied] = useState("");

  // Truncate address to show first 6 and last 6 characters
  const truncateAddress = (address) => {
    if (!address || address.length <= 14) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (chain.trim()) {
      params.set("chain", chain.trim());
    }
    params.set("background", background);
    params.set("primaryColor", primaryColor);
    params.set("borderColor", borderColor);

    if (integratorId.trim()) {
      params.set("integratorId", integratorId.trim());
    }
    if (tokenIn.trim()) {
      params.set("from", tokenIn.trim());
    }
    if (tokenOut.trim()) {
      params.set("to", tokenOut.trim());
    }

    const baseUrl = window.location.origin;
    return `${baseUrl}/?${params.toString()}`;
  }, [
    chain,
    background,
    primaryColor,
    borderColor,
    integratorId,
    tokenIn,
    tokenOut,
  ]);

  const iframeCode = useMemo(() => {
    return `<iframe
  src="${widgetUrl}"
  allow="clipboard-read; clipboard-write"
  width="${width}"
  height="${height}"
  frameborder="0"
></iframe>`;
  }, [widgetUrl, width, height]);

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch (error) {
      setCopied("Failed");
      setTimeout(() => setCopied(""), 1500);
    }
  };

  const handleReset = () => {
    setChain(DEFAULT_WIDGET_CONFIG.chain);
    setBackground(DEFAULT_WIDGET_CONFIG.background);
    setPrimaryColor(DEFAULT_WIDGET_CONFIG.primaryColor);
    setBorderColor(DEFAULT_WIDGET_CONFIG.borderColor);
    setIntegratorId("");
    setTokenIn("");
    setTokenOut("");
    setWidth(450);
    setHeight(900);
  };

  const backgroundPickerValue =
    background.trim().length >= 7 ? background.trim().slice(0, 7) : "#000000";
  const primaryPickerValue =
    primaryColor.trim().length >= 7
      ? primaryColor.trim().slice(0, 7)
      : "#e49c01";

  const borderPickerValue =
    borderColor.trim().length >= 7 ? borderColor.trim().slice(0, 7) : "#ffffff";

  return (
    <div
      className="min-h-screen text-white px-6 py-10"
      style={{
        background:
          "radial-gradient(1200px circle at 12% 12%, rgba(228, 156, 1, 0.22), rgba(0, 0, 0, 0) 55%), linear-gradient(180deg, #120a00 0%, #000000 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-2 mb-10">
          <div className="text-sm uppercase tracking-[0.35em] text-white/60">
            EmpX Widget Builder
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">
            Craft a customized embed URL in seconds
          </h1>
          <p className="text-white/70 max-w-2xl">
            Configure colors, chain, and integrator ID. We generate a
            ready-to-embed iframe URL and a live preview without changing widget
            runtime behavior.
          </p>
          <p className="text-white/70 max-w-2xl">
            Join our integrator program to unlock revenue sharing and advanced
            features. Build your own revenue stream by tailoring integrations to
            new protocols, memes, and emerging communities. For more details
            visit{" "}
            <a
              href="https://docs.empx.io/docs/developers/widget-integration"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white transition font-semibold"
            >
              docs.empx.io
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] gap-8">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur overflow-hidden min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Configuration</h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs uppercase tracking-[0.25em] text-white/60 hover:text-white transition"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              <label className="flex flex-col gap-2 text-sm text-white/80">
                Chain
                <input
                  type="text"
                  value={chain}
                  onChange={(event) => setChain(event.target.value)}
                  placeholder={DEFAULT_WIDGET_CONFIG.chain}
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white w-full"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/80">
                Primary Color
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryPickerValue}
                    onChange={(event) =>
                      setPrimaryColor(`${event.target.value}ff`)
                    }
                    className="h-10 w-12 rounded-lg border border-white/10 bg-black/70 shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                    placeholder="#e49c01ff"
                    className="flex-1 bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white w-full min-w-0"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/80">
                Background
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundPickerValue}
                    onChange={(event) => setBackground(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-white/10 bg-black/70 shrink-0"
                  />
                  <input
                    type="text"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    placeholder={DEFAULT_WIDGET_CONFIG.background}
                    className="flex-1 bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white w-full min-w-0"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/80">
                Border Color
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={borderPickerValue}
                    onChange={(event) => setBorderColor(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-white/10 bg-black/70 shrink-0"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(event) => setBorderColor(event.target.value)}
                    placeholder={DEFAULT_WIDGET_CONFIG.borderColor}
                    className="flex-1 bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white w-full min-w-0"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
                Integrator ID (optional)
                <input
                  type="text"
                  value={integratorId}
                  onChange={(event) => setIntegratorId(event.target.value)}
                  placeholder="0x..."
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white w-full"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/80 min-w-0">
                Token In (optional)
                <input
                  type="text"
                  value={truncateAddress(tokenIn)}
                  onChange={(event) => setTokenIn(event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault();
                    const pastedText = event.clipboardData.getData("text");
                    setTokenIn(pastedText);
                  }}
                  placeholder="0x... token address"
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono w-full focus:outline-none focus:border-white/30"
                  title={tokenIn}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/80 min-w-0">
                Token Out (optional)
                <input
                  type="text"
                  value={truncateAddress(tokenOut)}
                  onChange={(event) => setTokenOut(event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault();
                    const pastedText = event.clipboardData.getData("text");
                    setTokenOut(pastedText);
                  }}
                  placeholder="0x... token address"
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono w-full focus:outline-none focus:border-white/30"
                  title={tokenOut}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <label className="flex flex-col gap-2 text-sm text-white/80">
                Iframe Width
                <input
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  min={280}
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/80">
                Iframe Height
                <input
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                  min={560}
                  className="bg-black/70 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="bg-black/70 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
                  Widget URL
                  <button
                    type="button"
                    onClick={() => handleCopy(widgetUrl, "URL")}
                    className="text-white/70 hover:text-white transition"
                  >
                    {copied === "URL" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-2 text-sm text-white break-all">
                  {widgetUrl}
                </div>
              </div>

              <div className="bg-black/70 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
                  Iframe Embed
                  <button
                    type="button"
                    onClick={() => handleCopy(iframeCode, "Embed")}
                    className="text-white/70 hover:text-white transition"
                  >
                    {copied === "Embed" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-2 text-sm text-white whitespace-pre-wrap break-all overflow-x-auto">
                  {iframeCode}
                </pre>
              </div>

              <a
                href={widgetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full bg-white text-black rounded-lg py-3 font-semibold hover:bg-white/90 transition"
              >
                Open widget in new tab
              </a>
            </div>
          </div>

          <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live Preview</h2>
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                widget.empx.io
              </span>
            </div>
            <div
              className="rounded-2xl overflow-hidden border border-white/10 mx-auto"
              style={{
                height: `${height}px`,
                width: `${width}px`,
                maxWidth: "100%",
              }}
            >
              <iframe
                title="EmpX Widget Preview"
                src={widgetUrl}
                width="100%"
                height="100%"
                allow="clipboard-read; clipboard-write"
                frameBorder="0"
              />
            </div>
            <p className="text-xs text-white/60">
              Preview reflects your config parameters only. On production
              embeds, the widget behavior stays unchanged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetBuilder;
