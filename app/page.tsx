"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setImage(null);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "A modern minimalist logo design",
      }),
    });

    const data = await res.json();

    if (data.ok) {
      setImage(`data:image/png;base64,${data.b64}`);
    } else {
      alert(data.error || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Brain4Design</h1>
      <p>AI-powered design generator.</p>

      <button onClick={generate} disabled={loading}>
        {loading ? "Generating..." : "Generate Design"}
      </button>

      {image && (
        <div style={{ marginTop: 20 }}>
          <img src={image} alt="Generated design" width={400} />
        </div>
      )}
    </main>
  );
}
