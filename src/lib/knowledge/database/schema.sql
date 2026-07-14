-- Knowledge Graph Module (Module 18) Database Schema
-- Includes append-only structures, checkpointing, partitioning, and RLS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- Partitioned Base Tables
-- =========================================================================

-- 1. Nodes (Append-Only versions are in knowledge_versions)
CREATE TABLE knowledge_nodes (
    internal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    layer VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    properties JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kn_org ON knowledge_nodes(organization_id);
CREATE INDEX idx_kn_entity ON knowledge_nodes(entity_type, entity_id);

-- 2. Edges (Partitioned by organization_id)
CREATE TABLE knowledge_edges (
    id UUID DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL,
    target_node_id UUID NOT NULL,
    edge_type VARCHAR(100) NOT NULL,
    organization_id UUID NOT NULL,
    weight NUMERIC(10, 4),
    confidence NUMERIC(5, 4),
    created_by UUID,
    source_module VARCHAR(100),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    properties JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, organization_id),
    CONSTRAINT uq_edge_version UNIQUE(id, organization_id, version)
) PARTITION BY HASH (organization_id);

-- Create 4 partitions for edges as an example
CREATE TABLE knowledge_edges_p0 PARTITION OF knowledge_edges FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE knowledge_edges_p1 PARTITION OF knowledge_edges FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE knowledge_edges_p2 PARTITION OF knowledge_edges FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE knowledge_edges_p3 PARTITION OF knowledge_edges FOR VALUES WITH (MODULUS 4, REMAINDER 3);

CREATE INDEX idx_ke_source ON knowledge_edges(source_node_id, edge_type);
CREATE INDEX idx_ke_target ON knowledge_edges(target_node_id, edge_type);

-- 3. Versions (Append-only history, Partitioned by organization_id)
CREATE TABLE knowledge_versions (
    id UUID DEFAULT uuid_generate_v4(),
    entity_ref_id UUID NOT NULL, -- references node or edge ID
    entity_kind VARCHAR(50) NOT NULL, -- 'NODE' or 'EDGE'
    version INTEGER NOT NULL,
    organization_id UUID NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, organization_id)
) PARTITION BY HASH (organization_id);

CREATE TABLE knowledge_versions_p0 PARTITION OF knowledge_versions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE knowledge_versions_p1 PARTITION OF knowledge_versions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE knowledge_versions_p2 PARTITION OF knowledge_versions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE knowledge_versions_p3 PARTITION OF knowledge_versions FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- 4. Projection Logs (Partitioned by organization_id)
CREATE TABLE knowledge_projection_logs (
    id UUID DEFAULT uuid_generate_v4(),
    job_id UUID,
    organization_id UUID NOT NULL,
    event_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, organization_id)
) PARTITION BY HASH (organization_id);

CREATE TABLE knowledge_projection_logs_p0 PARTITION OF knowledge_projection_logs FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE knowledge_projection_logs_p1 PARTITION OF knowledge_projection_logs FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE knowledge_projection_logs_p2 PARTITION OF knowledge_projection_logs FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE knowledge_projection_logs_p3 PARTITION OF knowledge_projection_logs FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- =========================================================================
-- Standard Tables
-- =========================================================================

CREATE TABLE knowledge_edge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    allowed_source_nodes JSONB DEFAULT '[]',
    allowed_target_nodes JSONB DEFAULT '[]',
    cardinality VARCHAR(10) DEFAULT 'N:M',
    required_properties JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_node_labels (
    node_id UUID NOT NULL,
    label_id UUID NOT NULL,
    PRIMARY KEY (node_id, label_id)
);

CREATE TABLE knowledge_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id UUID NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB,
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    snapshot_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    embedding vector(1536), -- Reserved for pgvector
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_projection_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE knowledge_projection_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL,
    event_sequence BIGINT NOT NULL,
    projection_version INTEGER NOT NULL,
    checkpoint_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    module_source VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checkpoints_sequence ON knowledge_projection_checkpoints(event_sequence);

CREATE TABLE knowledge_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL,
    user_id UUID,
    role VARCHAR(50),
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(255) NOT NULL,
    performed_by UUID,
    organization_id UUID NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- RLS Policies
-- =========================================================================
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nodes isolated by organization" ON knowledge_nodes FOR SELECT USING (organization_id = (select auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Edges isolated by organization" ON knowledge_edges FOR SELECT USING (organization_id = (select auth.jwt() ->> 'org_id')::uuid);

-- =========================================================================
-- Secure Recursive Traversal Function
-- =========================================================================
-- Runs securely enforcing RLS explicitly, ensuring cross-organization leakage is prevented
CREATE OR REPLACE FUNCTION traverse_graph_secure(start_node_id UUID, max_depth INT)
RETURNS TABLE (
    node_id UUID,
    depth INT,
    path UUID[]
)
LANGUAGE sql
SECURITY INVOKER -- Explicitly runs with invoker privileges so RLS applies
AS $$
    WITH RECURSIVE graph_traversal AS (
        SELECT 
            internal_id as current_node_id,
            1 as depth,
            ARRAY[internal_id] as path
        FROM knowledge_nodes 
        WHERE internal_id = start_node_id
          AND is_deleted = false
          
        UNION ALL
        
        SELECT 
            CASE 
                WHEN e.source_node_id = gt.current_node_id THEN e.target_node_id 
                ELSE e.source_node_id 
            END as current_node_id,
            gt.depth + 1,
            gt.path || CASE 
                WHEN e.source_node_id = gt.current_node_id THEN e.target_node_id 
                ELSE e.source_node_id 
            END
        FROM graph_traversal gt
        JOIN knowledge_edges e ON (e.source_node_id = gt.current_node_id OR e.target_node_id = gt.current_node_id)
        WHERE gt.depth < max_depth
          AND e.is_deleted = false
          AND NOT (CASE WHEN e.source_node_id = gt.current_node_id THEN e.target_node_id ELSE e.source_node_id END = ANY(gt.path))
    )
    SELECT current_node_id as node_id, depth, path FROM graph_traversal;
$$;
