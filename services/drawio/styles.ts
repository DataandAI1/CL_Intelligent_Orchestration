export const DRAWIO_STYLES = {
  agent: [
    'rounded=1',
    'whiteSpace=wrap',
    'html=1',
    'fillColor=#dae8fc',
    'strokeColor=#6c8ebf',
    'fontStyle=1',
  ].join(';'),

  tool: [
    'rounded=0',
    'whiteSpace=wrap',
    'html=1',
    'fillColor=#d5e8d4',
    'strokeColor=#82b366',
  ].join(';'),

  data_store: [
    'shape=cylinder',
    'whiteSpace=wrap',
    'html=1',
    'boundedLbl=1',
    'backgroundOutline=1',
    'size=15',
    'fillColor=#fff2cc',
    'strokeColor=#d6b656',
  ].join(';'),

  goal: [
    'shape=hexagon',
    'perimeter=hexagonPerimeter2',
    'whiteSpace=wrap',
    'html=1',
    'fixedSize=1',
    'fillColor=#f8cecc',
    'strokeColor=#b85450',
  ].join(';'),

  human: [
    'shape=umlActor',
    'verticalLabelPosition=bottom',
    'verticalAlign=top',
    'html=1',
    'whiteSpace=wrap',
    'fillColor=#e1d5e7',
    'strokeColor=#9673a6',
  ].join(';'),

  edge_default: [
    'endArrow=block',
    'html=1',
    'rounded=1',
    'strokeWidth=2',
    'strokeColor=#808080',
    'fontColor=#B8B8B8',
    'fontSize=10',
  ].join(';'),
} as const;
