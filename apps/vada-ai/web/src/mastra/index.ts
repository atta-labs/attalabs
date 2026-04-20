import { Mastra } from '@mastra/core'
import { Observability, SensitiveDataFilter } from '@mastra/observability'
import { LangfuseExporter } from '@mastra/langfuse'
import { crucibleWorkflow } from '@/engine/workflow/crucible-workflow'

const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY
const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY
const langfuseBaseUrl = process.env.LANGFUSE_BASE_URL

const observability =
  langfusePublicKey && langfuseSecretKey
    ? new Observability({
        configs: {
          default: {
            serviceName: 'vada-ai',
            exporters: [
              new LangfuseExporter({
                publicKey: langfusePublicKey,
                secretKey: langfuseSecretKey,
                ...(langfuseBaseUrl ? { baseUrl: langfuseBaseUrl } : {})
              })
            ],
            spanOutputProcessors: [
              new SensitiveDataFilter({
                // sensitiveFields REPLACES defaults — include all defaults + cookie.
                // Defaults: password, token, secret, key, apikey, auth, authorization,
                //           bearer, bearertoken, jwt, credential, clientsecret, privatekey,
                //           refresh, ssn
                // Added: cookie (Clerk session tokens), apiKey (explicit camelCase form)
                sensitiveFields: [
                  'password',
                  'token',
                  'secret',
                  'key',
                  'apikey',
                  'apiKey',
                  'auth',
                  'authorization',
                  'bearer',
                  'bearertoken',
                  'jwt',
                  'credential',
                  'clientsecret',
                  'privatekey',
                  'refresh',
                  'ssn',
                  'cookie'
                ]
              })
            ]
          }
        }
      })
    : undefined

export const mastra = new Mastra({
  workflows: {
    crucible: crucibleWorkflow
  },
  ...(observability ? { observability } : {})
})
