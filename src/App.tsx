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
const Index = lazy(() => import("./pages/Index.tsx"));
const Subscribe = lazy(() => import("./pages/Subscribe.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Favourites = lazy(() => import("./pages/Favourites.tsx"));
const Chapters = lazy(() => import("./pages/Chapters.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const HourlyKural = lazy(() => import("./pages/HourlyKural.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
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
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
              </HourlyKuralProvider>
            </ThemeProvider>
          </UserDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
