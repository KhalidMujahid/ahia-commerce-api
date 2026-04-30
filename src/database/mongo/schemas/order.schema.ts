import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  WALLET = 'wallet',
  PAYSTACK = 'paystack',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum DeliveryType {
  LOCAL = 'local',
  INTERSTATE = 'interstate',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  company?: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  addressLine1: string;

  @Prop()
  addressLine2?: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop()
  postalCode?: string;

  @Prop({ required: true })
  country: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ _id: false })
export class OrderTimeline {
  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ required: true })
  date: Date;

  @Prop()
  description?: string;

  @Prop()
  note?: string;
}

export const OrderTimelineSchema = SchemaFactory.createForClass(OrderTimeline);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant' })
  variantId?: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  variantName?: string;

  @Prop()
  image?: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  total: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class VendorOrder {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true })
  vendorName: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop()
  shippingCost: number;

  @Prop()
  tax: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop()
  shippingMethod?: string;

  @Prop()
  trackingNumber?: string;

  @Prop()
  estimatedDelivery?: Date;

  @Prop()
  deliveredAt?: Date;
}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorOrder);

@Schema({ _id: false })
export class DeliveryAssignment {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  companyName: string;

  @Prop()
  riderId?: string;

  @Prop()
  riderName?: string;

  @Prop({ required: true, enum: DeliveryType })
  deliveryType: DeliveryType;

  @Prop({ required: true, enum: DeliveryStatus, default: DeliveryStatus.ASSIGNED })
  status: DeliveryStatus;

  @Prop()
  estimatedDeliveryTime?: string;

  @Prop({ default: 0 })
  companyScore?: number;

  @Prop({ default: 0 })
  riderScore?: number;

  @Prop()
  assignedAt?: Date;

  @Prop()
  lastUpdatedAt?: Date;

  @Prop()
  notes?: string;
}

export const DeliveryAssignmentSchema =
  SchemaFactory.createForClass(DeliveryAssignment);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: [VendorOrderSchema] })
  vendorOrders: VendorOrder[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop()
  transactionId?: string;

  @Prop({ required: true, enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @Prop({ required: true, type: ShippingAddressSchema })
  shippingAddress: ShippingAddress;

  @Prop()
  billingAddress?: ShippingAddress;

  @Prop()
  shippingCost: number;

  @Prop()
  tax: number;

  @Prop()
  discount: number;

  @Prop()
  discountCode?: string;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ enum: DeliveryType })
  deliveryType?: DeliveryType;

  @Prop({ enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  deliveryStatus?: DeliveryStatus;

  @Prop({ type: DeliveryAssignmentSchema })
  deliveryAssignment?: DeliveryAssignment;

  @Prop({ type: [OrderTimelineSchema], default: [] })
  timeline: OrderTimeline[];

  @Prop()
  notes?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundedAmount?: number;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
