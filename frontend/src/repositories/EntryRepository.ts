import { db } from '../lib/db';
import { Prisma } from '@prisma/client';

export class EntryRepository {
  static async findById(id: string) {
    return db.entry.findUnique({
      where: { id },
      include: {
        images: true,
        template: true,
        responses: true,
      },
    });
  }

  static async findManyByUserId(
    userId: string,
    limit: number,
    cursorId?: string
  ) {
    const query: Prisma.EntryFindManyArgs = {
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        template: true,
        responses: true,
      },
    };

    if (cursorId) {
      query.cursor = { id: cursorId };
      query.skip = 1; // Skip the cursor itself
    }

    return db.entry.findMany(query);
  }

  static async findManyPublic(
    limit: number,
    cursorId?: string
  ) {
    const query: Prisma.EntryFindManyArgs = {
      where: { isPublic: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        template: true,
        responses: true,
        user: {
          select: {
            id: true,
            name: true,
            photoURL: true,
          }
        }
      },
    };

    if (cursorId) {
      query.cursor = { id: cursorId };
      query.skip = 1; // Skip the cursor itself
    }

    return db.entry.findMany(query);
  }

  static async countByUserId(userId: string) {
    return db.entry.count({
      where: { userId },
    });
  }

  static async create(data: Prisma.EntryUncheckedCreateInput) {
    return db.entry.create({
      data,
      include: {
        images: true,
        template: true,
        responses: true,
      }
    });
  }

  static async update(id: string, data: Prisma.EntryUncheckedUpdateInput) {
    return db.entry.update({
      where: { id },
      data,
      include: {
        images: true,
        template: true,
        responses: true,
      }
    });
  }

  static async delete(id: string) {
    return db.entry.delete({
      where: { id },
    });
  }
}
