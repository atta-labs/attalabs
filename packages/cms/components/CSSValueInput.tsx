'use client'

import { Box, Flex, TextInput } from '@sanity/ui'
import { useCallback, useState } from 'react'
import { type StringInputProps, set, unset } from 'sanity'

/**
 * Parse a CSS color value and extract hex color + alpha
 * Returns { hex: '#RRGGBB', alpha: 0-1 } or null if not a simple color
 */
function parseColorWithAlpha(value: string): { hex: string; alpha: number } | null {
  if (!value) return null

  const trimmed = value.trim()

  // Hex colors (3, 4, 6, or 8 digits)
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    if (trimmed.length === 4) {
      return {
        hex: `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`,
        alpha: 1
      }
    }
    if (trimmed.length === 5) {
      const alphaHex = trimmed[4] ?? '0'
      return {
        hex: `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`,
        alpha: Number.parseInt(alphaHex + alphaHex, 16) / 255
      }
    }
    if (trimmed.length === 7) {
      return { hex: trimmed, alpha: 1 }
    }
    if (trimmed.length === 9) {
      return {
        hex: trimmed.slice(0, 7),
        alpha: Number.parseInt(trimmed.slice(7), 16) / 255
      }
    }
  }

  // rgb(r, g, b) - alpha = 1
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Number.parseInt(rgbMatch[1], 10)
    const g = Number.parseInt(rgbMatch[2], 10)
    const b = Number.parseInt(rgbMatch[3], 10)
    return {
      hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      alpha: 1
    }
  }

  // rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i)
  if (rgbaMatch?.[1] && rgbaMatch[2] && rgbaMatch[3] && rgbaMatch[4]) {
    const r = Number.parseInt(rgbaMatch[1], 10)
    const g = Number.parseInt(rgbaMatch[2], 10)
    const b = Number.parseInt(rgbaMatch[3], 10)
    const a = Number.parseFloat(rgbaMatch[4])
    return {
      hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      alpha: a
    }
  }

  // Not a simple color (hsl, gradient, etc.)
  return null
}

/**
 * Convert hex + alpha to CSS color string
 */
function hexAlphaToCSS(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)

  if (alpha >= 1) {
    return hex
  }
  const roundedAlpha = Math.round(alpha * 100) / 100
  return `rgba(${r}, ${g}, ${b}, ${roundedAlpha})`
}

/**
 * Check if the value is a gradient (not editable with color picker)
 */
function isGradient(value: string): boolean {
  if (!value) return false
  const trimmed = value.trim().toLowerCase()
  return (
    trimmed.startsWith('linear-gradient') ||
    trimmed.startsWith('radial-gradient') ||
    trimmed.startsWith('conic-gradient')
  )
}

/**
 * Custom Sanity input for CSS values (colors, gradients, etc.)
 *
 * - Stores values as plain strings (any CSS value)
 * - Shows a color picker + alpha slider for simple hex/rgb/rgba colors
 * - Shows a color preview swatch for all values
 * - Allows typing any CSS value (gradients, hsl, etc.)
 */
export function CSSValueInput(props: StringInputProps) {
  const { value = '', onChange, elementProps } = props
  const [inputValue, setInputValue] = useState(value)

  const parsedColor = parseColorWithAlpha(value)
  const isGradientValue = isGradient(value)

  const [currentAlpha, setCurrentAlpha] = useState(parsedColor?.alpha ?? 1)

  const updateColorValue = useCallback(
    (hex: string, alpha: number) => {
      const newValue = hexAlphaToCSS(hex, alpha)
      setInputValue(newValue)
      setCurrentAlpha(alpha)
      onChange(newValue ? set(newValue) : unset())
    },
    [onChange]
  )

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value
      setInputValue(newValue)
      const parsed = parseColorWithAlpha(newValue)
      if (parsed) {
        setCurrentAlpha(parsed.alpha)
      }
      onChange(newValue ? set(newValue) : unset())
    },
    [onChange]
  )

  const handleColorPickerChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newHex = event.target.value
      updateColorValue(newHex, currentAlpha)
    },
    [currentAlpha, updateColorValue]
  )

  const handleAlphaChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newAlpha = Number.parseFloat(event.target.value)
      if (parsedColor) {
        updateColorValue(parsedColor.hex, newAlpha)
      }
    },
    [parsedColor, updateColorValue]
  )

  if (value !== inputValue && value !== undefined) {
    setInputValue(value)
    const parsed = parseColorWithAlpha(value)
    if (parsed && parsed.alpha !== currentAlpha) {
      setCurrentAlpha(parsed.alpha)
    }
  }

  const showColorControls = parsedColor && !isGradientValue

  return (
    <Flex gap={2} align='center'>
      <Box
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }}
      >
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: 4,
            border: '1px solid var(--card-border-color)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%),
                               linear-gradient(-45deg, #ccc 25%, transparent 25%),
                               linear-gradient(45deg, transparent 75%, #ccc 75%),
                               linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
          />
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background: value || 'transparent'
            }}
          />
          {showColorControls && (
            <input
              type='color'
              value={parsedColor.hex}
              onChange={handleColorPickerChange}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
              title='Pick a color'
            />
          )}
        </Box>

        {showColorControls && (
          <Flex align='center' gap={1} style={{ width: 36 }}>
            <input
              type='range'
              min='0'
              max='1'
              step='0.01'
              value={currentAlpha}
              onChange={handleAlphaChange}
              style={{
                width: 36,
                height: 12,
                cursor: 'pointer',
                accentColor: parsedColor.hex
              }}
              title={`Opacity: ${Math.round(currentAlpha * 100)}%`}
            />
          </Flex>
        )}
      </Box>

      <Box flex={1}>
        <TextInput
          {...elementProps}
          value={inputValue}
          onChange={handleTextChange}
          placeholder='CSS value (hex, rgba, gradient...)'
        />
      </Box>
    </Flex>
  )
}
