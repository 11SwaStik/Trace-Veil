import { WifiHigh } from 'phosphor-react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function AttackerNode(props: NodeProps) {
  return <BaseNode {...props} icon={<WifiHigh weight="bold" />} isConnectable={props.isConnectable} />
}
