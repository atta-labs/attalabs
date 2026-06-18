import { McpDeveloperSection } from './sections/McpDeveloperSection'
import { NegationsSection } from './sections/NegationsSection'
import { SeeItWorkSection } from './sections/SeeItWorkSection'
import { TryItSection } from './sections/TryItSection'
import { WhatItIsSection } from './sections/WhatItIsSection'
import { WhyItWorksSection } from './sections/WhyItWorksSection'

export function SectionsWithCanvas() {
  return (
    <div className='relative z-10'>
      <WhatItIsSection />
      <WhyItWorksSection />
      <NegationsSection />
      <SeeItWorkSection />
      <TryItSection />
      <McpDeveloperSection />
    </div>
  )
}
