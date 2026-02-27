// Channel types
export type Channel = 'fb_messenger_dm' | 'ig_dm' | 'fb_comment' | 'ig_comment';

// Message types
export type MessageType =
  | 'dm_text'
  | 'dm_attachment'
  | 'comment_text'
  | 'comment_attachment'
  | 'system';

// Direction
export type Direction = 'inbound' | 'outbound';

// Message source
export type MessageSource = 'meta_webhook' | 'meta_backfill' | 'admin' | 'ai';

// Message status
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

// Conversation status
export type ConversationStatus = 'open' | 'waiting_approval' | 'automated' | 'paused' | 'closed';

// Admin role
export type AdminRole = 'admin' | 'viewer' | 'manager';

// KB item type
export type KBItemType = 'tone' | 'policy' | 'faq' | 'pricing' | 'schedule' | 'template' | 'sop';

// Task type
export type TaskType = 'SEND_DM' | 'REPLY_COMMENT' | 'RETRY' | 'WATCHDOG';

// Task status
export type TaskStatus = 'queued' | 'processing' | 'done' | 'failed';

// AI Draft status
export type DraftStatus = 'proposed' | 'approved' | 'sent' | 'rejected' | 'edited';

// AI Draft intent
export type DraftIntent = 'pricing' | 'booking' | 'schedule' | 'reschedule' | 'faq' | 'other';

// Booking state
export type BookingState =
  | 'none'
  | 'collecting_details'
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled';

// Booking service type
export type BookingServiceType = 'ceramics' | 'yoga' | 'other';

// Booking payment status
export type BookingPaymentStatus = 'none' | 'sent_details' | 'paid';

// AI Draft action type
export type DraftActionType =
  | 'NONE'
  | 'BOOK'
  | 'ASK_DETAILS'
  | 'SEND_PAYMENT_INFO'
  | 'REPLY_COMMENT';

// MongoDB ObjectId type
export type ObjectId = string;
