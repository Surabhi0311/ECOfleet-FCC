import React, { useState } from 'react';

const IST = 'Asia/Kolkata';
function todayInIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}
function formatPickupDateTime(value) {
  if (!value) return 'Flexible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST, dateStyle: 'medium', timeStyle: 'short'
  }).format(date) + ' IST';
}
export function RequestsPage({
  requests,
  catalog,
  role,
  perform
}) {
  const [creating, setCreating] = useState(false);
  const canCreate = role === 'GENERATOR' || role === 'ADMIN' || role === 'OPERATOR';
  return <>
    <section className="panel">
      <div className="section-heading"><div><h2>Pickup requests</h2><p>Requests move to the route planner when the operator plans a service day.</p></div>
        {canCreate && <button className="primary-button" onClick={() => setCreating(!creating)}>{creating ? 'Close form' : 'New request'}</button>}
      </div>
      {creating && <RequestForm categories={catalog.categories || []} perform={perform} />}
      <div className="table-scroll"><table><thead><tr><th>Generator</th><th>Waste streams</th><th>Weight</th><th>Preferred pickup</th><th>Status</th><th></th></tr></thead>
        <tbody>{requests.map(request => <RequestRow key={request._id} request={request} perform={perform} />)}
          {!requests.length && <tr><td colSpan="6" className="empty-cell">No requests yet.</td></tr>}
        </tbody></table></div>
    </section>
  </>;
}
function RequestForm({ categories, perform }) {
  const [items, setItems] = useState([{ category: '', weight: '' }]);
  const [date, setDate] = useState(todayInIST());
  const [time, setTime] = useState('09:00');
  const [scheduleError, setScheduleError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const dateValue = String(form.get('date') || '');
    const timeValue = String(form.get('time') || '');
    // HTML date/time inputs are interpreted explicitly as India Standard Time.
    const pickupDateTime = new Date(`${dateValue}T${timeValue}:00+05:30`);
    if (!dateValue || !timeValue || Number.isNaN(pickupDateTime.getTime()) || pickupDateTime.getTime() <= Date.now()) {
      setScheduleError('Choose a pickup date and time in the future (India Standard Time).');
      return;
    }
    setScheduleError('');
    const result = await perform('/requests', {
      items: items.map(item => ({ category: item.category, estimatedKg: Number(item.weight) })),
      preferredDate: pickupDateTime.toISOString(),
      notes: form.get('notes'),
    });
    if (result) {
      formElement.reset();
      setItems([{ category: '', weight: '' }]);
      setDate(todayInIST());
      setTime('09:00');
    }
  }

  function update(index, field, value) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  return <form className="request-form" onSubmit={submit}>
    <div className="two-column">
      <label>Preferred pickup date<input name="date" type="date" required min={todayInIST()} value={date} onChange={event => { setDate(event.target.value); setScheduleError(''); }} /></label>
      <label>Preferred pickup time (IST)<input name="time" type="time" required value={time} onChange={event => { setTime(event.target.value); setScheduleError(''); }} /></label>
      <label>Notes<input name="notes" placeholder="Optional collection details" /></label>
    </div>
    {scheduleError && <p className="form-error" role="alert">{scheduleError}</p>}
    <h3>Waste streams</h3>
    {items.map((item, index) => <div className="waste-row" key={index}>
      <label>Category<select required value={item.category} onChange={event => update(index, 'category', event.target.value)}><option value="">Choose category</option>{categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
      <label>Estimated kg<input type="number" min="0.1" step="0.1" required value={item.weight} onChange={event => update(index, 'weight', event.target.value)} /></label>
      {items.length > 1 && <button type="button" className="small-button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
    </div>)}
    <div className="form-buttons"><button type="button" className="secondary-button" onClick={() => setItems(current => [...current, { category: '', weight: '' }])}>Add waste stream</button><button className="primary-button">Submit request</button></div>
  </form>;
}

function RequestRow({
  request,
  perform
}) {
  const weight = request.items?.reduce((total, item) => total + (item.estimatedKg || 0), 0) || 0;
  const categories = request.items?.map(item => item.category?.name).filter(Boolean).join(', ') || '—';
  return <tr>
    <td>{request.generator?.name || 'Generator'}<small>{request.generator?.type}</small></td>
    <td>{categories}</td><td>{weight} kg</td>
    <td>{formatPickupDateTime(request.preferredDate)}</td>
    <td><span className="status-label">{request.status}</span></td>
    <td>{['Pending', 'Planned'].includes(request.status) && <button className="small-button" onClick={() => perform(`/requests/${request._id}/cancel`, {}, 'PATCH')}>Cancel</button>}</td>
  </tr>;
}
