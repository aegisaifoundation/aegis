export const parser = {
  safeParseJSON<T = any>(text: string, fallback: T): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  },

  stripHTMLTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  },
};
