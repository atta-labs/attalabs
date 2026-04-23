import { Text } from '@atta/ui/shared'
import type { FaceStyle } from '@vada/agents'
import { FaceStylePicker } from './FaceStylePicker'

interface AgentStyleSectionProps {
  faceStyle: FaceStyle
  onFaceStyleChanged: (style: FaceStyle) => void
}

export function AgentStyleSection({ faceStyle, onFaceStyleChanged }: AgentStyleSectionProps) {
  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-foreground/50'>
          Agent Style
        </Text>
        <Text as='p' size='sm' muted>
          Choose how agent faces are rendered across the app. Applied globally to all agents.
        </Text>
      </div>

      <FaceStylePicker value={faceStyle} onChange={onFaceStyleChanged} />
    </div>
  )
}
