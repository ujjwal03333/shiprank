import { ImageResponse } from "next/og";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const alt = "ShipRank scan result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

function gradeHex(grade: string): string {
  if (grade === "A+" || grade === "A") return "#3f7d52";
  if (grade === "B") return "#3d6e8c";
  if (grade === "C") return "#c08a1e";
  return "#b23b3b";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let projectName = "Unknown project";
  let score = 0;
  let grade = "F";

  if (isSupabaseConfigured()) {
    try {
      const db = getServiceClient();
      const { data } = await db
        .from("scans")
        .select("score, grade, projects ( name )")
        .eq("id", id)
        .single();
      if (data) {
        score = (data["score"] as number) ?? 0;
        grade = (data["grade"] as string) ?? "F";
        const proj = data["projects"] as { name?: string } | null;
        projectName = proj?.name ?? "Unknown project";
      }
    } catch {
      // serve default values on error
    }
  }

  const color = gradeHex(grade);
  const pct = `${score}%`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fbf7f1",
          padding: "0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Brand stripe */}
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: "#c4622d",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px 48px",
            gap: 0,
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#2b2419",
                letterSpacing: "-0.02em",
              }}
            >
              ShipRank
            </span>
          </div>

          {/* Main row: score block + project info */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 64,
              alignItems: "center",
              flex: 1,
            }}
          >
            {/* Score block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                minWidth: 160,
              }}
            >
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 500,
                  color: "#2b2419",
                  lineHeight: "1",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: 18,
                  color: "#8f8676",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                / 100
              </span>
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  backgroundColor: `${color}22`,
                  border: `1.5px solid ${color}55`,
                  borderRadius: 6,
                  padding: "4px 18px",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  Grade {grade}
                </span>
              </div>
            </div>

            {/* Right: project name + bar */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 24,
              }}
            >
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 600,
                  color: "#2b2419",
                  lineHeight: 1.3,
                }}
              >
                {projectName}
              </span>

              {/* Score bar */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: "#e4dacb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: pct,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: "#8f8676",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  quality · security · accessibility · performance
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 24,
            }}
          >
            <span
              style={{
                fontSize: 16,
                color: "#c4622d",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              shiprank.dev
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
