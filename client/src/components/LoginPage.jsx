import React, { useState } from 'react';
import { api } from '../api.js';
export function LoginPage({
  onSignIn
}) {
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    try {
      if (registering) {
        const session = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify(values)
        });
        onSignIn(session);
      } else {
        await onSignIn({
          username: values.username,
          password: values.password,
          role: values.role
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <main className="login-wrap">
      <section className="login-card">
        <a className="brand" href="#"><span className="brand-mark">E</span> ECOfleet</a>
        <p className="eyebrow">CITY OPERATIONS PLATFORM</p>
        <h1>{registering ? 'Register your organization' : 'Welcome back'}</h1>
        <p className="muted">{registering ? 'Create a generator account to request pickups.' : 'Sign in to your role-specific workspace.'}</p>
        <form onSubmit={submit}>
          {registering ? <RegistrationFields /> : <>
            <label>Sign in as<select name="role" required defaultValue=""><option value="" disabled>Select your role</option><option value="ADMIN">Administrator</option><option value="GENERATOR">Waste generator / organization</option><option value="OPERATOR">Operations operator</option><option value="DRIVER">Collection driver</option></select></label>
            <label>Username<input name="username" required autoComplete="username" placeholder="Enter your username" /></label>
            <label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" /></label>
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</button>
        </form>
        {!registering && <p className="demo-hint">Demo accounts use <b>Password@123</b>. Select the role assigned to your account.</p>}
        <button className="link-button" onClick={() => {
        setRegistering(!registering);
        setError('');
      }}>
          {registering ? 'Back to sign in' : 'Register your organization'}
        </button>
      </section>
    </main>;
}
function RegistrationFields() {
  const [zones, setZones] = React.useState([]);
  React.useEffect(() => {
    api('/public/zones').then(setZones).catch(() => {});
  }, []);
  return <>
    <div className="two-column">
      <label>Your name<input name="name" required maxLength="80" /></label>
      <label>Organization<input name="organization" required maxLength="100" /></label>
      <label>Username<input name="username" required minLength="3" maxLength="30" pattern="[A-Za-z0-9._-]+" /></label>
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" minLength="8" required /></label>
      <label>Organization type<select name="type" required><option value="">Select type</option>{['Hospital', 'Housing Society', 'Factory', 'Hotel', 'School'].map(type => <option key={type}>{type}</option>)}</select></label>
      <label>Service zone<select name="zone" required><option value="">Select zone</option>{zones.map(zone => <option value={zone._id} key={zone._id}>{zone.name}</option>)}</select></label>
      <label>Contact<input name="contact" /></label>
    </div>
  </>;
}
