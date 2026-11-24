import { Route, Switch } from "wouter";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import CheckoutComplete from "@/pages/CheckoutComplete";
import Dashboard from "@/pages/Dashboard";
import EventPage from "@/pages/EventPage";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import ManageEvent from "@/pages/ManageEvent";
import NewEvent from "@/pages/NewEvent";
import NotFound from "@/pages/NotFound";
import Tickets from "@/pages/Tickets";

export default function App() {
  if (!isConfigured) {
    return (
      <main className="wrap narrow">
        <div className="notice error">
          <strong>Setup needed.</strong> Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to
          your environment (see <code>.env.example</code>), then rebuild.
        </div>
      </main>
    );
  }

  return (
    <AuthProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/events/:slug">{(p) => <EventPage slug={p.slug} />}</Route>
          <Route path="/login" component={Login} />
          <Route path="/tickets" component={Tickets} />
          <Route path="/checkout/complete" component={CheckoutComplete} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/dashboard/new" component={NewEvent} />
          <Route path="/dashboard/events/:id">{(p) => <ManageEvent id={p.id} />}</Route>
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthProvider>
  );
}
