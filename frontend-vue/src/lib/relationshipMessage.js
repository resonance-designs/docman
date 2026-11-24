export function relationshipMessage(data, fallback) {
  const message = data?.message || fallback;
  if (!data?.relationshipsPending || /pending automatic reconciliation/i.test(message)) return message;
  return `${message} Related links are pending automatic reconciliation.`;
}
