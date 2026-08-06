import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { HourlyKuralProvider } from "@/components/hourly/HourlyKuralProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { UserDataProvider } from "@/components/sync/UserDataProvider";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { NativeAppBridge } from "@/components/native/NativeAppBridge";
const Index = lazy(() => import("./pages/Index.tsx"));
const Subscribe = lazy(() => import("./pages/Subscribe.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Favourites = lazy(() => import("./pages/Favourites.tsx"));
const Chapters = lazy(() => import("./pages/Chapters.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const HourlyKural = lazy(() => import("./pages/HourlyKural.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PwaProvider>
        <BrowserRouter>
          <NativeAppBridge />
          <AuthProvider>
            <UserDataProvider>
              <ThemeProvider>
                <HourlyKuralProvider>
              <Toaster />
              <Sonner />
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center" role="status">
                    Loading Kural Companion…
                  </div>
                }
              >
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/kural/:number" element={<Index />} />
                    <Route path="/favourites" element={<Favourites />} />
                    <Route path="/chapters" element={<Chapters />} />
                    <Route path="/hourly" element={<HourlyKural />} />
                    <Route path="/subscribe" element={<Subscribe />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/refunds" element={<RefundPolicy />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
                </HourlyKuralProvider>
              </ThemeProvider>
            </UserDataProvider>
          </AuthProvider>
        </BrowserRouter>
      </PwaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
