import { z } from "zod";
import { deliveryInfoSchema } from "./orders";

// Public customer website: a guest browses the branch's public menu and
// places an order for takeaway or delivery. The order arrives as channel
// ONLINE with acceptance PENDING, so staff must accept it on the KDS
// before it reaches the kitchen (same gate as the kiosk and QR table flows).
export const publicWebsiteItemSchema = z.object({
  menuItemId: z.string().min(1).max(64),
  quantity: z.number().int().positive().max(20),
  modifierIds: z.array(z.string().max(64)).max(30).default([]),
});
export type PublicWebsiteItemDto = z.infer<typeof publicWebsiteItemSchema>;

export const publicWebsiteOrderSchema = z.object({
  // Client-generated idempotency key: a retry after a dropped connection
  // carries the same key and gets the original order back instead of
  // creating a second one.
  clientRequestId: z.string().uuid(),
  guestName: z.string().trim().min(1, "Please enter your name").max(60),
  // TAKEAWAY or DELIVERY. Dine-in is not offered on the public website.
  type: z.enum(["TAKEAWAY", "DELIVERY"]).default("TAKEAWAY"),
  // Required when type is DELIVERY.
  delivery: deliveryInfoSchema.optional(),
  items: z.array(publicWebsiteItemSchema).min(1).max(50),
});
export type PublicWebsiteOrderDto = z.infer<typeof publicWebsiteOrderSchema>;
