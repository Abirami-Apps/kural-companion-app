import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { getKural } from "@/data/sample-kurals";
import { useEffect, useState } from "react";

const FAVS_KEY = "kural:favs";

const Favourites = () => {
  const [favs, setFavs] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setFavs(Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : []);
    } catch {
      setFavs([]);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Favourites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kurals you saved on this device.
      </p>

      {favs.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No favourites yet — tap the heart on any kural to save it.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {favs.map((n) => {
            const k = getKural(n);
            if (!k) return null;
            return (
              <li key={n}>
                <Link
                  to={`/?k=${n}`}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="digital-display text-sm text-primary tabular-nums">
                    {n.toString().padStart(4, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-tamil whitespace-pre-line text-foreground">
                      {k.tamil}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {k.chapterNumber}. {k.chapter}
                    </span>
                  </span>
                  <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Favourites;
