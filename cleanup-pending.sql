-- View pending orders first
SELECT o.id, o.name, o.status, o."createdAt", oi.id as item_id, mi.name as item_name
FROM orders o
JOIN order_items oi ON o.id = oi."orderId"
JOIN menu_items mi ON oi."menuItemId" = mi.id
WHERE o."branchId" = 'cmvwxb0jm001wmd01j1k1b53n'
ORDER BY o."createdAt" DESC;

-- Delete pending orders and their items
-- Step 1: Delete order_items for pending orders
DELETE FROM order_items
WHERE "orderId" IN (
    SELECT o.id FROM orders o WHERE o."branchId" = 'cmvwxb0jm001wmd01j1k1b53n' AND o.status = 'pending'
);

-- Step 2: Delete pending orders
DELETE FROM orders
WHERE "branchId" = 'cmvwxb0jm001wmd01j1k1b53n' AND status = 'pending';

-- Step 3: Verify
SELECT 'Remaining orders:' as info, count(*) as count FROM orders WHERE "branchId" = 'cmvwxb0jm001wmd01j1k1b53n';
SELECT 'Remaining order_items:' as info, count(*) as count FROM order_items WHERE "orderId" IN (SELECT id FROM orders WHERE "branchId" = 'cmvwxb0jm001wmd01j1k1b53n');