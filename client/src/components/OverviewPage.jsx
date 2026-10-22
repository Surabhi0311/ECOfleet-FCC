import React from 'react';
export function OverviewPage({
  data,
  user,
  goTo
}) {
  const numbers = data.dashboard || {};
  const nextStep = user.role === 'GENERATOR' ? 'Pickup requests' : user.role === 'DRIVER' ? 'My routes' : 'Route planning';
  return <>
    <section className="intro-card">
      <div><p className="eyebrow">TODAY'S OVERVIEW</p><h2>Hello, {user.name.split(' ')[0]}.</h2><p>Use the sections above to follow a pickup from request through disposal.</p></div>
      <button className="primary-button" onClick={() => goTo(nextStep)}>Continue to {nextStep}</button>
    </section>
    <section className="stats-grid" aria-label="Operational totals">
      <Stat label="Pickup requests" value={numbers.requests ?? '—'} />
      <Stat label="Active routes" value={numbers.activeRoutes ?? '—'} />
      <Stat label="Fleet vehicles" value={numbers.vehicles ?? '—'} />
      <Stat label="Material disposed" value={`${numbers.disposedKg ?? 0} kg`} />
    </section>
    <section className="panel">
      <h2>How ECOfleet works</h2>
      <ol className="workflow-list">
        <li><b>Request</b><span>A generator asks for one or more waste streams to be collected.</span></li>
        <li><b>Plan</b><span>An operator groups requests into routes and assigns vehicles.</span></li>
        <li><b>Collect</b><span>A driver records actual weights at each stop.</span></li>
        <li><b>Dispose</b><span>An operator records the approved facility and received weight.</span></li>
        <li><b>Report</b><span>The system totals requests and recovered material.</span></li>
      </ol>
    </section>
  </>;
}
function Stat({
  label,
  value
}) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>;
}
