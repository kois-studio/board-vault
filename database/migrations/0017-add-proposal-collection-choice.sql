-- Where an approved game goes for the person who proposed it (#46): 'shelf'
-- (they own it), 'wishlist', or NULL for neither. The approval transaction
-- adds the new game there.
-- Rollback: ALTER TABLE GameProposal DROP COLUMN addTo; (nothing else reads it).

ALTER TABLE GameProposal ADD COLUMN addTo TEXT CHECK (addTo IN ('shelf', 'wishlist'));
