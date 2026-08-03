import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllKurals, SECTIONS } from "@/data/sample-kurals";
import { Button } from "@/components/ui/button";

interface ChapterEntry {
  number: number;
  name: string;
  section: string;
  first: number;
  count: number;
}

const Chapters = () => {
  const [section, setSection] = useState<string>("all");

  const chapters = useMemo<ChapterEntry[]>(() => {
    const map = new Map<number, ChapterEntry>();
    getAllKurals().forEach((k) => {
      const existing = map.get(k.chapterNumber);
      if (existing) existing.count += 1;
      else
        map.set(k.chapterNumber, {
          number: k.chapterNumber,
          name: k.chapter,
          section: k.section,
          first: k.number,
          count: 1,
        });
    });
    return [...map.values()].sort((a, b) => a.number - b.number);
  }, []);

  const visible = section === "all" ? chapters : chapters.filter((c) => c.section === section);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Chapters</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All 133 adhikarams. Pick one to start playing from its first kural.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by section">
        <Button
          variant={section === "all" ? "default" : "outline"}
          className="min-h-11 rounded-full"
          onClick={() => setSection("all")}
          aria-pressed={section === "all"}
        >
          All
        </Button>
        {SECTIONS.map((s) => (
          <Button
            key={s}
            variant={section === s ? "default" : "outline"}
            className="min-h-11 rounded-full font-tamil"
            onClick={() => setSection(s)}
            aria-pressed={section === s}
          >
            {s}
          </Button>
        ))}
      </div>

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <li key={c.number}>
            <Link
              to={`/kural/${c.first}`}
              state={{ autoplay: true }}
              className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="digital-display text-xs text-primary tabular-nums">
                {c.number.toString().padStart(3, "0")}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-tamil text-sm font-semibold text-foreground">
                  {c.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {c.count} kurals · from {c.first}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Chapters;
