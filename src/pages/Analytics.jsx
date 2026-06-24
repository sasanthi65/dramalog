import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut } from "../lib/supabase";
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#feca57'];

export default function Analytics({ user, showToast }) {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("2020");
  const [dateTo, setDateTo] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const loadDramas = async () => {
      setLoading(true);
      const { data, error } = await getDramas();
      if (!error) {
        setDramas(data || []);
      } else {
        showToast("Failed to load dramas", "error");
      }
      setLoading(false);
    };

    loadDramas();
  }, [showToast]);

  // Filter dramas by date range
  const filteredDramas = dramas.filter(d => {
    if (!d.year_watched) return false;
    const year = parseInt(d.year_watched.split("-")[0]);
    return year >= parseInt(dateFrom) && year <= parseInt(dateTo);
  });

  // Calculate stats
  const totalDramas = filteredDramas.length;
  const avgRating = filteredDramas.filter(d => d.rating).length > 0
    ? (filteredDramas.reduce((sum, d) => sum + (d.rating || 0), 0) / filteredDramas.filter(d => d.rating).length).toFixed(1)
    : 0;

  // Genre breakdown
  const genreCount = {};
  filteredDramas.forEach(d => {
    if (d.genres && d.genres.length > 0) {
      d.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });
  const topGenre = Object.keys(genreCount).length > 0
    ? Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0][0]
    : "No data";

  // Data for charts
  const dramatsByYear = {};
  const ratingsByYear = {};
  const ratingCountsByYear = {};

  filteredDramas.forEach(d => {
    if (!d.year_watched) return;
    const year = d.year_watched.split("-")[0];
    
    dramatsByYear[year] = (dramatsByYear[year] || 0) + 1;
    
    if (d.rating) {
      ratingsByYear[year] = (ratingsByYear[year] || 0) + d.rating;
      ratingCountsByYear[year] = (ratingCountsByYear[year] || 0) + 1;
    }
  });

  const yearChartData = Object.entries(dramatsByYear)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({
      year,
      count,
      avgRating: ratingCountsByYear[year] ? (ratingsByYear[year] / ratingCountsByYear[year]).toFixed(1) : 0
    }));

  const genreChartData = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({
      name: genre,
      value: count
    }));

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "info");
    navigate("/login");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #f0f2f8 100%)"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "24px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)"
      }}>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "600", margin: "0" }}>DramaLog</h1>
            <p style={{ fontSize: "12px", margin: "4px 0 0", opacity: 0.9 }}>Analytics Dashboard</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/watchlist")}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.4)",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            ← Watchlist
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.4)",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Date range filter */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          gap: "16px",
          alignItems: "flex-end",
          flexWrap: "wrap"
        }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#666" }}>
              From Year
            </label>
            <input
              type="number"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              min="2000"
              max="2100"
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                width: "120px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#666" }}>
              To Year
            </label>
            <input
              type="number"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min="2000"
              max="2100"
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                width: "120px"
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", color: "#999", margin: "0" }}>
              📊 Showing {filteredDramas.length} dramas
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              display: "inline-block",
              width: "40px",
              height: "40px",
              border: "4px solid #f0f0f0",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ fontSize: "16px", color: "#999", marginTop: "16px" }}>Loading analytics...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "32px"
            }}>
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <p style={{ fontSize: "13px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>
                  Total Dramas
                </p>
                <p style={{ fontSize: "32px", fontWeight: "700", color: "#667eea", margin: "0" }}>
                  {totalDramas}
                </p>
              </div>

              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <p style={{ fontSize: "13px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>
                  Avg Rating
                </p>
                <p style={{ fontSize: "32px", fontWeight: "700", color: "#ffc107", margin: "0" }}>
                  ★ {avgRating}
                </p>
              </div>

              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <p style={{ fontSize: "13px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>
                  Top Genre
                </p>
                <p style={{ fontSize: "24px", fontWeight: "700", color: "#764ba2", margin: "0" }}>
                  {topGenre}
                </p>
              </div>

              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <p style={{ fontSize: "13px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>
                  Rated Dramas
                </p>
                <p style={{ fontSize: "32px", fontWeight: "700", color: "#43e97b", margin: "0" }}>
                  {filteredDramas.filter(d => d.rating).length}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "24px" }}>
              {/* Bar Chart - Dramas per year */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#1a1a1a" }}>
                  📺 Dramas Watched Per Year
                </h3>
                {yearChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={yearChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>No data for selected range</p>
                )}
              </div>

              {/* Pie Chart - Genre breakdown */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#1a1a1a" }}>
                  🎬 Genre Breakdown
                </h3>
                {genreChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genreChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} (${value})`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genreChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>No data for selected range</p>
                )}
              </div>

              {/* Line Chart - Average rating per year */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                gridColumn: "1 / -1"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px", color: "#1a1a1a" }}>
                  ⭐ Average Rating Over Time
                </h3>
                {yearChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={yearChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgRating"
                        stroke="#ffc107"
                        strokeWidth={2}
                        connectNulls
                        name="Avg Rating"
                        dot={{ fill: "#ffc107", r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>No data for selected range</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
