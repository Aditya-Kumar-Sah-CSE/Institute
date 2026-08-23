import type { NptelProvider, NptelProviderAssignment, NptelProviderCourse } from './types';

const timeoutFetch = async (url: string) => {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try { const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' }); if (!response.ok) throw new Error(`Provider returned ${response.status}`); return response.json(); }
  finally { clearTimeout(timer); }
};

/** Configurable for an official/public JSON provider. No private dashboard scraping is performed. */
export class ConfiguredNptelProvider implements NptelProvider {
  private baseUrl = process.env.NPTEL_PUBLIC_PROVIDER_URL;
  private enabled() { if (!this.baseUrl) throw new Error('NPTEL public provider is not configured'); }
  async searchCourses(query: string): Promise<NptelProviderCourse[]> { this.enabled(); const json = await timeoutFetch(`${this.baseUrl}/courses?search=${encodeURIComponent(query)}`); return Array.isArray(json) ? json : json.courses || []; }
  async getCourseAssignments(courseId: string): Promise<NptelProviderAssignment[]> { this.enabled(); const json = await timeoutFetch(`${this.baseUrl}/courses/${encodeURIComponent(courseId)}/assignments`); return Array.isArray(json) ? json : json.assignments || []; }
}
