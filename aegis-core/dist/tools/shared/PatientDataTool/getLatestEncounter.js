function parseDate(value) {
    if (!value)
        return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}
const MS_PER_DAY = 1000 * 60 * 60 * 24;
/**
 * Returns the most recent dated encounter from a list of encounters, along
 * with the number of days elapsed since it occurred (relative to now).
 * Encounters without a parsable date are ignored for this calculation.
 */
export default async function execute(input, _context) {
    const encountersRaw = Array.isArray(input)
        ? input
        : (input?.encounters || input?.patientRecord?.encounters || []);
    if (!Array.isArray(encountersRaw)) {
        throw new Error('Input must be an array of encounters, or an object with an "encounters" field.');
    }
    let latest = null;
    for (const e of encountersRaw) {
        const d = parseDate(e.date);
        if (d && (!latest || d.getTime() > latest.date.getTime())) {
            latest = { encounter: e, date: d };
        }
    }
    const result = {
        latestEncounter: latest ? latest.encounter : null,
        daysSinceLastEncounter: latest
            ? Math.round((Date.now() - latest.date.getTime()) / MS_PER_DAY)
            : null
    };
    return JSON.stringify(result);
}
