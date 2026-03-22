import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Address, AddressType } from './entities/address.entity';

function mockRepo() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    remove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      withDeleted: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof mockRepo>;
  let addressRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    userRepo = mockRepo();
    addressRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
      const result = await service.findOne('user-1');
      expect(result.id).toBe('user-1');
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated users with meta', async () => {
      const qb = userRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'user-1' }], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('createAddress', () => {
    it('creates address without setting default', async () => {
      addressRepo.update.mockResolvedValue({ affected: 0 });
      addressRepo.create.mockReturnValue({ userId: 'user-1', type: AddressType.SHIPPING });
      addressRepo.save.mockResolvedValue({ id: 'addr-1', userId: 'user-1' });

      const result = await service.createAddress('user-1', {
        type: AddressType.SHIPPING,
        firstName: 'John',
        lastName: 'Doe',
        line1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      });

      expect(result).toBeDefined();
    });
  });

  describe('deleteAddress', () => {
    it('throws ForbiddenException when address belongs to different user', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 'addr-1', userId: 'other-user' });
      await expect(service.deleteAddress('user-1', 'addr-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when address not found', async () => {
      addressRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteAddress('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
