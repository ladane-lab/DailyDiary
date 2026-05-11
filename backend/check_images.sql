SELECT e.id, e."isPublic", e."createdAt", COUNT(i.id) as image_count 
FROM "Entry" e 
LEFT JOIN "Image" i ON i."entryId" = e.id 
WHERE e."isPublic" = true 
GROUP BY e.id 
ORDER BY e."createdAt" DESC 
LIMIT 10;
