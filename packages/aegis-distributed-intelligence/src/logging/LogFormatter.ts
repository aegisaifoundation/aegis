export class LogFormatter {
  static format(msg: string, metadata?: Record<string, any>): string {
    let output = msg;
    if (metadata && Object.keys(metadata).length > 0) {
      try {
        output += ` | metadata: ${JSON.stringify(metadata)}`;
      } catch (err) {
        // Fallback if serialization fails
      }
    }
    return output;
  }
}
export default LogFormatter;
