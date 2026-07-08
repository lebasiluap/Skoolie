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

    case 'dna':
      return (
        <Svg {...props}>
          <Path d="M9 3c0 5 6 5 6 9s-6 4-6 9" />
          <Path d="M15 3c0 5-6 5-6 9s6 4 6 9" />
          <Line x1="9.6" y1="7" x2="14.4" y2="7" />
          <Line x1="9" y1="12" x2="15" y2="12" />
          <Line x1="9.6" y1="17" x2="14.4" y2="17" />
        </Svg>
      )

    case 'people':
      return (
        <Svg {...props}>
          <Circle cx="9" cy="8" r="3" />
          <Path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" />
          <Circle cx="16.5" cy="9" r="2.4" />
          <Path d="M16.5 15c2.4 0 4 2 4 5" />
        </Svg>
      )

    case 'clipboard':
      return (
        <Svg {...props}>
          <Path d="M9 4h6v3H9z" />
          <Path d="M15 4h2.5A1.5 1.5 0 0 1 19 5.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-14A1.5 1.5 0 0 1 6.5 4H9" />
          <Line x1="12" y1="11" x2="12" y2="17" />
          <Line x1="9" y1="14" x2="15" y2="14" />
        </Svg>
      )

    case 'shield':
      return (
        <Svg {...props}>
          <Path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
          <Line x1="12" y1="9" x2="12" y2="15" />
          <Line x1="9" y1="12" x2="15" y2="12" />
        </Svg>
      )

    case 'mother':
      return (
        <Svg {...props}>
          <Circle cx="9.5" cy="6.5" r="3" />
          <Path d="M4.5 21c0-4 2-7 5-7 1.9 0 3.4 1.1 4.2 2.8" />
          <Circle cx="17" cy="14.5" r="2.2" />
          <Path d="M14 21c0-2.4 1.3-4 3-4s3 1.6 3 4" />
        </Svg>
      )

    case 'scale':
      return (
        <Svg {...props}>
          <Line x1="12" y1="4" x2="12" y2="20" />
          <Path d="M9 20h6" />
          <Line x1="5" y1="7" x2="19" y2="7" />
          <Path d="M2.8 12.5a2.6 2.6 0 0 0 4.4 0L5 7.5z" />
          <Path d="M16.8 12.5a2.6 2.6 0 0 0 4.4 0L19 7.5z" />
        </Svg>
      )

    case 'calculator':
      return (
        <Svg {...props}>
          <Path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <Path d="M8.5 6.5h7V10h-7z" />
          <Line x1="9" y1="13.5" x2="9.01" y2="13.5" />
          <Line x1="12" y1="13.5" x2="12.01" y2="13.5" />
          <Line x1="15" y1="13.5" x2="15.01" y2="13.5" />
          <Line x1="9" y1="17" x2="9.01" y2="17" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
          <Line x1="15" y1="17" x2="15.01" y2="17" />
        </Svg>
      )

    case 'chatheart':
      return (
        <Svg {...props}>
          <Path d="M21 11.3c0 4-4 7.2-9 7.2-1 0-2-.13-2.9-.38L4 19.8l1.3-3.7C4 14.7 3 13.1 3 11.3 3 7.3 7 4 12 4s9 3.3 9 7.3z" />
          <Path d="M12 14.2s-2.7-1.6-2.7-3.4c0-.95.75-1.65 1.6-1.65.47 0 .87.2 1.1.55.23-.35.63-.55 1.1-.55.85 0 1.6.7 1.6 1.65 0 1.8-2.7 3.4-2.7 3.4z" />
        </Svg>
      )

    case 'eye':
      return (
        <Svg {...props}>
          <Path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      )

    case 'chart':
      return (
        <Svg {...props}>
          <Path d="M4 19h16" />
          <Path d="M4 15l4-4 4 3 6-6" />
          <Path d="M15 8h3v3" />
        </Svg>
      )

    case 'curve':
      return (
        <Svg {...props}>
          <Path d="M4 4v16h16" />
          <Path d="M5.5 17c1-8 2.8-10.5 4.5-10.5s4 5.5 9 8.5" />
        </Svg>
      )

    case 'badge':
      return (
        <Svg {...props}>
          <Path d="M4 6h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
          <Circle cx="8.5" cy="11" r="2" />
          <Path d="M5.5 16.5c.5-1.5 1.6-2.4 3-2.4s2.5.9 3 2.4" />
          <Line x1="14.5" y1="10" x2="19" y2="10" />
          <Line x1="14.5" y1="14" x2="17.5" y2="14" />
        </Svg>
      )

    case 'mind':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="8.5" />
          <Path d="M8.5 12A3.5 3.5 0 0 1 12 8.5 3.5 3.5 0 0 1 15.5 12 3.5 3.5 0 0 1 12 15.5" />
        </Svg>
      )

    case 'globe':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="9" />
          <Line x1="3" y1="12" x2="21" y2="12" />
          <Ellipse cx="12" cy="12" rx="4" ry="9" />
        </Svg>
      )

    case 'scissors':
      return (
        <Svg {...props}>
          <Circle cx="6" cy="6" r="2.5" />
          <Circle cx="6" cy="18" r="2.5" />
          <Line x1="20" y1="4" x2="8.1" y2="15.9" />
          <Line x1="14.5" y1="14.5" x2="20" y2="20" />
          <Line x1="8.1" y1="8.1" x2="12" y2="12" />
        </Svg>
      )

    case 'drop':
      return (
        <Svg {...props}>
          <Path d="M12 3c-3.5 4.5-5.5 7.5-5.5 10a5.5 5.5 0 0 0 11 0c0-2.5-2-5.5-5.5-10z" />
          <Path d="M9 14.5c1 .8 2 .8 3 0s2-.8 3 0" />
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
