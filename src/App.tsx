import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isConfigured } from "./config";
import { Login } from "./components/Login";
import { Collection } from "./components/Collection";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <div className="centered">
        <div className="card login">
          <h1 className="brand">📚 Collection</h1>
          <p className="muted">Almost there — this app isn't connected to a database yet.</p>
          <p className="muted">
            Add your Supabase Project URL and anon key in <code>src/config.ts</code> (see the
            README), then reload.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="centered">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!session) return <Login />;

  return <Collection session={session} />;
}
