import { RoundView } from './RoundView'

export function Round(props: any) {
  return (
    <div className='w-full flex justify-center py-20'>
      {/* This RoundView now "floats" on the global canvas background */}
      <RoundView
        {...props}
        allEntries={[]}
        size={650} // Ensure this matches your desired ring size
      />
    </div>
  )
}
