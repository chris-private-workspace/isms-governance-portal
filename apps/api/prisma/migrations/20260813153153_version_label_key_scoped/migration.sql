-- Close an existence oracle in the version-label unique key.
--
-- ⛔ WHAT WAS MEASURED (W10 Day 2, against this database, before any repository
-- existed to be blamed). rm_report_versions_report_id_version_label_key was
-- caller-reachable: version_label and report_id both come from the request body.
-- Unique-index enforcement does not respect RLS -- the same property W07
-- measured for referential integrity -- and it runs BEFORE the composite foreign
-- key that refuses another entity's report. Two probes, one difference:
--
--   entity A inserts into entity B's report, label '2025.7' (B HAS it)
--     -> 23505, DETAIL: Key (report_id, version_label)=(<B's report>, 2025.7)
--        already exists
--   entity A inserts into entity B's report, label '9.9' (B does NOT have it)
--     -> 23503, foreign key violation
--
-- The difference IS the oracle: B's entire version history, one guess at a time,
-- with the id and label echoed back. 約束 8 exists to make exactly this
-- unavailable, and no application code could have closed it -- the answer is
-- decided before anything this project wrote gets to see the error.
--
-- ⭐ THE FIX IS REDUNDANCY THAT IS DELIBERATE, the same shape as 約束 8's rule
-- that child tables carry their own org_entity_id. Putting org_entity_id in the
-- key means a probe carrying the CALLER's entity can never collide with another
-- entity's rows, so both cases now fall through to the foreign key and answer
-- 23503 -- indistinguishable, which is the point.
--
-- Uniqueness is not weakened. rm_report_versions_report_id_org_entity_id_fkey
-- forces a version's org_entity_id to equal its report's, so among rows that can
-- legitimately exist, (report_id, version_label) remains unique. The extra column
-- only ever separates rows that were never going to be committed.
--
-- ⚠️ Note what did NOT need this treatment, so the next unique index is judged
-- rather than copied: ref_code is server-issued from an entity-scoped counter and
-- `id` is server-generated, so neither is a value a caller can choose to probe
-- with. A unique key is an oracle only when the caller supplies the tuple.
DROP INDEX "rm_report_versions_report_id_version_label_key";

CREATE UNIQUE INDEX "rm_report_versions_report_id_org_entity_id_version_label_key"
  ON "rm_report_versions"("report_id", "org_entity_id", "version_label");
