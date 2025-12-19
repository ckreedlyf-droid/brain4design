"use client";

import { useMemo, useState } from "react";

type SizeOption = "512x512" | "1024x1024";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("A modern minimalist logo design");
  const [size, setSize] = useState<SizeOption>("1024x1024");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple anti-spam cooldown (client-side)
  const COOLDOWN_MS = 10_000; // 10 seconds
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const canGenerate = useMemo(() => {
    const now = Date.now();
    return !loading && now >= cooldownUntil && prompt.trim().length > 0;
  }, [loading, cooldownUntil, prompt]);

  const remainingCooldown = useMemo(() => {
    const now = Date.now();
    return Math.max(0, cooldownUntil - now);
  }, [cooldownUntil]);

  const generate = async () => {
    if (!canGenerate) return;

    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg =
          data?.error ||
          `Failed to generate image (HTTP ${res.status || "?"})`;
        setError(msg);
        alert(msg);
        return;
      }

      // data.b64 expected
      setImage(`data:image/png;base64,${data.b64}`);

      // Start cooldown after a successful call
      setCooldownUntil(Date.now() + COOLDOWN_MS);
    } catch (e: any) {
      const msg = e?.message || "Network error. Please try again.";
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = "brain4design.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const clear = () => {
    setImage(null);
    setError(null);
  };

  return (
    <main style={{ padding: 40, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>Brain4Design</h1>
      <p style={{ marginTop: 0, marginBottom: 18 }}>
        AI-powered design generator.
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr",
          marginBottom: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe what you want (e.g., minimalist monogram logo, black and white, circular badge)"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Size</span>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as SizeOption)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              disabled={loading}
            >
              <option value="512x512">512 × 512 (faster/cheaper)</option>
              <option value="1024x1024">1024 × 1024 (sharper)</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
            <button
              onClick={generate}
              disabled={!canGenerate}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: canGenerate ? "#111" : "#888",
                color: "#fff",
                cursor: canGenerate ? "pointer" : "not-allowed",
              }}
            >
              {loading
                ? "Generating..."
                : remainingCooldown > 0
                ? `Cooldown ${Math.ceil(remainingCooldown / 1000)}s`
                : "Generate"}
            </button>

            <button
              onClick={clear}
              disabled={loading && !image}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Clear
            </button>

            <button
              onClick={download}
              disabled={!image}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: image ? "#fff" : "#f4f4f4",
                cursor: image ? "pointer" : "not-allowed",
              }}
            >
              Download PNG
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #f3c2c2",
              background: "#fff5f5",
              color: "#8a1f1f",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {image ? (
        <div
          style={{
            marginTop: 18,
            border: "1px solid #ddd",
            borderRadius: 14,
            padding: 16,
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>
            Preview
          </div>
          <img
            src={image}
            alt="Generated design"
            style={{
              width: "100%",
              maxWidth: 720,
              height: "auto",
              display: "block",
              borderRadius: 12,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            marginTop: 18,
            border: "1px dashed #ddd",
            borderRadius: 14,
            padding: 24,
            background: "#fafafa",
            color: "#666",
          }}
        >
          No image yet. Enter a prompt and click Generate.
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        Tip: Use 512×512 while testing, then switch to 1024×1024 for final.
      </div>
    </main>
  );
}
