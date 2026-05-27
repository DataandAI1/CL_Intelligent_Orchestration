import { NodeType } from '../../types';
import { DRAWIO_STYLES } from './styles';

export function getVertexStyle(type: NodeType): string {
  switch (type) {
    case NodeType.AGENT:
      return DRAWIO_STYLES.agent;
    case NodeType.TOOL:
      return DRAWIO_STYLES.tool;
    case NodeType.DATA:
      return DRAWIO_STYLES.data_store;
    case NodeType.GOAL:
      return DRAWIO_STYLES.goal;
    case NodeType.HUMAN:
      return DRAWIO_STYLES.human;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled NodeType in getVertexStyle: ${_exhaustive}`);
    }
  }
}

export function getDefaultDimensions(type: NodeType): { width: number; height: number } {
  switch (type) {
    case NodeType.AGENT:
    case NodeType.TOOL:
    case NodeType.GOAL:
      return { width: 220, height: 80 };
    case NodeType.DATA:
      return { width: 120, height: 80 };
    case NodeType.HUMAN:
      return { width: 60, height: 100 };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled NodeType in getDefaultDimensions: ${_exhaustive}`);
    }
  }
}
