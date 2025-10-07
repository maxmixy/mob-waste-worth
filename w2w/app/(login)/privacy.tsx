import React from 'react';
import { StyleSheet, View, ScrollView, Platform, Pressable, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function PrivacyScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:morrisonyuriandrei2@gmail.com');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>Privacy Policy</ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Header with Logo */}
        <ThemedView style={styles.headerSection}>
          <Image
            source={require('@/assets/images/logo animation 3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="title" style={styles.appTitle}>Waste to Worth</ThemedText>
          <ThemedText style={styles.tagline}>Transforming waste into valuable resources</ThemedText>
          <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
        </ThemedView>

        {/* Privacy Policy Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Privacy Policy</ThemedText>
          <ThemedText style={styles.sectionText}>
            Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information when you use our waste management app. We are committed to maintaining the confidentiality and security of your data while providing you with the best possible experience.
          </ThemedText>
        </ThemedView>

        {/* Data Collection Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data Collection</ThemedText>
          <ThemedText style={styles.sectionText}>
            We collect information you provide directly to us, such as when you create an account, complete your profile, or use our services. This may include personal information, profile photos, posts and comments, and usage data to help us improve our services and provide you with a personalized experience.
          </ThemedText>
        </ThemedView>

        {/* Data Usage Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>How We Use Your Data</ThemedText>
          <ThemedText style={styles.sectionText}>
            We use the information we collect to provide and improve our services, personalize your experience, communicate with you about updates and features, and ensure the security and integrity of our platform. Your data helps us create a better, more tailored experience for all our users.
          </ThemedText>
        </ThemedView>

        {/* Data Sharing Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data Sharing</ThemedText>
          <ThemedText style={styles.sectionText}>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this privacy policy. We respect your privacy and are committed to protecting your personal information.
          </ThemedText>
        </ThemedView>

        {/* Data Security Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data Security</ThemedText>
          <ThemedText style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted and stored securely using industry-standard practices.
          </ThemedText>
        </ThemedView>

        {/* Your Rights Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Your Rights</ThemedText>
          <ThemedText style={styles.sectionText}>
            You have the right to access your personal information, correct inaccurate information, delete your account and data, and opt out of certain communications. We are committed to respecting and protecting your privacy rights.
          </ThemedText>
        </ThemedView>

        {/* Contact Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Contact Us</ThemedText>
          <ThemedText style={styles.sectionText}>
            If you have any questions about this privacy policy or our data practices, please contact us.
          </ThemedText>
          
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <ThemedText style={styles.contactButtonText}>📧 Contact Support</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: '#00630F',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
  },
  headerSection: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    padding: 24,
    marginBottom: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' }),
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00630F',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  version: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00630F',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#00630F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
