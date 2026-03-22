import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order, OrderStatus, ORDER_TRANSITIONS } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Inventory } from '../products/entities/inventory.entity';
import { Address } from '../users/entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepo: Repository<OrderStatusHistory>,
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create an order from the current user's cart.
   * Stock is reserved (not deducted) at this stage.
   * Cart is cleared after successful order creation.
   */
  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      // Verify the shipping address belongs to the user
      const address = await em.findOne(Address, {
        where: { id: dto.shippingAddressId, userId },
      });
      if (!address) {
        throw new BadRequestException(
          'Shipping address not found or does not belong to you',
        );
      }

      // Load the cart with items
      const cart = await em.findOne(Cart, {
        where: { userId },
        relations: ['items', 'items.variant', 'items.variant.product'],
      });

      if (!cart || !cart.items?.length) {
        throw new UnprocessableEntityException('Cart is empty');
      }

      // Build order number: ORD-YYYYMMDD-NNNN (BR-25)
      const orderNumber = await this.generateOrderNumber(em);

      // Calculate totals server-side (BR-26)
      const subtotal = cart.items.reduce((sum, item) => {
        return sum + parseFloat(item.unitPrice) * item.quantity;
      }, 0);

      // Simple tax calculation (8% — extend with real tax service)
      const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
      const shippingAmount = subtotal >= 50 ? 0 : 5.99;
      const total = subtotal + taxAmount + shippingAmount;

      // Create the order
      const order = em.create(Order, {
        orderNumber,
        userId,
        status: OrderStatus.PENDING,
        subtotal: subtotal.toFixed(2),
        discountAmount: '0.00',
        taxAmount: taxAmount.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        total: total.toFixed(2),
        currency: 'USD',
        couponCode: cart.couponCode,
        shippingAddressId: address.id,
        // Store address snapshot (BR-27)
        shippingAddressSnapshot: {
          firstName: address.firstName,
          lastName: address.lastName,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        notes: dto.notes ?? null,
      });
      const savedOrder = await em.save(order);

      // Create order items (price snapshot locked at checkout)
      for (const cartItem of cart.items) {
        const variant = cartItem.variant;
        const product = variant.product;

        const item = em.create(OrderItem, {
          orderId: savedOrder.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: (parseFloat(cartItem.unitPrice) * cartItem.quantity).toFixed(2),
        });
        await em.save(item);
      }

      // Record initial status history
      await em.save(
        em.create(OrderStatusHistory, {
          orderId: savedOrder.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          changedBy: null,
          notes: 'Order created',
        }),
      );

      // Clear the cart (BR-24)
      await em.delete(CartItem, { cartId: cart.id });

      return em.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'statusHistory'],
      }) as Promise<Order>;
    });
  }

  /**
   * List orders for the authenticated customer.
   */
  async findMyOrders(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.orderRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  /**
   * Get order detail — customer can only see their own orders.
   */
  async findOne(id: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'statusHistory', 'shippingAddress'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    return order;
  }

  /**
   * Customer cancel — only allowed when status is `pending` and order belongs to user.
   */
  async cancelMyOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new UnprocessableEntityException(
        'Order can only be cancelled while in pending status',
      );
    }

    return this.transitionStatus(order, OrderStatus.CANCELLED, userId, 'Cancelled by customer');
  }

  // ---------- Admin operations ----------

  /**
   * List all orders for admin with optional filters.
   */
  async findAll(
    pagination: PaginationDto,
    filters: {
      status?: OrderStatus;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.userId) {
      qb.andWhere('order.user_id = :userId', { userId: filters.userId });
    }
    if (filters.dateFrom) {
      qb.andWhere('order.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  /**
   * Admin: get any order detail.
   */
  async findOneAdmin(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'statusHistory', 'shippingAddress', 'user'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  /**
   * Admin: transition order to a new status (validated against allowed transitions).
   */
  async updateStatus(
    orderId: string,
    adminUserId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    return this.transitionStatus(order, dto.status, adminUserId, dto.notes);
  }

  // ---------- Private helpers ----------

  private async transitionStatus(
    order: Order,
    targetStatus: OrderStatus,
    actorId: string,
    notes?: string,
  ): Promise<Order> {
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(targetStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition from "${order.status}" to "${targetStatus}"`,
      );
    }

    return this.dataSource.transaction(async (em) => {
      const prevStatus = order.status;
      order.status = targetStatus;
      await em.save(order);

      // Record in history (BR-31)
      await em.save(
        em.create(OrderStatusHistory, {
          orderId: order.id,
          fromStatus: prevStatus,
          toStatus: targetStatus,
          changedBy: actorId,
          notes: notes ?? null,
        }),
      );

      // Stock management on confirmed (BR-16)
      if (targetStatus === OrderStatus.CONFIRMED) {
        const items = await em.find(OrderItem, { where: { orderId: order.id } });
        for (const item of items) {
          await em
            .createQueryBuilder()
            .update(Inventory)
            .set({
              quantity: () => `quantity - ${item.quantity}`,
              reserved: () => `GREATEST(reserved - ${item.quantity}, 0)`,
            })
            .where('variant_id = :variantId', { variantId: item.variantId })
            .execute();
        }
      }

      // Release reservation on cancel (BR-30)
      if (
        targetStatus === OrderStatus.CANCELLED &&
        [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(
          prevStatus as OrderStatus,
        )
      ) {
        const items = await em.find(OrderItem, { where: { orderId: order.id } });
        for (const item of items) {
          // If confirmed: reverse the quantity decrement AND reserved decrement
          if (prevStatus === OrderStatus.CONFIRMED || prevStatus === OrderStatus.PROCESSING) {
            await em
              .createQueryBuilder()
              .update(Inventory)
              .set({
                quantity: () => `quantity + ${item.quantity}`,
              })
              .where('variant_id = :variantId', { variantId: item.variantId })
              .execute();
          }
        }
      }

      return em.findOne(Order, {
        where: { id: order.id },
        relations: ['items', 'statusHistory'],
      }) as Promise<Order>;
    });
  }

  private async generateOrderNumber(em: EntityManager): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Count orders created today to get sequence
    const count = await em
      .createQueryBuilder(Order, 'order')
      .where("DATE(order.created_at) = CURRENT_DATE")
      .getCount();

    const seq = String(count + 1).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
  }
}
