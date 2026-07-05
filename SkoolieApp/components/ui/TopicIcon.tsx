/**
 * TopicIcon — SVG icon for each topic system.
 * Maps topic name → canonical icon key → stroke path(s).
 */
import React from 'react'
import Svg, { Path, Circle, Line, Ellipse } from 'react-native-svg'
import { topicIconKey } from '@/constants/topics'

interface Props {
  topic: string
  size?: number
  color?: string
}

export function TopicIcon({ topic, size = 22, color = 'currentColor' }: Props) {
  const key = topicIconKey(topic)
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (key) {
    case 'heart':
      return (
        <Svg {...props}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
      )

    case 'lung':
      return (
        <Svg {...props}>
          <Path d="M12 4v5" />
          <Path d="M9.5 9h5" />
          <Path d="M9.5 9c-3 0-4 3-4 6 0 3 1 5 2.5 5 1 0 1.5-1 1.5-3V9" />
          <Path d="M14.5 9c3 0 4 3 4 6 0 3-1 5-2.5 5-1 0-1.5-1-1.5-3V9" />
        </Svg>
      )

    case 'kidney':
      return (
        <Svg {...props}>
          <Path d="M12 3C8 3 5 7 5 11c0 3 1.5 5.5 4 7 1 .6 1.5 1.5 1.5 3H14c0-1.5.5-2.4 1.5-3 2.5-1.5 4-4 4-7 0-4-3-8-7.5-8z" />
          <Path d="M10.5 14c.8.3 1.5.5 1.5.5s.7-.2 1.5-.5" />
        </Svg>
      )

    case 'blood':
      return (
        <Svg {...props}>
          <Path d="M12 2C8 7.5 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6.5-6-12z" />
          <Line x1="12" y1="11" x2="12" y2="17" />
          <Line x1="9" y1="14" x2="15" y2="14" />
        </Svg>
      )

    case 'flask':
      return (
        <Svg {...props}>
          <Path d="M9 3h6" />
          <Path d="M10 3v5.5L5.6 16.5a1.5 1.5 0 0 0 1.3 2.2h10.2a1.5 1.5 0 0 0 1.3-2.2L14 8.5V3" />
          <Path d="M7.7 14.5h8.6" />
        </Svg>
      )

    case 'virus':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="4.5" />
          <Line x1="12" y1="3" x2="12" y2="5.5" />
          <Line x1="12" y1="18.5" x2="12" y2="21" />
          <Line x1="3" y1="12" x2="5.5" y2="12" />
          <Line x1="18.5" y1="12" x2="21" y2="12" />
          <Line x1="5.6" y1="5.6" x2="7.4" y2="7.4" />
          <Line x1="16.6" y1="16.6" x2="18.4" y2="18.4" />
          <Line x1="18.4" y1="5.6" x2="16.6" y2="7.4" />
          <Line x1="7.4" y1="16.6" x2="5.6" y2="18.4" />
        </Svg>
      )

    case 'venus':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="8" r="5" />
          <Path d="M12 13v8" />
          <Path d="M9 18h6" />
        </Svg>
      )

    case 'baby':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="8" r="5.5" />
          <Path d="M9.7 7.6h.01" />
          <Path d="M14.3 7.6h.01" />
          <Path d="M9.9 10.6a3 3 0 0 0 4.2 0" />
          <Path d="M6.5 21c0-3 2.2-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
        </Svg>
      )

    case 'brain':
      return (
        <Svg {...props}>
          <Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" />
          <Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" />
        </Svg>
      )

    case 'gi':
      return (
        <Svg {...props}>
          <Path d="M6 3h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h6" />
        </Svg>
      )

    case 'bone':
      return (
        <Svg {...props}>
          <Path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0-2.5 2.5c0 .81.7 1.8 0 2.5l-6 6c-.7.7-1.69 0-2.5 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 2.5-2.5c0-.81-.7-1.8 0-2.5l6-6z" />
        </Svg>
      )

    case 'pill':
      return (
        <Svg {...props}>
          <Path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z" />
          <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
        </Svg>
      )

    case 'microscope':
      return (
        <Svg {...props}>
          <Path d="M6 18h8" />
          <Path d="M3 22h18" />
          <Path d="M14 22a7 7 0 1 0 0-14h-1" />
          <Path d="M9 14h.01" />
          <Path d="M9 6h6v4H9z" />
          <Path d="M12 6V3" />
        </Svg>
      )

    case 'thermometer':
      return (
        <Svg {...props}>
          <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </Svg>
      )

    case 'syringe':
      return (
        <Svg {...props}>
          <Path d="M18 2l4 4" />
          <Path d="m17 7 3-3" />
          <Path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-.6-.6a1 1 0 0 1 0-1.4L17 7" />
          <Path d="m9 11 4 4" />
          <Path d="m5 19-3 3" />
          <Path d="m14 4 6 6" />
        </Svg>
      )

    default: // book
      return (
        <Svg {...props}>
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
      )
  }
}
