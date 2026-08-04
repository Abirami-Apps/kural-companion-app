import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

export function LegalPage({
  title,
  effectiveDate,
  introduction,
  sections,
}: {
  title: string;
  effectiveDate: string;
  introduction: string;
  sections: LegalSection[];
}) {
  const navigate = useNavigate();

  return (
    <article className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6" lang="en">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <header className="mt-6 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {effectiveDate}</p>
        <p className="mt-5 leading-7 text-foreground/85">{introduction}</p>
      </header>

      <div className="space-y-8 py-8">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`legal-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <h2
              id={`legal-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="text-xl font-semibold text-foreground"
            >
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 leading-7 text-foreground/80">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
