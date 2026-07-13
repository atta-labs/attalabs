import { Text } from '@atta/ui/shared'
import { GovernanceBadge } from './GovernanceBadge'
import { LightSpeedEraCanvas } from './canvas/LightSpeedEraCanvas'
import { NormalEraCanvas } from './canvas/NormalEraCanvas'

export function TwoErasSection() {
  return (
    // The badge lives OUTSIDE the grid, as a sibling — a 3rd grid item here (even a
    // col-span-full one) stops `auto-fit` from collapsing its empty 3rd track, splitting
    // what should be 2 wide columns into 3 narrow ones and throwing off both canvases'
    // actual positions.
    <div className='relative'>
      <section className='grid grid-cols-[repeat(auto-fit,minmax(min(330px,100%),1fr))] gap-x-8 gap-y-10'>
        <div className='flex flex-col gap-4'>
          <Text as='p' weight='bold' className='text-center font-mono text-xl text-accent'>
            HUMANS CODING
          </Text>
          <NormalEraCanvas />
        </div>

        <div className='flex flex-col gap-4'>
          <Text as='p' weight='bold' className='text-center font-mono text-xl text-accent'>
            AGENTS CODING
          </Text>
          <LightSpeedEraCanvas />
        </div>
      </section>

      {/* Both canvases share the same height and SPHERE.y, and both columns are the
          same total height (header + canvas), so "canvas height - SPHERE.y" measured up
          from the WRAPPER's bottom edge (which coincides with both canvases' bottom
          edges) lands this exactly at sphere level, centered between the two columns. */}
      <div className='pointer-events-none absolute inset-x-0 bottom-[32px] flex justify-center'>
        <div className='pointer-events-auto'>
          <GovernanceBadge />
        </div>
      </div>
    </div>
  )
}
