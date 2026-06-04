import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 100px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Brand pill */}
        <div
          style={{
            background: "#f97316",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "8px 24px",
            borderRadius: 100,
            marginBottom: 40,
          }}
        >
          THE NEWBIE
        </div>

        {/* Main headline */}
        <div
          style={{
            color: "#ffffff",
            fontSize: 88,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1,
            marginBottom: 32,
          }}
        >
          AI Made for
          <br />
          the Gym.
        </div>

        {/* Subheadline */}
        <div
          style={{
            color: "#9ca3af",
            fontSize: 28,
            textAlign: "center",
            maxWidth: 760,
            lineHeight: 1.5,
            marginBottom: 56,
          }}
        >
          Personalised workout plans, daily meal plans &amp; AI coaching —
          built for beginners.
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["Workout Plans", "Meal Plans", "AI Coach", "Free Forever"].map((label) => (
            <div
              key={label}
              style={{
                background: "#1c1c1c",
                border: "1px solid #333",
                color: "#e5e7eb",
                fontSize: 18,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 12,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
