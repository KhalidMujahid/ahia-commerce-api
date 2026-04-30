import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop()
  entityType?: string;

  @Prop()
  entityId?: string;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
