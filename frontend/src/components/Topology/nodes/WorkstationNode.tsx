import { Desktop } from 'phosphor-react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function WorkstationNode(props: NodeProps) {
  return <BaseNode {...props} icon={<Desktop weight="bold" />} isConnectable={props.isConnectable} />
}
