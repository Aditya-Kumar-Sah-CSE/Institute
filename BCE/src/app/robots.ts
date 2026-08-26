import type { MetadataRoute } from "next";

const BASE_URL = "https://institute-ashen.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/admin/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}