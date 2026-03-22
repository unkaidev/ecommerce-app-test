import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from '../products/entities/inventory.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export interface CartWithTotals {
  cart: Cart;
  subtotal: number;
  totalItems: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get or create a cart for the authenticated user.
   * Returns the cart with computed totals (server-side, never trust client).
   */
  async getCart(userId: string): Promise<CartWithTotals> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });

    if (!cart) {
      cart = this.cartRepo.create({ userId });
      cart = await this.cartRepo.save(cart);
      cart.items = [];
    }

    return this.computeTotals(cart);
  }

  /**
   * Add item to cart or update quantity if variant already present (upsert).
   * Checks available stock (quantity - reserved) before proceeding.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartWithTotals> {
    return this.dataSource.transaction(async (em) => {
      // Verify the variant exists and is active
      const variant = await em.findOne(ProductVariant, {
        where: { id: dto.variantId, isActive: true },
        relations: ['product'],
      });
      if (!variant || !variant.product?.isActive) {
        throw new NotFoundException(`Variant #${dto.variantId} not found or unavailable`);
      }

      // Check available inventory (SELECT FOR UPDATE to prevent race conditions)
      const inv = await em
        .createQueryBuilder(Inventory, 'inv')
        .setLock('pessimistic_write')
        .where('inv.variant_id = :variantId', { variantId: dto.variantId })
        .getOne();

      const available = inv ? inv.quantity - inv.reserved : 0;
      if (available < dto.quantity) {
        throw new UnprocessableEntityException(
          `Only ${available} units available for variant #${dto.variantId}`,
        );
      }

      // Get or create cart
      let cart = await em.findOne(Cart, { where: { userId } });
      if (!cart) {
        cart = em.create(Cart, { userId });
        cart = await em.save(cart);
      }

      // Upsert: update quantity if item already in cart
      let item = await em.findOne(CartItem, {
        where: { cartId: cart.id, variantId: dto.variantId },
      });

      const effectivePrice = variant.priceOverride ?? variant.product.price;

      if (item) {
        const newQty = item.quantity + dto.quantity;
        if (newQty > 100) {
          throw new UnprocessableEntityException('Quantity cannot exceed 100 per item');
        }
        item.quantity = newQty;
        await em.save(item);
      } else {
        item = em.create(CartItem, {
          cartId: cart.id,
          variantId: dto.variantId,
          quantity: dto.quantity,
          unitPrice: effectivePrice,
          notes: dto.notes ?? null,
        });
        await em.save(item);
      }

      // Reload full cart
      const fullCart = await em.findOne(Cart, {
        where: { id: cart.id },
        relations: ['items', 'items.variant', 'items.variant.product'],
      });

      return this.computeTotals(fullCart!);
    });
  }

  /**
   * Update an existing cart item's quantity.
   */
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartWithTotals> {
    const { cart, item } = await this.findItemAndAssertOwnership(userId, itemId);

    // Check available stock
    const inv = await this.inventoryRepo.findOne({ where: { variantId: item.variantId } });
    const available = inv ? inv.quantity - inv.reserved : 0;
    if (available < dto.quantity) {
      throw new UnprocessableEntityException(
        `Only ${available} units available`,
      );
    }

    item.quantity = dto.quantity;
    await this.itemRepo.save(item);

    return this.getCart(userId);
  }

  /**
   * Remove a specific item from the cart.
   */
  async removeItem(userId: string, itemId: string): Promise<CartWithTotals> {
    const { item } = await this.findItemAndAssertOwnership(userId, itemId);
    await this.itemRepo.remove(item);
    return this.getCart(userId);
  }

  /**
   * Clear all items from the cart.
   */
  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (cart) {
      await this.itemRepo.delete({ cartId: cart.id });
    }
  }

  /**
   * Apply a coupon code to the cart.
   * Full validation is deferred to the orders service at checkout.
   * Here we only store the code.
   */
  async applyCoupon(userId: string, couponCode: string): Promise<CartWithTotals> {
    let cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
    }
    cart.couponCode = couponCode.toUpperCase();
    await this.cartRepo.save(cart);
    return this.getCart(userId);
  }

  /**
   * Remove applied coupon from the cart.
   */
  async removeCoupon(userId: string): Promise<CartWithTotals> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (cart) {
      cart.couponCode = null;
      await this.cartRepo.save(cart);
    }
    return this.getCart(userId);
  }

  // ---------- Private helpers ----------

  private computeTotals(cart: Cart): CartWithTotals {
    const subtotal = (cart.items ?? []).reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    const totalItems = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);

    return { cart, subtotal, totalItems };
  }

  private async findItemAndAssertOwnership(
    userId: string,
    itemId: string,
  ): Promise<{ cart: Cart; item: CartItem }> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!item) throw new NotFoundException(`Cart item #${itemId} not found`);

    const cart = item.cart;
    if (cart.userId !== userId) {
      throw new ForbiddenException('You do not own this cart item');
    }

    return { cart, item };
  }
}
