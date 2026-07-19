import { EntryRepository } from '../repositories/EntryRepository';
import { UserRepository } from '../repositories/UserRepository';
import { CryptoService } from './CryptoService';
import { BadgeService } from './BadgeService';
import { db } from '../lib/db';

interface CreateEntryInput {
  userId: string;
  userEmail: string;
  userName: string;
  body: string;
  templateId?: string | null;
  isPublic?: boolean;
  theme?: string;
  timezoneOffset?: number;
  responses?: { fieldLabel: string; value: string }[];
  images?: string[];
}

export class EntryService {
  static async createEntry(input: CreateEntryInput) {
    const {
      userId,
      userEmail,
      userName,
      body,
      templateId,
      isPublic,
      theme,
      timezoneOffset = 0,
      responses,
      images,
    } = input;

    // 1. Ensure user exists (Upsert)
    const existingUser = await UserRepository.findByEmail(userEmail);
    if (existingUser && existingUser.id !== userId) {
      console.warn(`Identity mismatch detected for ${userEmail}. Manual review needed.`);
    }

    await db.user.upsert({
      where: { id: userId },
      update: { email: userEmail },
      create: {
        id: userId,
        email: userEmail,
        name: userName || userEmail.split('@')[0] || 'Writer',
      },
    });

    // 2. Validate Template
    let resolvedTemplateId: string | null = templateId || null;
    if (resolvedTemplateId) {
      const templateExists = await db.template.findUnique({ where: { id: resolvedTemplateId } });
      if (!templateExists) resolvedTemplateId = null;
    }

    // 3. Encrypt Body
    const { encrypted, iv } = CryptoService.encrypt(body || '');

    // 4. Create Entry
    const entry = await EntryRepository.create({
      userId,
      templateId: resolvedTemplateId,
      body_encrypted: encrypted,
      iv,
      isPublic: isPublic || false,
      theme: theme || 'marble',
      responses: responses
        ? {
            create: responses.map((r) => ({
              fieldLabel: r.fieldLabel,
              value: r.value,
            })),
          }
        : undefined,
      images: images && images.length > 0
        ? {
            create: images.map((url) => ({ url })),
          }
        : undefined,
    });

    // 5. Update Streak and Last Entry Date
    let isNewDay = false;
    try {
      const user = await UserRepository.findById(userId);
      if (user) {
        const today = new Date();
        today.setMinutes(today.getMinutes() - timezoneOffset);
        today.setUTCHours(0, 0, 0, 0);
        
        let newStreak = 1;
        if (user.lastEntryDate) {
          const lastDate = new Date(user.lastEntryDate);
          lastDate.setMinutes(lastDate.getMinutes() - timezoneOffset);
          lastDate.setUTCHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak = user.streakCount + 1;
            isNewDay = true;
          } else if (diffDays === 0) {
            newStreak = user.streakCount;
            isNewDay = false;
          } else {
            newStreak = 1;
            isNewDay = true;
          }
        } else {
            isNewDay = true;
        }

        await UserRepository.update(userId, {
          streakCount: newStreak,
          lastEntryDate: new Date(),
        });

        // 6. Progress Challenges
        if (isNewDay) {
          const activeChallenges = await db.userChallenge.findMany({
            where: { userId, completed: false },
            include: { challenge: true }
          });
          for (const uc of activeChallenges) {
            const nextDay = uc.currentDay + 1;
            const completed = nextDay >= uc.challenge.duration;
            await db.userChallenge.update({
              where: { id: uc.id },
              data: { currentDay: nextDay, completed }
            });
          }
        }
      }
    } catch (err) {
      console.error('Challenge/Streak progression failed', err);
    }

    // 7. Check and Award Badges (Async so it doesn't block response)
    // We can await it or just let it run. In Serverless, we generally want to await to avoid it getting killed.
    let newBadges: string[] = [];
    try {
      newBadges = await BadgeService.checkAndAwardBadges(userId);
    } catch (err) {
      console.error('Badge awarding failed', err);
    }

    return {
      ...entry,
      body,
      newBadges,
    };
  }
}
