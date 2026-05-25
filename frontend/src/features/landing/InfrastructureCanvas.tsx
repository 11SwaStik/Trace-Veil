import { motion } from 'framer-motion'
import AttackVisualization from './AttackVisualization'

interface InfrastructureCanvasProps {
  isLoaded: boolean
}

export default function InfrastructureCanvas({ isLoaded }: InfrastructureCanvasProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: 0.8 }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 3
      }}
    >
      <AttackVisualization isLoaded={isLoaded} />
    </motion.div>
  )
}
