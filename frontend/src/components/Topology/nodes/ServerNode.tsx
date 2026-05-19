import { Cpu } from 'phosphor-react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function ServerNode(props: NodeProps) {
  return <BaseNode {...props} icon={<Cpu weight="bold" />} isConnectable={props.isConnectable} />
}
