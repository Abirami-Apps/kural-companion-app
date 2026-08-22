import { useEffect, useMemo, useState } from "react";
import { getAllKurals, getKural, type Kural } from "@/data/sample-kurals";
import { fetchKuralsFromApi } from "@/lib/kural-api";

/** Loads the corrected Hostinger library without making the app depend on it. */
export function useKuralLibrary() {
  const [kurals, setKurals] = useState<Kural[]>(() => getAllKurals());

  useEffect(() => {
    const controller = new AbortController();
    void fetchKuralsFromApi(controller.signal).then((remote) => {
      if (!controller.signal.aborted && remote.length > 0) setKurals(remote);
    });
    return () => controller.abort();
  }, []);

  const byNumber = useMemo(() => new Map(kurals.map((kural) => [kural.number, kural])), [kurals]);

  return {
    kurals,
    loading: false,
    getKural: (number: number) => byNumber.get(number) ?? getKural(number),
  };
}
