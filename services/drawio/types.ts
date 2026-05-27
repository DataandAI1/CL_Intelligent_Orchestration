export interface DrawioExportResult {
  xml: string;
  warnings: string[];
  stats: {
    nodeCount: number;
    edgeCount: number;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  targetId?: string;
}
