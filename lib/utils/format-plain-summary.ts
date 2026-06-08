/** Strip common markdown so summaries stay plain text when pasted or stored. */
export function stripSummaryMarkdownArtifacts(text: string): string {
  return (
    text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[(.+?)]\([^)]*\)/g, '$1')
      .replace(/\r\n/g, '\n')
      .trim()
  );
}
