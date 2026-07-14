-- Module 15.1 Production Hardening: Database Schema

-- 1. Snapshot Partitioning (Time-based for scalability)
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    kpi_id UUID NOT NULL,
    value NUMERIC NOT NULL,
    period VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    _immutable BOOLEAN DEFAULT TRUE
) PARTITION BY RANGE (timestamp);

-- Example partitions
CREATE TABLE analytics_snapshots_2026_07 PARTITION OF analytics_snapshots
    FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');

-- 2. Materialized View Security & Concurrent Refresh
-- Base Materialized View (No direct RLS support in PG, raw data)
CREATE MATERIALIZED VIEW mv_project_velocity AS
SELECT project_id, organization_id, avg(completion_time) as velocity
FROM analytics_read_tasks
GROUP BY project_id, organization_id;

-- Unique Index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_project_velocity_org_proj 
ON mv_project_velocity (organization_id, project_id);

-- Secure Wrapper View with RLS
CREATE VIEW secure_project_velocity AS
SELECT * FROM mv_project_velocity
WHERE organization_id = current_setting('app.current_organization_id')::UUID;

-- 3. Append-Only Audit Log
CREATE TABLE analytics_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to prevent updates or deletes on audit log
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'analytics_activity is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_analytics_activity_append_only
BEFORE UPDATE OR DELETE ON analytics_activity
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
