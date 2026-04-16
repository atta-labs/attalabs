'use client'

import { Box, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { type FileInputProps, useClient } from 'sanity'

/**
 * Custom file input that renders an inline SVG preview beneath the default
 * file controls. Intended for branding SVG fields (logos, lockups).
 *
 * SVGs are stored as Sanity `file` assets (not `image`) to preserve the raw
 * markup. Sanity's default file widget only shows the filename, so without
 * this component editors cannot visually confirm what they've uploaded.
 */
export function SvgFileInput(props: FileInputProps) {
  const client = useClient({ apiVersion: '2024-01-01' })
  const assetRef = props.value?.asset?._ref
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!assetRef) {
      setUrl(null)
      return
    }
    setLoading(true)
    let cancelled = false
    client
      .fetch<string | null>('*[_id == $id][0].url', { id: assetRef })
      .then((fetched) => {
        if (!cancelled) setUrl(fetched ?? null)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assetRef, client])

  return (
    <Stack space={3}>
      {props.renderDefault(props)}
      {assetRef && (
        <Card padding={3} radius={2} shadow={1} tone='transparent'>
          <Stack space={2}>
            <Text size={1} muted>
              Preview
            </Text>
            <Flex align='center' justify='center' style={{ minHeight: 160 }}>
              {url ? (
                <Box
                  style={{
                    width: '100%',
                    maxHeight: 240,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={url}
                    alt=''
                    style={{
                      maxWidth: '100%',
                      maxHeight: 240,
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              ) : (
                <Text size={1} muted>
                  {loading ? 'Loading preview…' : 'Preview unavailable'}
                </Text>
              )}
            </Flex>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
