import { createToastProvider } from '../../../basic/components/display/toast/toast-provider'
import { Toast } from './toast'

export { useToastContext } from '../../../basic/components/display/toast/toast-provider'
export const ToastProvider = createToastProvider(Toast)
