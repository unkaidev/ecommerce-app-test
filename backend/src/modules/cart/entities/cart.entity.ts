import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Index('idx_carts_user_id', ['userId'], { unique: true })
@Index('idx_carts_session_id', ['sessionId'], { unique: true })
@Index('idx_carts_expires_at', ['expiresAt'])
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 128, nullable: true, unique: true })
  sessionId: string | null;

  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];
}
