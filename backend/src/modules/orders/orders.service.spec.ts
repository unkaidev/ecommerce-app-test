import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Inventory } from '../products/entities/inventory.entity';
import { Address } from '../users/entities/address.entity';

function mockRepo() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    }),
    delete: jest.fn(),
  };
}

const mockDataSource = {
  transaction: jest.fn((cb: (em: unknown) => Promise<unknown>) => cb({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((cls: unknown, dto: unknown) => dto),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      create: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    }),
  })),
};

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    orderRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderStatusHistory), useValue: mockRepo() },
        { provide: getRepositoryToken(Cart), useValue: mockRepo() },
        { provide: getRepositoryToken(CartItem), useValue: mockRepo() },
        { provide: getRepositoryToken(Inventory), useValue: mockRepo() },
        { provide: getRepositoryToken(Address), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('findMyOrders', () => {
    it('returns paginated result', async () => {
      orderRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findMyOrders('user-1', { page: 1, limit: 20 });
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.meta.total).toBe('number');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when order belongs to different user', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'ord-1', userId: 'other-user' } as Order);
      await expect(service.findOne('ord-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns order when found and user matches', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'ord-1', userId: 'user-1', items: [], statusHistory: [] } as unknown as Order);
      const result = await service.findOne('ord-1', 'user-1');
      expect(result.id).toBe('ord-1');
    });
  });

  describe('cancelMyOrder', () => {
    it('throws NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelMyOrder('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user does not own the order', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        userId: 'other-user',
        status: OrderStatus.PENDING,
      } as Order);
      await expect(service.cancelMyOrder('ord-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws UnprocessableEntityException when order is not pending', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.SHIPPED,
      } as Order);
      await expect(service.cancelMyOrder('ord-1', 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
