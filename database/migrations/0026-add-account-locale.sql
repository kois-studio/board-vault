-- The interface language a person chose (ADR-0024, #174), so it follows them
-- across devices. NULL until they choose one or sign up in a language; the
-- API validates the value (a CHECK would need a rebuild of Account to add a
-- language, and Account is never rebuilt).
-- Rollback: ALTER TABLE Account DROP COLUMN locale; (everyone goes back to
-- the language of the address and the bv_lang cookie).

ALTER TABLE Account ADD COLUMN locale TEXT;
