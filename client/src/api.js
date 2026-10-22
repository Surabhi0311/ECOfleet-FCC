// One place for browser requests. The API token is added automatically.
export async function api(path, options = {}) {
  const token = localStorage.getItem('eco-token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? {
        'Content-Type': 'application/json'
      } : {}),
      ...(token ? {
        Authorization: `Bearer ${token}`
      } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The server returned an unreadable response (HTTP ${response.status}). Check the API and MongoDB are running.`);
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
export function saveSession(session) {
  localStorage.setItem('eco-token', session.token);
  localStorage.setItem('eco-user', JSON.stringify(session.user));
}
export function clearSession() {
  localStorage.removeItem('eco-token');
  localStorage.removeItem('eco-user');
}
