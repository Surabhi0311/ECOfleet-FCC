import React, { useState } from 'react';
export function RoutesPage({
  routes,
  requests,
  role,
  perform
}) {
  const isDriver = role === 'DRIVER';
  const pendingCount = requests.filter(request => request.status === 'Pending').length;
  return <>
    {!isDriver && <section className="panel planning-panel">
      <div><h2>Plan a collection day</h2><p>{pendingCount} pending request(s) are ready for assignment.</p></div>
      <form onSubmit={event => {
        event.preventDefault();
        perform('/routes/plan', {
          date: event.currentTarget.date.value
        });
      }}>
        <label>Service date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
        <button className="primary-button" disabled={!pendingCount}>Generate routes</button>
      </form>
    </section>}
    <section className="panel">
      <div className="section-heading"><div><h2>{isDriver ? 'My assigned routes' : 'Planned routes'}</h2><p>Each route contains the pickup stops in order.</p></div></div>
      {routes.map(route => <RouteCard key={route._id} route={route} isDriver={isDriver} perform={perform} />)}
      {!routes.length && <p className="empty-state">No routes yet. Plan a service day after requests arrive.</p>}
    </section>
  </>;
}
function RouteCard({
  route,
  isDriver,
  perform
}) {
  return <article className="route-card">
    <header className="route-heading"><div><b>{route.vehicle?.registration || 'Vehicle not assigned'}</b><span>{route.driver?.name || 'Unassigned driver'} · {new Date(route.date).toLocaleDateString()}</span></div><span className="status-label">{route.status}</span></header>
    <ol className="stop-list">{route.stops?.map(stop => <Stop key={stop._id} route={route} stop={stop} isDriver={isDriver} perform={perform} />)}</ol>
  </article>;
}
function Stop({
  route,
  stop,
  isDriver,
  perform
}) {
  const path = `/routes/${route._id}/stops/${stop._id}`;
  async function complete() {
    const items = stop.request?.items || [];
    const weights = items.map(item => prompt(`Actual kg for ${item.category?.name || 'waste'}:`, item.estimatedKg || 0));
    if (weights.some(weight => weight === null)) return;
    await perform(path, {
      action: 'complete',
      actualKg: weights.map(Number)
    }, 'PATCH');
  }
  return <li className="stop-row">
    <div><b>{stop.request?.generator?.name || 'Pickup stop'}</b><span>{stop.request?.items?.map(item => item.category?.name).filter(Boolean).join(', ')}</span><small>Stop {stop.sequence} · {stop.status}</small></div>
    {isDriver && <div className="stop-actions">
      {stop.status === 'Pending' && <><button className="small-button" onClick={() => perform(path, {
          action: 'arrive'
        }, 'PATCH')}>Arrived</button><button className="small-button" onClick={() => {
          const reason = prompt('Why is this stop being skipped?');
          if (reason) perform(path, {
            action: 'skip',
            reason
          }, 'PATCH');
        }}>Skip</button></>}
      {stop.status === 'In Progress' && <button className="primary-button" onClick={complete}>Complete and record weight</button>}
    </div>}
  </li>;
}
