import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Page Imports
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import GeneratePage from "./pages/GeneratePage";
import ReviewPage from "./pages/ReviewPage";
import DocumentsListPage from "./pages/DocumentsListPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import ReviewsListPage from "./pages/ReviewsListPage";
import ReviewDetailPage from "./pages/ReviewDetailPage";
import AdminPage from "./pages/AdminPage";
import SignPage from "./pages/SignPage";
import SharedReviewPage from "./pages/SharedReviewPage";
import { AppLayout } from "./components/AppLayout";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component {...rest} />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            {/* Public routes — no auth required */}
            <Route path="/sign/:token">
              {(params) => <SignPage token={params.token!} />}
            </Route>
            <Route path="/shared-review/:token">
              {(params) => <SharedReviewPage token={params.token!} />}
            </Route>

            <Route path="/dashboard">
              {() => <ProtectedRoute component={DashboardPage} />}
            </Route>
            <Route path="/generate">
              {() => <ProtectedRoute component={GeneratePage} />}
            </Route>
            <Route path="/review">
              {() => <ProtectedRoute component={ReviewPage} />}
            </Route>
            <Route path="/documents">
              {() => <ProtectedRoute component={DocumentsListPage} />}
            </Route>
            <Route path="/documents/:id">
              {(params) => <ProtectedRoute component={DocumentDetailPage} id={params.id} />}
            </Route>
            <Route path="/reviews">
              {() => <ProtectedRoute component={ReviewsListPage} />}
            </Route>
            <Route path="/reviews/:id">
              {(params) => <ProtectedRoute component={ReviewDetailPage} id={params.id} />}
            </Route>
            <Route path="/admin">
              {() => <ProtectedRoute component={AdminPage} />}
            </Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
