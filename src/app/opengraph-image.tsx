import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #0b0f14 0%, #13202a 55%, #0f3d3a 100%)",
          color: "#f5f0e8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#5eead4",
            fontWeight: 700,
          }}
        >
          Social · Clips · Sparks
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1 }}>
            Pulse
            <span style={{ color: "#5eead4" }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              color: "#b8b2a6",
              maxWidth: 900,
              lineHeight: 1.25,
            }}
          >
            Create. Watch. Earn Sparks.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
