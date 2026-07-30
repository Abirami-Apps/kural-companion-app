import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index.tsx";
import KuralPlayer from "./pages/KuralPlayer.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import Login from "./pages/Login.tsx";
import Favourites from "./pages/Favourites.tsx";
import Chapters from "./pages/Chapters.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/favourites" element={<Favourites />} />
              <Route path="/chapters" element={<Chapters />} />
              <Route path="/kural/:number" element={<KuralPlayer />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
