import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { OrderItem } from './OrderItem';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  CASH_ON_DELIVERY = 'cash_on_delivery'
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

@Entity('orders')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', unique: true })
  orderNumber: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'varchar', nullable: true })
  paymentIntentId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'simple-json' })
  shippingAddress: ShippingAddress;

  @Column({ type: 'simple-json', nullable: true })
  billingAddress?: ShippingAddress;

  @Column({ type: 'varchar', nullable: true })
  trackingNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  carrier?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  items: OrderItem[];

  // Methods
  generateOrderNumber(): void {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    this.orderNumber = `ORD-${timestamp}-${random}`.toUpperCase();
  }

  calculateTotal(): void {
    this.total = Number((
      this.subtotal + 
      this.taxAmount + 
      this.shippingAmount - 
      this.discountAmount
    ).toFixed(2));
  }

  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.PROCESSING].includes(this.status);
  }

  cancel(reason?: string): void {
    if (!this.canBeCancelled()) {
      throw new Error('Order cannot be cancelled in current status');
    }
    this.status = OrderStatus.CANCELLED;
    this.cancellationReason = reason;
    this.cancelledAt = new Date();
  }

  markAsShipped(trackingNumber?: string, carrier?: string): void {
    this.status = OrderStatus.SHIPPED;
    this.trackingNumber = trackingNumber;
    this.carrier = carrier;
    this.shippedAt = new Date();
  }

  markAsDelivered(): void {
    this.status = OrderStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  markAsPaid(paymentIntentId?: string): void {
    this.paymentStatus = PaymentStatus.PAID;
    this.paymentIntentId = paymentIntentId;
  }
}