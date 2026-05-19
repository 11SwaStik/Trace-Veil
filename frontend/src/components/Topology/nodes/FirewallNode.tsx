import { Shield } from 'phosphor-react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function FirewallNode(props: NodeProps) {
  return <BaseNode {...props} icon={<Shield weight="bold" />} isConnectable={props.isConnectable} />
}
