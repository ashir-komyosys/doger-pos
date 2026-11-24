import { z } from "zod";
import { deliveryInfoSchema } from "./orders";

export const storefrontRegisterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});
export const storefrontLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
export const storefrontOrderSchema = z.object({
  clientRequestId: z.string().uuid(),
  type: z.enum(["TAKEAWAY", "DELIVERY"]),
  phone: z.string().trim().min(6).max(20),
  delivery: deliveryInfoSchema.optional(),
  items: z.array(z.object({
    menuItemId: z.string().min(1).max(64),
    quantity: z.number().int().positive().max(20),
    modifierIds: z.array(z.string().max(64)).max(30).default([]),
  })).min(1).max(50),
});

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

export const blogPostStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

const blogImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value.startsWith("/api/uploads/") || /^https:\/\//i.test(value),
    "Use an HTTPS image URL or a restaurant upload URL",
  )
  .nullable()
  .optional();

export const blogPostSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase, hyphenated URL slug"),
  excerpt: z.string().trim().min(10).max(320),
  content: z.string().trim().min(40).max(40000),
  coverImageUrl: blogImageUrlSchema,
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(170).nullable().optional(),
  status: blogPostStatusSchema.default("DRAFT"),
});
export type BlogPostDto = z.infer<typeof blogPostSchema>;
export const blogPostUpdateSchema = blogPostSchema.partial();
export type BlogPostUpdateDto = z.infer<typeof blogPostUpdateSchema>;
