import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Cart } from './Cart';
import { Product } from './Product';

@Entity('cart_items')
@Index(['cartId', 'productId'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cartId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'simple-json', nullable: true })
  customization?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Cart, cart => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @ManyToOne(() => Product, product => product.cartItems)
  @JoinColumn({ name: 'productId' })
  product: Product;

  // Virtual fields
  get subtotal(): number {
    return Number((this.quantity * this.price).toFixed(2));
  }

  // Methods
  increaseQuantity(amount: number = 1): void {
    this.quantity += amount;
  }

  decreaseQuantity(amount: number = 1): void {
    this.quantity = Math.max(0, this.quantity - amount);
  }

  updatePrice(newPrice: number): void {
    this.price = newPrice;
  }
}