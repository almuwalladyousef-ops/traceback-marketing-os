export default function Loading() {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      minHeight: 300,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "2.5px solid var(--border-strong)",
        borderTopColor: "var(--accent)",
        animation: "spin 0.7s linear infinite",
      }}/>
    </div>
  );
}
