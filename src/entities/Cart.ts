import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { User } from './User';
import { CartItem } from './CartItem';

export enum CartStatus {
  ACTIVE = 'active',
  ABANDONED = 'abandoned',
  CONVERTED = 'converted'
}

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.ACTIVE
  })
  status: CartStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  sessionId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.carts)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, cartItem => cartItem.cart, { cascade: true })
  items: CartItem[];

  // Virtual fields
  get totalItems(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  get subtotal(): number {
    return this.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
  }

  // Methods
  addItem(productId: string, quantity: number, price: number): CartItem {
    const existingItem = this.items?.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      return existingItem;
    }

    const newItem = new CartItem();
    newItem.cart = this;
    newItem.productId = productId;
    newItem.quantity = quantity;
    newItem.price = price;

    if (!this.items) {
      this.items = [];
    }
    this.items.push(newItem);

    return newItem;
  }

  removeItem(productId: string): void {
    if (this.items) {
      this.items = this.items.filter(item => item.productId !== productId);
    }
  }

  updateItemQuantity(productId: string, quantity: number): void {
    const item = this.items?.find(item => item.productId === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        item.quantity = quantity;
      }
    }
  }

  clear(): void {
    this.items = [];
  }

  markAsAbandoned(): void {
    this.status = CartStatus.ABANDONED;
  }

  markAsConverted(): void {
    this.status = CartStatus.CONVERTED;
  }
}