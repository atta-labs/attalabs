import { BreadthStrip } from '@/components/home/breadth-strip'
import { Engine } from '@/components/home/engine'
import { HomeHero } from '@/components/home/HomeHero'
import { PaliFooter } from '@/components/home/pali-footer'
import { ThreeStates } from '@/components/home/three-states'
import { Workshop } from '@/components/home/workshop'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className='relative z-10 bg-background'>
        <ThreeStates />
        <BreadthStrip />
        <Engine />
        <Workshop />
        <PaliFooter />
      </div>
    </>
  )
}
