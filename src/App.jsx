import { useEffect, useState } from 'react';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user ?? null);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const handleLogin = () => {
    window.location.href = '/auth/twitch';
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  if (!user) {
    return <button onClick={handleLogin}>Login with Twitch</button>;
  }

  return (
    <div>
      <img src={user.profile_image_url} alt={user.display_name} width="64" height="64" />
      <p>{user.display_name}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
