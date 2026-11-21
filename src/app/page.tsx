export default function Home() {
  return (
    <main className="container">
      <p className="eyebrow">Team workspace · foundation</p>
      <h1>Solar Installation Management System</h1>
      <p className="description">
        A shared starting point for the customer journey and company operations.
      </p>
      <section className="notice" aria-labelledby="status-heading">
        <h2 id="status-heading">Project status</h2>
        <p>
          The app and local database are scaffolded. Enquiries, staff workflows,
          authentication and the dashboard have not been implemented yet.
        </p>
      </section>
      <p className="hint">See the README and project specs for setup and workstreams.</p>
    </main>
  );
}
