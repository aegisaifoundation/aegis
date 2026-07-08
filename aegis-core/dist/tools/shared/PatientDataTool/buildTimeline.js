function parseDate(value) {
    if (!value)
        return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}
const MS_PER_DAY = 1000 * 60 * 60 * 24;
/**
 * Sorts a list of patient encounters chronologically (oldest first) and
 * computes the gap in days between successive encounters. Encounters with
 * missing or unparsable dates are placed at the end, in their original
 * relative order, and flagged via `dateValid: false`.
 */
export default async function execute(input, _context) {
    const encountersRaw = Array.isArray(input)
        ? input
        : (input?.encounters || input?.patientRecord?.encounters || []);
    if (!Array.isArray(encountersRaw)) {
        throw new Error('Input must be an array of encounters, or an object with an "encounters" field.');
    }
    const withDates = encountersRaw.map((e, idx) => ({
        encounter: e,
        parsed: parseDate(e.date),
        idx
    }));
    const dated = withDates.filter((w) => w.parsed !== null)
        .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());
    const undated = withDates.filter((w) => w.parsed === null)
        .sort((a, b) => a.idx - b.idx);
    const ordered = [...dated, ...undated];
    let previous = null;
    const timeline = ordered.map((w) => {
        const daysSincePrevious = w.parsed && previous
            ? Math.round((w.parsed.getTime() - previous.getTime()) / MS_PER_DAY)
            : null;
        if (w.parsed)
            previous = w.parsed;
        return {
            ...w.encounter,
            daysSincePrevious,
            dateValid: w.parsed !== null
        };
    });
    const gaps = timeline.map((t) => t.daysSincePrevious).filter((g) => g !== null);
    const averageGapDays = gaps.length > 0
        ? Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length)
        : null;
    const result = {
        timeline,
        firstEncounterDate: dated.length > 0 ? dated[0].parsed.toISOString() : null,
        lastEncounterDate: dated.length > 0 ? dated[dated.length - 1].parsed.toISOString() : null,
        totalEncounters: timeline.length,
        averageGapDays,
        unorderedOrInvalidDateCount: undated.length
    };
    return JSON.stringify(result);
}
