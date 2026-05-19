const sessionSeedByStudentId = new Map<string, string>();

const getSessionSeed = (studentId: string) => {
  const key = studentId || 'student';
  const existing = sessionSeedByStudentId.get(key);
  if (existing) return existing;

  // Stable during current SPA runtime, but regenerated after browser refresh.
  const generated = `${key}-${Math.random().toString(36).slice(2, 10)}`;
  sessionSeedByStudentId.set(key, generated);
  return generated;
};

export const getStudentAvatarUrl = (studentId: string, gender?: 'boy' | 'girl' | null) => {
  const seed = encodeURIComponent(getSessionSeed(studentId));
  const style = gender === 'girl' ? 'lorelei' : 'adventurer';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
};
