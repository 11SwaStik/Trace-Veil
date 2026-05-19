import { Database } from 'phosphor-react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function DatabaseNode(props: NodeProps) {
  return <BaseNode {...props} icon={<Database weight="bold" />} isConnectable={props.isConnectable} />
}
