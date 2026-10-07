-- A game's recommended retail price (PVP) in euro cents (ADR-0016). Group
-- pages estimate what a person's and a group's collection is worth from it,
-- never from the prices people recorded for their own copies. NULL when no
-- price is known; those games are left out of the estimate.
-- Rollback: ALTER TABLE Game DROP COLUMN retailPriceCents; (only the worth
-- estimate and the admin catalogue read it).

ALTER TABLE Game ADD COLUMN retailPriceCents INTEGER CHECK (retailPriceCents IS NULL OR retailPriceCents >= 0);
