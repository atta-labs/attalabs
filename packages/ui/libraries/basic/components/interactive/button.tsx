// Pass-through re-export — basic ships the shadcn canonical Button verbatim
// from installed/button.tsx. No call-site extensions live here today; if a
// future variant or behavior is needed for the basic library that isn't in
// the upstream, it goes here so installed/ stays a verbatim CLI paste.
export { Button, buttonVariants } from '../../installed/button'
