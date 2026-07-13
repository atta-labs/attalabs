// retro now ships its own Radix-flavor checkbox upstream (installed/checkbox).
// Its CheckedState semantics match the shared CheckboxProps contract and it
// carries its own retro border styling, so this is a thin re-export — no
// className adaptation is needed (the old border-foreground override existed
// only because retro previously borrowed basic's checkbox).
export { Checkbox } from '../../installed/checkbox'
