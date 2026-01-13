import { useEffect, useState } from "react";

function App() {
  const [accessToken, setData] = useState({});
  const [user, setUser] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function fetchLogin() {
    const res = await fetch("http://127.0.0.1:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password }),
    });
    if (!res.ok) {
      console.error("Request failed :(", res.status);
      return;
    }
    const result = await res.json();
    setData(result);
    console.log(result);
  }
  useEffect(() => {
    async function getUser() {
      if (!accessToken.accessToken) {
        return;
      }
      const res = await fetch("http://127.0.0.1:3000/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken.accessToken}`,
        },
      });
      const result = await res.json();
      setUser(result);
      console.log(result);
    }
    getUser();
  }, [accessToken]);
  return (
    <>
      <div>hello {user?.name ?? "world"}</div>
      <div>this is the new site</div>
      <input
        type="text"
        placeholder="UserName"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={fetchLogin}>login</button>
    </>
  );
}

export default App;
