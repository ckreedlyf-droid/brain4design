"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ApiOk = {
  ok: true;
  b64: string;
  remainingToday?: number;
  dailyLimit?: number;
  cooldownSeconds?: number;
};

type ApiErr = {
  ok: false;
  error: string;
  code?: string;
  remainingToday?: number;
  dailyLimit?: number;
  cooldownSeconds?: number;
};

function isApiErr(x: ApiOk | ApiErr): x is ApiErr {
  return x.ok === false;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const cooldownTimer = useRef<number | null>(null);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const disabled = loading || cooldownLeft > 0;

  const startCooldown = (seconds: number) => {
    setCooldownLeft(seconds);
    if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);

    cooldownTimer.current = window.setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
    };
  }, []);

  const statusLine = useMemo(() => {
    if (dailyLimit != null && remainingToday != null) {
      return `Remaining today: ${remainingToday}/${dailyLimit}`;
    }
    return "Remaining today: —";
  }, [dailyLimit, remainingToday]);

  const generate = async () => {
    setLoading(true);
    setMessage(null);
    setImage(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "A modern minimalist flyer layout for a Sacramento real estate audience. Bold headline, clean grid, high-contrast CTA, print-ready, professional.",
          size: "1024x1536",
        }),
      });

      const data = (await res.json()) as ApiOk | ApiErr;

      // Update counters if present (both ok and err can include them)
      if (typeof data.remainingToday === "number") setRemainingToday(data.remainingToday);
      if (typeof data.dailyLimit === "number") setDailyLimit(data.dailyLimit);

      if (isApiErr(data)) {
        // Friendly messages
        if (data.code === "COOLDOWN" && typeof data.cooldownSeconds === "number") {
          startCooldown(data.cooldownSeconds);
          setMessage({ type: "info", text: data.error });
        } else if (data.code === "DAILY_LIMIT") {
          setMessage({ type: "error", text: data.error });
        } else {
          setMessage({ type: "error", text: data.error || "Something went wrong." });
        }

        setLoading(false);
        return;
      }

      // OK
      setImage(`data:image/png;base64,${data.b64}`);

      // Start cooldown after success
      const cd = typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 60;
      startCooldown(cd);

      setMessage({ type: "success", text: "Design generated. Scroll down to view." });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#e7ecff",
        padding: 24,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: -0.5 }}>Brain4Design</h1>
          <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.85 }}>
            Flyer + Newsletter studio with guardrails to control spend.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "1fr",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={generate}
              disabled={disabled}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: disabled ? "rgba(255,255,255,0.06)" : "rgba(120,140,255,0.20)",
                color: "#e7ecff",
                padding: "10px 14px",
                fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Generating..." : cooldownLeft > 0 ? `Cooldown (${cooldownLeft}s)` : "Generate Design"}
            </button>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                fontSize: 13,
                opacity: 0.9,
              }}
            >
              {statusLine}
            </div>

            <div style={{ fontSize: 13, opacity: 0.75 }}>Cooldown: 60s • Limit: 10/day per IP</div>
          </div>

          {message && (
            <div
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  message.type === "success"
                    ? "rgba(80,200,140,0.12)"
                    : message.type === "info"
                    ? "rgba(120,140,255,0.12)"
                    : "rgba(255,120,120,0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {message.type === "success" ? "Success" : message.type === "info" ? "Hold on" : "Error"}
              </div>
              <div style={{ opacity: 0.9, lineHeight: 1.4 }}>{message.text}</div>
            </div>
          )}

          {image && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                overflow: "hidden",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13,
                  opacity: 0.8,
                }}
              >
                Generated preview (PNG)
              </div>
              <div style={{ padding: 14 }}>
                <img
                  src={image}
                  alt="Generated design"
                  style={{
                    width: "100%",
                    maxWidth: 720,
                    height: "auto",
                    display: "block",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "#fff",
                  }}
                />
              </div>
            </div>
          )}
        </section>

        <footer style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>
          Tip: If you hit “Daily limit reached”, use /api/brief only and generate images tomorrow.
        </footer>
      </div>
    </main>
  );
}
