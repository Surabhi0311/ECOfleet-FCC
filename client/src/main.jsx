
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, clearSession, saveSession } from './api.js';
import { LoginPage } from './components/LoginPage.jsx';
import { OverviewPage } from './components/OverviewPage.jsx';
import { RequestsPage } from './components/RequestsPage.jsx';
import { RoutesPage } from './components/RoutesPage.jsx';
import { FleetPage, DisposalPage, ReportsPage, SettingsPage, ProfilePage } from './components/OtherPages.jsx';
import './styles.css';

const readUser = () => JSON.parse(localStorage.getItem('eco-user') || 'null');

function App() {
  const [user, setUser] = useState(readUser);
  const [page, setPage] = useState('Overview');
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = user?.role;

  const navigation =
    role === 'GENERATOR'
      ? ['Overview', 'Pickup requests', 'My profile']
      : role === 'DRIVER'
        ? ['Overview', 'My routes']
        : [
            'Overview',
            'Pickup requests',
            'Route planning',
            'Fleet',
            'Disposal',
            'Reports',
            ...(role === 'ADMIN' ? ['Settings'] : [])
          ];

  async function refresh() {
    if (!user) return;

    try {
      const [dashboard, catalog, requests, routes] = await Promise.all([
        api('/dashboard'),
        api('/catalog'),
        api('/requests'),
        api('/routes')
      ]);

      setData({
        dashboard,
        catalog,
        requests,
        routes
      });

      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, [user]);

  async function signIn(credentialsOrSession) {
    const session = credentialsOrSession.token
      ? credentialsOrSession
      : await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentialsOrSession)
        });

    saveSession(session);
    setUser(session.user);
    setPage('Overview');
  }

  function signOut() {
    clearSession();
    setUser(null);
    setData({});
  }

  async function perform(path, body, method = 'POST') {
    try {
      const result = await api(path, {
        method,
        body: JSON.stringify(body)
      });

      setNotice(
        result.unassigned?.length
          ? `${result.created} route(s) planned. ${result.unassigned.length} request(s) exceed the fleet capacity and remain pending.`
          : 'Saved. The workflow has been updated.'
      );

      await refresh();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  if (!user) return <LoginPage onSignIn={signIn} />;

  const pageContent = {
    Overview: <OverviewPage data={data} user={user} goTo={setPage} />,
    'Pickup requests': (
      <RequestsPage
        requests={data.requests || []}
        catalog={data.catalog || {}}
        role={role}
        perform={perform}
      />
    ),
    'My profile': (
      <ProfilePage
        generators={data.catalog?.generators || []}
        user={user}
      />
    ),
    'Route planning': (
      <RoutesPage
        routes={data.routes || []}
        requests={data.requests || []}
        role={role}
        perform={perform}
      />
    ),
    'My routes': (
      <RoutesPage
        routes={data.routes || []}
        requests={data.requests || []}
        role={role}
        perform={perform}
      />
    ),
    Fleet: <FleetPage vehicles={data.catalog?.vehicles || []} />,
    Disposal: (
      <DisposalPage
        catalog={data.catalog || {}}
        routes={data.routes || []}
        perform={perform}
      />
    ),
    Reports: <ReportsPage />,
    Settings: (
      <SettingsPage
        catalog={data.catalog || {}}
        perform={perform}
      />
    )
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#overview"
          onClick={() => setPage('Overview')}
        >
          <span className="brand-mark">E</span> ECOfleet
        </a>

        <span className="topbar-caption">
          Waste collection operations
        </span>

        <div className="account">
          <span>{user.name}</span>
          <span className="role-label">{role}</span>
          <button className="link-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ECOfleet / {page}</p>
            <h1>{page}</h1>
          </div>

          <button className="secondary-button" onClick={refresh}>
            Refresh data
          </button>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(item => (
            <button
              key={item}
              className={
                page === item ? 'nav-item selected' : 'nav-item'
              }
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {error && (
          <div className="message error-message" role="alert">
            {error}
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {notice && (
          <div className="message success-message" role="status">
            {notice}
            <button onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        {pageContent[page] || (
          <p className="empty-state">Choose a section above.</p>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
