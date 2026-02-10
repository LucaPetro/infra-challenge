export function withStage(name: string): string {
  const stage = process.env.STAGE || 'dev';
  return `${name}-${stage}`;
}