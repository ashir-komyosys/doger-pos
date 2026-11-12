-- Check table assignments / floor plan data
SELECT * FROM "tables"."floors" WHERE "branchId" = 'cmvwxb0jm001wmd01j1k1b53n';

-- Check orders with table assignments
SELECT o.id, o.status, t.name as table_name, oi.id as item_id, mi.name as item_name
FROM orders o
JOIN order_items oi ON o.id = oi."orderId"
JOIN menu_items mi ON oi."menuItemId" = mi.id
LEFT JOIN "tables"."floors" f ON o."tableId" = f.id
WHERE o."branchId" = 'cmvwxb0jm001wmd01j1k1b53n'
ORDER BY o."createdAt" DESC;

-- Also check if there's a table_id column on orders
SELECT o.id, o."tableId", o.status
FROM orders o
WHERE o."branchId" = 'cmvwxb0jm001wmd01j1k1b53n';