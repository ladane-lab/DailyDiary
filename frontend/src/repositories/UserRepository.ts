import { db } from '../lib/db';
import { Prisma } from '@prisma/client';

export class UserRepository {
  static async findById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { entries: true },
        },
        userBadges: true,
      },
    });
  }

  static async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
    });
  }

  static async create(data: Prisma.UserCreateInput) {
    return db.user.create({
      data,
    });
  }

  static async update(id: string, data: Prisma.UserUpdateInput) {
    return db.user.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return db.user.delete({
      where: { id },
    });
  }
}
