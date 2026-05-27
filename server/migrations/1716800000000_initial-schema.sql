-- Up Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Projects: top-level container
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Requirements (inputs)
CREATE TYPE requirement_category AS ENUM (
  'goals',
  'processes',
  'use_cases',
  'technologies',
  'data_sources',
  'human_in_the_loop'
);

CREATE TABLE requirement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category requirement_category NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirement_items_project
  ON requirement_items (project_id, category, position);

-- Design nodes (inputs)
CREATE TYPE node_type AS ENUM ('AGENT', 'TOOL', 'DATA', 'GOAL', 'HUMAN');

CREATE TABLE design_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_node_id TEXT NOT NULL,
  type node_type NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  instructions TEXT,
  node_schema TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, client_node_id)
);

CREATE INDEX idx_design_nodes_project ON design_nodes (project_id);

-- Design edges (inputs)
CREATE TABLE design_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_edge_id TEXT NOT NULL,
  source_client_node_id TEXT NOT NULL,
  target_client_node_id TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, client_edge_id)
);

CREATE INDEX idx_design_edges_project ON design_edges (project_id);

-- Artifacts (outputs)
CREATE TYPE artifact_kind AS ENUM (
  'project_plan',
  'simulation',
  'pattern_comparison',
  'drawio_xml',
  'markdown_export',
  'architecture_analysis'
);

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind artifact_kind NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_project_kind
  ON artifacts (project_id, kind, created_at DESC);

-- Down Migration

DROP TABLE IF EXISTS artifacts;
DROP TYPE  IF EXISTS artifact_kind;

DROP TABLE IF EXISTS design_edges;
DROP TABLE IF EXISTS design_nodes;
DROP TYPE  IF EXISTS node_type;

DROP TABLE IF EXISTS requirement_items;
DROP TYPE  IF EXISTS requirement_category;

DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
DROP TABLE IF EXISTS projects;
DROP FUNCTION IF EXISTS set_updated_at();
