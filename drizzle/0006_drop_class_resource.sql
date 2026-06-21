-- Remove the retired 'class-resource' intent from every book's intents array.
-- Rebuilds each affected array via json_each + json_group_array, excluding the
-- value, and collapses to '[]' when it was the only entry. Only rows that
-- actually contain the value are touched; book rows, visibility and ownership
-- are left unchanged.
UPDATE `books`
SET intents = (
  SELECT json_group_array(value)
  FROM json_each(`books`.intents)
  WHERE value <> 'class-resource'
)
WHERE EXISTS (
  SELECT 1 FROM json_each(`books`.intents) WHERE value = 'class-resource'
);
