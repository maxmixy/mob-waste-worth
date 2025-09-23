import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableWithoutFeedback,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  style?: any;
  inputStyle?: any;
  labelStyle?: any;
  error?: string;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  style,
  inputStyle,
  labelStyle,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    // Keep label hidden when there's text, regardless of focus state
    if (text && !isFocused) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelStyleAnimated = {
    position: 'absolute' as const,
    left: 16,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, -8],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#666', '#2D5016'],
    }),
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', 'rgba(245, 255, 251, 1)'],
    }),
    paddingHorizontal: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
    zIndex: 2,
    opacity: (isFocused || value) ? 0 : 1, // Hide label when focused OR when there's text
  };

  const inputStyleAnimated = {
    borderColor: error && !isFocused ? '#FF4444' : (isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)'),
    borderWidth: 1,
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.Text style={[labelStyleAnimated, labelStyle]}>
        {label}
      </Animated.Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyleAnimated, inputStyle]}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor="#999"
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          spellCheck={false}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color="rgba(102, 102, 102, 0.6)"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: 16,
    paddingTop: 20, // Make room for floating label
    paddingRight: 50, // Make room for eye icon
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    color: '#2D5016',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12, // Half of icon size to center it
    padding: 4,
  },
});
