export const parser = {
    safeParseJSON(text, fallback) {
        try {
            return JSON.parse(text);
        }
        catch {
            return fallback;
        }
    },
    stripHTMLTags(text) {
        return text.replace(/<[^>]*>/g, '');
    },
};
