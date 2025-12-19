"use client";

import { useState } from "react";

type Result = {
  title: string;
  style: string;
  flyerB64: string | null;
  newsletterB64: string | null;
  flyerPrompt: string;
  newsletterPrompt: string;
};

export default function Home() {
  const [form, setForm] = useState({
    audience: "Seller",
    locationScope: "Sacramento, CA",
    eventType: "Open House Weekend",
    brandMode: "SAC Platinum branded",
    foldType: "Single page",
    qrPlacement: "Bottom-right",
    monthTheme: "Market Momentum"
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");

      setResults(data.results || []);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Brain4Design</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Generate 2 unique design directions with images (Flyer A4 + Newsletter).
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
          maxWidth: 760,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 12
        }}
      >
        <label>
          Audience
          <select
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            <option>Seller</option>
            <option>Buyer</option>
            <option>Realtor</option>
            <option>All</option>
          </select>
        </label>

        <label>
          Location Scope
          <input
            value={form.locationScope}
            onChange={(e) => setForm({ ...form, locationScope: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>

        <label>
          Event Type (Flyer)
          <input
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>

        <label>
          Brand Mode
          <select
            value={form.brandMode}
            onChange={(e) => setForm({ ...form, brandMode: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            <option>SAC Platinum branded</option>
            <option>Agent-personalized</option>
            <option>Neutral</option>
          </select>
        </label>

        <label>
          Fold Type
          <select
            value={form.foldType}
            onChange={(e) => setForm({ ...form, foldType: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            <option>Single page</option>
            <option>Bi-fold</option>
            <option>Tri-fold</option>
          </select>
        </label>

        <label>
          QR Placement
          <select
            value={form.qrPlacement}
            onChange={(e) => setForm({ ...form, qrPlacement: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            <option>Bottom-right</option>
            <option>Bottom band</option>
            <option>Top-right</option>
            <option>Back page (tri-fold)</option>
          </select>
        </label>

        <label>
          Newsletter Theme of the Month
          <input
            value={form.monthTheme}
            onChange={(e) => setForm({ ...form, monthTheme: e.target.value })}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Generating (4 images)..." : "Generate 2 Design Directions"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Note: This makes 4 image generations per click (costs credits).
        </div>

        {error && (
          <div style={{ color: "crimson", fontWeight: 600 }}>
            Error: {error}
          </div>
        )}
      </div>

      <div style={{ marginTop: 22, display: "grid", gap: 18 }}>
        {results.map((r, idx) => (
          <section
            key={idx}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 16
            }}
          >
            <h2 style={{ margin: 0 }}>{r.title}</h2>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Style: {r.style}</div>

            <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
              <div>
                <h3 style={{ marginBottom: 8 }}>Flyer</h3>
                {r.flyerB64 ? (
                  <img
                    src={`data:image/png;base64,${r.flyerB64}`}
                    alt={`${r.title} flyer`}
                    style={{ width: "100%", maxWidth: 900, borderRadius: 12, border: "1px solid #eee" }}
                  />
                ) : (
                  <div style={{ opacity: 0.7 }}>No flyer image returned.</div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: 8 }}>Newsletter</h3>
                {r.newsletterB64 ? (
                  <img
                    src={`data:image/png;base64,${r.newsletterB64}`}
                    alt={`${r.title} newsletter`}
                    style={{ width: "100%", maxWidth: 900, borderRadius: 12, border: "1px solid #eee" }}
                  />
                ) : (
                  <div style={{ opacity: 0.7 }}>No newsletter image returned.</div>
                )}
              </div>

              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Show prompts (for Angeline)</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{r.flyerPrompt}</pre>
                <pre style={{ whiteSpace: "pre-wrap" }}>{r.newsletterPrompt}</pre>
              </details>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
