import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from '../products/entities/inventory.entity';

function mockRepo() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((e: unknown) => Promise.resolve({ ...e as object, id: 'new-id' })),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

const mockDataSource = {
  transaction: jest.fn((cb: (em: unknown) => Promise<unknown>) =>
    cb({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((cls: unknown, dto: unknown) => dto),
      save: jest.fn((e: unknown) => Promise.resolve({ ...e as object, id: 'new-id' })),
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ quantity: 10, reserved: 0 }),
      }),
    }),
  ),
};

describe('CartService', () => {
  let service: CartService;
  let cartRepo: ReturnType<typeof mockRepo>;
  let itemRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    cartRepo = mockRepo();
    itemRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepo },
        { provide: getRepositoryToken(CartItem), useValue: itemRepo },
        { provide: getRepositoryToken(ProductVariant), useValue: mockRepo() },
        { provide: getRepositoryToken(Inventory), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('creates and returns a new empty cart when none exists', async () => {
      cartRepo.findOne.mockResolvedValue(null);
      cartRepo.create.mockReturnValue({ userId: 'user-1' });
      cartRepo.save.mockResolvedValue({ id: 'cart-1', userId: 'user-1', items: [] });
      cartRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      const result = await service.getCart('user-1');

      expect(result.cart).toBeDefined();
      expect(result.subtotal).toBe(0);
      expect(result.totalItems).toBe(0);
    });

    it('returns existing cart with computed totals', async () => {
      cartRepo.findOne.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          { id: 'item-1', quantity: 2, unitPrice: '10.00', variantId: 'v-1' },
        ],
      });

      const result = await service.getCart('user-1');

      expect(result.subtotal).toBe(20);
      expect(result.totalItems).toBe(2);
    });
  });

  describe('removeItem', () => {
    it('throws NotFoundException when item not found', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.removeItem('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when item belongs to different user', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'other-user' },
      });
      await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
