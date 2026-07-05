import { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleProp, ViewStyle, TextStyle, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  inputStyle?: StyleProp<TextStyle>
  containerStyle?: StyleProp<ViewStyle>
}

/** Password field with a show/hide (eye) toggle. */
export function PasswordInput({ inputStyle, containerStyle, ...props }: Props) {
  const C = useTheme()
  const [show, setShow] = useState(false)
  return (
    <View style={[{ position: 'relative' }, containerStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!show}
        style={[inputStyle, { paddingRight: 48 }]}
      />
      <TouchableOpacity
        onPress={() => setShow(s => !s)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textFaint} />
      </TouchableOpacity>
    </View>
  )
}
