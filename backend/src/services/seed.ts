import prisma from '../lib/prisma.js';

/**
 * Seed default templates into the database.
 * Run once on server startup or via a seed script.
 */
export async function seedTemplates(): Promise<void> {
  const templates = [
    {
      name: 'Personal Journal',
      description: 'A free-form space for your thoughts, feelings, and reflections.',
      fields: [
        { label: 'How are you feeling?', type: 'emoji' },
        { label: 'Write freely...', type: 'textarea' },
      ],
    },
    {
      name: 'Gratitude Journal',
      description: 'Focus on positivity by noting what you are grateful for.',
      fields: [
        { label: 'Mood', type: 'emoji' },
        { label: 'I am grateful for...', type: 'text' },
        { label: 'Something good that happened', type: 'text' },
        { label: 'Someone I appreciate', type: 'text' },
      ],
    },
    {
      name: 'Productivity Journal',
      description: 'Track your daily tasks, focus, and improvements.',
      fields: [
        { label: 'Tasks completed today', type: 'number' },
        { label: 'Focus level (1-10)', type: 'rating' },
        { label: 'What did I improve today?', type: 'text' },
        { label: 'Tomorrow\'s priority', type: 'text' },
      ],
    },
    {
      name: 'Self Care Journal',
      description: 'Monitor your well-being, mood, sleep, and stress.',
      fields: [
        { label: 'Mood', type: 'emoji' },
        { label: 'Sleep hours', type: 'number' },
        { label: 'Stress level (1-10)', type: 'rating' },
        { label: 'Self-care activity', type: 'text' },
        { label: 'Notes', type: 'textarea' },
      ],
    },
    {
      name: 'Finance Journal',
      description: 'Keep track of your daily financial activity.',
      fields: [
        { label: 'Total expenses today', type: 'number' },
        { label: 'Income received', type: 'number' },
        { label: 'Savings goal progress', type: 'text' },
        { label: 'Notes', type: 'textarea' },
      ],
    },
    {
      name: 'Time Management',
      description: 'Analyze how you spend your time each day.',
      fields: [
        { label: 'Most productive hour', type: 'text' },
        { label: 'Hours worked', type: 'number' },
        { label: 'Hours of leisure', type: 'number' },
        { label: 'What consumed the most time?', type: 'text' },
      ],
    },
    {
      name: 'Yearly Planner',
      description: 'Set long-term goals and track annual progress.',
      fields: [
        { label: 'Goal for this year', type: 'text' },
        { label: 'Progress so far', type: 'text' },
        { label: 'Key milestones hit', type: 'textarea' },
      ],
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.template.create({ data: t });
      console.log(`  ✓ Seeded template: ${t.name}`);
    }
  }
}

/**
 * Seed default challenges into the database.
 */
export async function seedChallenges(): Promise<void> {
  const challenges = [
    { name: '7 Day Writing Sprint', duration: 7, description: 'Write every day for 7 days straight.' },
    { name: '21 Day Habit Builder', duration: 21, description: 'Build a journaling habit in 21 days.' },
    { name: '30 Day Consistency Master', duration: 30, description: 'The ultimate 30-day journaling challenge.' },
  ];

  for (const c of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.challenge.create({ data: c });
      console.log(`  ✓ Seeded challenge: ${c.name}`);
    }
  }
}
