import type { MetadataRoute } from "next";
import { getCoreLabsForLevel } from "@/lib/curriculum-labs";

const BASE_URL = "https://app.gatewaytofuture.com";

const ACADEMY_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "t_kurs",
  "m_kurs",
  "w_kurs",
  "g_kurs",
  "ausbildung_pflege",
] as const;

const CORE_MODULES = [
  "01-vocabulary",
  "02-grammar",
  "03-hoeren-lesen",
  "04-modelltests",
] as const;

const CEFR_LEVELS = ["a1", "a2", "b1", "b2"] as const;
const EXAM_SECTIONS = ["lesen", "hoeren", "schreiben", "sprechen"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/dashboard", changeFrequency: "daily", priority: 0.9 },
    { path: "/academy", changeFrequency: "daily", priority: 0.9 },
    { path: "/studienkolleg", changeFrequency: "weekly", priority: 0.85 },
    { path: "/pflege", changeFrequency: "weekly", priority: 0.85 },
    { path: "/pathways", changeFrequency: "weekly", priority: 0.8 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
    { path: "/register", changeFrequency: "monthly", priority: 0.6 },
    { path: "/impressum", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/delete-account", changeFrequency: "yearly", priority: 0.3 },
  ];

  for (const route of staticRoutes) {
    entries.push({
      url: `${BASE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  for (const level of ACADEMY_LEVELS) {
    entries.push({
      url: `${BASE_URL}/academy/${level}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });

    entries.push({
      url: `${BASE_URL}/academy/${level}/01-vocabulary/core-deck`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });

    for (const mod of CORE_MODULES) {
      entries.push({
        url: `${BASE_URL}/academy/${level}/${mod}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const level of CEFR_LEVELS) {
    const labs = getCoreLabsForLevel(level);
    for (const lab of labs) {
      entries.push(
        {
          url: `${BASE_URL}/academy/${level}/03-hoeren-lesen/${encodeURIComponent(lab.id)}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        },
        {
          url: `${BASE_URL}/academy/${level}/02-grammar/${encodeURIComponent(`grammar-${lab.id}`)}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        },
        {
          url: `${BASE_URL}/academy/${level}/01-vocabulary/${encodeURIComponent(`vocab-${lab.id}`)}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        },
      );
    }

    for (const section of EXAM_SECTIONS) {
      entries.push({
        url: `${BASE_URL}/exam/${level}/${section}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  return entries;
}
