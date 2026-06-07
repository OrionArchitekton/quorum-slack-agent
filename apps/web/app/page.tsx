export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Quorum — decision memory for your workspace</h1>
      <p>Quorum captures and recalls the decisions your team makes in Slack.</p>
      <p>
        <a href="/api/health">Health check</a>
      </p>
    </main>
  );
}
