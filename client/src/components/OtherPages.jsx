import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
export function FleetPage({
  vehicles
}) {
  return <section className="panel"><h2>Fleet vehicles</h2><p>Vehicle capacities and current assignments.</p><div className="table-scroll"><table><thead><tr><th>Vehicle</th><th>Capacity</th><th>Zone</th><th>Driver</th><th>Status</th></tr></thead><tbody>
    {vehicles.map(vehicle => <tr key={vehicle._id}><td>{vehicle.registration}</td><td>{vehicle.capacityKg} kg</td><td>{vehicle.zone?.name || '—'}</td><td>{vehicle.driver?.name || 'Unassigned'}</td><td>{vehicle.active ? 'Available' : 'Inactive'}</td></tr>)}
  </tbody></table></div>{!vehicles.length && <p className="empty-state">No vehicles have been added.</p>}</section>;
}
export function DisposalPage({
  catalog,
  routes,
  perform
}) {
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await perform('/disposals', {
      route: form.get('route'),
      facility: form.get('facility'),
      category: form.get('category'),
      quantityKg: Number(form.get('weight'))
    });
    if (result) formElement.reset();else setError('Check the selected route, facility and accepted waste category.');
  }
  return <>
    <section className="panel"><h2>Record disposal</h2><p>Record the material received at an approved facility.</p>
      <form className="inline-form" onSubmit={submit}>
        <label>Completed route<select name="route" required><option value="">Choose a route</option>{routes.filter(route => route.status === 'Completed').map(route => <option key={route._id} value={route._id}>{route.vehicle?.registration} · {new Date(route.date).toLocaleDateString()}</option>)}</select></label>
        <label>Facility<select name="facility" required><option value="">Choose a facility</option>{catalog.facilities?.map(facility => <option key={facility._id} value={facility._id}>{facility.name}</option>)}</select></label>
        <label>Waste category<select name="category" required><option value="">Choose a category</option>{catalog.categories?.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
        <label>Received kg<input name="weight" type="number" min="0.1" step="0.1" required /></label>
        <button className="primary-button">Save disposal</button>
      </form>{error && <p className="form-error">{error}</p>}
    </section>
    <section className="panel"><h2>Facilities and accepted categories</h2>{catalog.facilities?.map(facility => <p key={facility._id}><b>{facility.name}</b> — {facility.categories?.map(category => category.name).join(', ') || 'No categories listed'}</p>)}</section>
  </>;
}
export function ReportsPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/reports').then(setReport).catch(err => setError(err.message));
  }, []);
  if (error) return <section className="panel"><p className="form-error">{error}</p></section>;
  if (!report) return <section className="panel"><p>Loading report…</p></section>;
  return <section className="panel"><h2>Operational reports</h2><p>These totals are calculated from stored requests and disposal records.</p><div className="report-grid">
    <Report title="Requests by status" rows={report.status.map(row => [row._id, row.count])} />
    <Report title="Recovered by material" rows={report.byCategory.map(row => [row._id, `${row.kg} kg`])} />
    <Report title="Requests by zone" rows={report.byZone.map(row => [row._id, row.count])} />
    <Report title="Daily disposal" rows={report.weekly.map(row => [row._id, `${row.kg} kg`])} />
  </div></section>;
}
function Report({
  title,
  rows
}) {
  return <article className="report-card"><h3>{title}</h3>{rows.map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}{!rows.length && <small>No data recorded yet.</small>}</article>;
}
export function SettingsPage({
  catalog,
  perform
}) {
  return <>
    <section className="panel"><h2>System setup</h2><p>Add basic reference data used by requests, routes and disposal.</p><div className="settings-grid">
      <CreateForm title="Add zone" endpoint="zones" fields={['name', 'area']} perform={perform} />
      <CreateForm title="Add waste category" endpoint="categories" fields={['name', 'handling']} perform={perform} />
      <CreateForm title="Add vehicle" endpoint="vehicles" fields={['registration', 'capacityKg']} zones={catalog.zones || []} perform={perform} />
      <CreateForm title="Add facility" endpoint="facilities" fields={['name', 'address']} perform={perform} />
    </div></section>
    <UserAccess perform={perform} />
  </>;
}
function CreateForm({
  title,
  endpoint,
  fields,
  zones,
  perform
}) {
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = Object.fromEntries(form.entries());
    if (values.capacityKg) values.capacityKg = Number(values.capacityKg);
    await perform(`/admin/catalog/${endpoint}`, values);
    formElement.reset();
  }
  return <form className="settings-card" onSubmit={submit}><h3>{title}</h3>{fields.map(field => <label key={field}>{field.replace(/[A-Z]/g, letter => ` ${letter}`).toLowerCase()}<input name={field} required /></label>)}
    {endpoint === 'vehicles' && <label>Zone<select name="zone" required><option value="">Choose a zone</option>{zones.map(zone => <option key={zone._id} value={zone._id}>{zone.name}</option>)}</select></label>}
    <button className="primary-button">Save</button>
  </form>;
}
function UserAccess({
  perform
}) {
  const [users, setUsers] = useState([]);
  const load = () => api('/admin/users').then(setUsers).catch(() => {});
  useEffect(() => {
    load();
  }, []);
  return <section className="panel"><h2>Staff accounts</h2><p>Create dedicated Operator and Driver logins, then manage their access below.</p>
    <StaffCreate onCreated={load} />
    <div className="table-scroll"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Organization</th><th>Access</th><th></th></tr></thead><tbody>
    {users.map(user => <tr key={user._id}><td>{user.name}</td><td>{user.username}</td><td>{user.role}</td><td>{user.generator?.name || '—'}</td><td>{user.active ? 'Active' : 'Suspended'}</td><td><button className="small-button" onClick={async () => {
                await perform(`/admin/users/${user._id}/active`, {
                  active: !user.active
                }, 'PATCH');
                load();
              }}>{user.active ? 'Suspend' : 'Activate'}</button></td></tr>)}
  </tbody></table></div></section>;
}

function StaffCreate({ onCreated }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement).entries());
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const result = await api('/admin/users', { method: 'POST', body: JSON.stringify(values) });
      setSuccess(`${result.role === 'DRIVER' ? 'Driver' : 'Operator'} account created for ${result.name} (username: ${result.username}).`);
      formElement.reset();
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <form className="staff-create-form" onSubmit={submit}>
    <label>Staff member name<input name="name" required maxLength="80" placeholder="Full name" /></label>
    <label>Username<input name="username" required minLength="3" maxLength="30" pattern="[A-Za-z0-9._-]+" placeholder="e.g. operator2" /></label>
    <label>Temporary password<input name="password" type="password" required minLength="8" placeholder="At least 8 characters" /></label>
    <label>Role<select name="role" required defaultValue="OPERATOR"><option value="OPERATOR">Operator</option><option value="DRIVER">Driver</option></select></label>
    <button className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create staff account'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="form-success" role="status">{success}</p>}
  </form>;
}

export function ProfilePage({ generators, user }) {
  const profile = generators.find(generator => String(generator.user) === String(user.id));
  if (!profile) return <section className="panel"><h2>Organization profile</h2><p>No generator profile is linked to this account yet.</p></section>;
  return <section className="panel"><h2>Organization profile</h2><div className="report-grid"><p><b>Organization</b><br />{profile.name}</p><p><b>Type</b><br />{profile.type}</p><p><b>Service zone</b><br />{profile.zone?.name || '—'}</p><p><b>Contact</b><br />{profile.contact || '—'}</p><p><b>Email</b><br />{profile.email || '—'}</p><p><b>Address</b><br />{profile.address || '—'}</p></div></section>;
}
