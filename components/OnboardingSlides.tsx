import { Image } from 'expo-image';
import { StyleSheet, View, Dimensions, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { usePalette } from '@/hooks/usePalette';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to Waste to Worth',
    text: 'Turn your waste into something valuable',
    icon: 'recycle'
  },
  {
    id: '2',
    title: 'Scan & Learn',
    text: 'Scan waste items to learn how to properly dispose or recycle them',
    icon: 'qr-code-scanner'
  },
  {
    id: '3',
    title: 'Join the Community',
    text: 'Connect with others who care about sustainable waste management',
    icon: 'groups'
  },
  {
    id: '4',
    title: "Let's Get Started",
    text: 'Start scanning and make a difference today',
    icon: 'play-arrow'
  }
];

export const OnboardingSlides = ({ onComplete }: { onComplete: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const palette = usePalette();

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <MaterialIcons
              name={slide.icon as any}
              size={100}
              color={palette.text}
              style={styles.icon}
            />
            <ThemedText style={styles.title}>{slide.title}</ThemedText>
            <ThemedText style={styles.text}>{slide.text}</ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToSlide(index)}
            style={[
              styles.paginationDot,
              {
                backgroundColor:
                  currentIndex === index ? palette.text : Colors.light.background,
                borderColor: palette.text
              }
            ]}
          />
        ))}
      </View>

      {currentIndex === slides.length - 1 && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.text }]}
          onPress={onComplete}
        >
          <ThemedText
            style={[styles.buttonText, { color: palette.background }]}
          >
            Get Started
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollView: {
    flex: 1
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  icon: {
    marginBottom: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    borderWidth: 1
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: Platform.OS === 'web' ? 20 : 40
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600'
  }
});
