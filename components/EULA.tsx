import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface EULAProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function EULA({ onAccept, onDecline }: EULAProps) {
  const [selectedOption, setSelectedOption] = useState<'accept' | 'decline' | null>(null);

  const handleGoToProfile = () => {
    if (selectedOption === 'accept') {
      onAccept();
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Window-like container */}
      <View style={styles.windowContainer}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>End User License Agreement Terms</ThemedText>
        </View>
        
        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.title}>
            Research Consent and End User License Agreement
          </ThemedText>
          
          <ThemedText style={styles.researchTitle}>
            Research Title: Waste-To-Worth: Environmentally Transformative Use of Image Recognition and Artificial Intelligence
          </ThemedText>
          <ThemedText style={styles.researcher}>
            Principal Researcher: Yuri Andrei B. Morrison
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Introduction
          </ThemedText>
          <ThemedText style={styles.text}>
            We are BSIT students from San Beda College Alabang, and we would like to invite you to participate in our research about the effectiveness and impact of the Waste-To-Worth mobile application. The purpose of this research is to evaluate both the usability of the application and its potential to promote responsible recycling practices. By participating, you will help us gain valuable insights into how technology can encourage environmental sustainability.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Research Procedures
          </ThemedText>
          <ThemedText style={styles.text}>
            This research will involve your use of the Waste-To-Worth mobile application. Upon signup, you will be asked to provide consent confirming that you are at least 18 years old.
            {'\n\n'}The app will collect the following data during use:
            {'\n'}• Usage Data: such as item scans, time spent, and features accessed
            {'\n'}• Geolocation Data: only when the app is in use, to provide localized recycling guidance
            {'\n'}• Survey Responses: short in-app questionnaires that are voluntary
            {'\n'}• Device Information: such as operating system, to help improve performance
            {'\n\n'}All collected data is anonymized, encrypted, and securely stored. Data will only be retained for two months after your last detected activity, after which it will be securely deleted or fully anonymized.
            {'\n\n'}If at any time you choose to withdraw, your data will be immediately deleted upon request.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Voluntary Participation
          </ThemedText>
          <ThemedText style={styles.text}>
            Your participation in this research is entirely voluntary. You are free to stop using the app or withdraw from the study at any time without penalty.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Disclosure of Risks
          </ThemedText>
          <ThemedText style={styles.text}>
            Your participation in this study does not involve more than minimal risks. While there is no expected harm in using the application, you may decline to answer any survey questions and may disable location services if you prefer, though this may limit app functionality.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Benefits
          </ThemedText>
          <ThemedText style={styles.text}>
            By participating in this study, you will help us evaluate and improve the Waste-To-Worth application. Your contribution will assist in identifying ways technology can promote responsible waste disposal and encourage recycling practices that benefit both communities and the environment.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Anonymity and Confidentiality
          </ThemedText>
          <ThemedText style={styles.text}>
            We are committed to maintaining your privacy. All collected data is anonymized at the point of collection and will never include personally identifiable information. Data is stored securely with access limited to authorized researchers only. After the retention period, all records are permanently deleted.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Token of Appreciation
          </ThemedText>
          <ThemedText style={styles.text}>
            We understand that your time is valuable. As a participant, you will be receiving full access to the app and all its features for free.
          </ThemedText>

          <ThemedText style={styles.contactInfo}>
            We thank you for your time and participation. Should you have any questions, please feel free to contact our research team at 2022300133@sanbeda-alabang.edu.ph.
          </ThemedText>

          <ThemedText style={styles.signature}>
            Sincerely,{'\n\n'}Yuri Andrei B. Morrison{'\n'}Principal Researcher{'\n\n'}Mark Cherwin L. Alejandria{'\n'}Research Adviser
          </ThemedText>

          <ThemedText type="title" style={styles.eulaTitle}>
            Waste-To-Worth – End-User License Agreement (EULA)
          </ThemedText>
          <ThemedText style={styles.effectiveDate}>
            Effective Date: June 30, 2025{'\n'}Last Updated: September 6, 2025
          </ThemedText>

          <ThemedText style={styles.text}>
            This End-User License Agreement ("Agreement") is a legal agreement between you ("User") and the creators of the Waste-To-Worth app ("We", "Us", or "Developers"). By downloading, installing, or using the app, you agree to be bound by the terms of this Agreement.
            {'\n\n'}If you do not agree to the terms, do not download or use the app.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            1. License Grant
          </ThemedText>
          <ThemedText style={styles.text}>
            We grant you a non-exclusive, non-transferable, revocable license to use the Waste-To-Worth mobile application for personal, non-commercial purposes in accordance with this Agreement.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            2. Eligibility and User Responsibilities
          </ThemedText>
          <ThemedText style={styles.text}>
            By using this app, you confirm that you are at least 18 years old. Use by individuals under 18 years of age is strictly prohibited.
            {'\n\n'}By using the app, you agree to:
            {'\n'}• Use the app only for lawful purposes.
            {'\n'}• Accurately input information and refrain from misuse or manipulation of features.
            {'\n'}• Not attempt to reverse engineer, modify, or tamper with the app.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            3. Data Collection, Privacy, and Consent
          </ThemedText>
          <ThemedText style={styles.text}>
            Your consent to participate in data collection is required at signup before you can use the app.
            {'\n\n'}We collect data only for improving app functionality and analyzing recycling behavior. This may include:
            {'\n'}• Usage Data: item scans, time spent, and features accessed.
            {'\n'}• Geolocation Data: collected only when the app is in use and with your permission.
            {'\n'}• Survey Responses: voluntary feedback provided within the app.
            {'\n'}• Device Information: operating system type and version to improve performance.
            {'\n\n'}Anonymity and Confidentiality:
            {'\n'}• All data is anonymized at the point of collection to prevent identification of individuals.
            {'\n'}• Data is securely stored in encrypted databases, accessible only to authorized researchers.
            {'\n'}• Data is retained for two (2) months after your last detected activity and is then securely deleted or anonymized.
            {'\n'}• If you choose to withdraw, your data will be deleted immediately upon request.
            {'\n\n'}We do not sell, rent, or share your personal data with third parties.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            4. Intellectual Property
          </ThemedText>
          <ThemedText style={styles.text}>
            All content, logos, features, and software used in this app are the property of the Developers and are protected by copyright and intellectual property laws. You may not copy, distribute, or reuse any part of the app without written permission.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            5. Limitations of Liability
          </ThemedText>
          <ThemedText style={styles.text}>
            Waste-To-Worth is provided "as is." We are not responsible for:
            {'\n'}• Incorrect disposal actions taken based on app suggestions.
            {'\n'}• Damage to your device or data loss due to app use.
            {'\n'}• Environmental or legal consequences resulting from misuse of the app.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            6. Updates and Modifications
          </ThemedText>
          <ThemedText style={styles.text}>
            We may update or change the app at any time to improve functionality or address issues. Continued use of the app after updates implies acceptance of the new terms.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            7. Termination
          </ThemedText>
          <ThemedText style={styles.text}>
            We reserve the right to suspend or terminate access to the app for users who violate this Agreement or misuse the platform.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            8. Governing Law
          </ThemedText>
          <ThemedText style={styles.text}>
            This Agreement shall be governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the appropriate courts within this jurisdiction.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            9. Contact
          </ThemedText>
          <ThemedText style={styles.text}>
            For questions, feedback, or legal concerns, contact us at:
            {'\n'}2022300133@sanbeda-alabang.edu.ph
            {'\n'}Waste-To-Worth: Environmentally Transformative Use of Image Recognition and Artificial Intelligence
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            Acceptance
          </ThemedText>
          <ThemedText style={styles.text}>
            By downloading and using Waste-To-Worth, you confirm that you are at least 18 years old, have read, understood, and agree to the terms of this End-User License Agreement.
          </ThemedText>

          <ThemedText type="title" style={styles.privacyTitle}>
            Privacy Policy
          </ThemedText>
          <ThemedText style={styles.text}>
            At Waste-To-Worth, we respect your right to privacy and are committed to protecting your data. This Privacy Policy explains what information we collect, how we use it, and your rights as a user.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            1. Information We Collect
          </ThemedText>
          <ThemedText style={styles.text}>
            We collect the following information during app use:
            {'\n'}• Usage Data: item scans, features accessed, frequency and duration of app use.
            {'\n'}• Geolocation Data: used to provide location-specific recycling instructions, collected only with your permission.
            {'\n'}• Survey Responses: short voluntary in-app questionnaires.
            {'\n'}• Device Information: operating system type and version to improve app performance.
            {'\n\n'}We do not collect sensitive personal identifiers (e.g., name, email, phone number) unless required for consent or follow-up communication.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            2. How We Use Your Information
          </ThemedText>
          <ThemedText style={styles.text}>
            We use collected data to:
            {'\n'}• Improve app functionality and user experience.
            {'\n'}• Provide accurate and localized recycling guidance.
            {'\n'}• Analyze recycling trends and behavioral changes.
            {'\n\n'}All data is anonymized and aggregated for analysis. No personally identifiable information is stored or published.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            3. Data Storage, Retention, and Security
          </ThemedText>
          <ThemedText style={styles.text}>
            • Data is stored securely using encrypted databases and restricted access protocols.
            {'\n'}• Data is retained for two months after your last detected activity, after which it is permanently deleted or anonymized.
            {'\n'}• If you withdraw, your data will be deleted immediately upon request.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            4. User Rights
          </ThemedText>
          <ThemedText style={styles.text}>
            As a user, you have the right to:
            {'\n'}• Access the data we have collected about you.
            {'\n'}• Withdraw from the study at any time.
            {'\n'}• Request immediate deletion of your usage data and survey responses.
            {'\n'}• Decline location access (with limited functionality).
            {'\n\n'}Contact us at 2022300133@sanbeda-alabang.edu.ph to exercise these rights.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            5. Third-Party Sharing
          </ThemedText>
          <ThemedText style={styles.text}>
            We do not sell, rent, or share your data with third parties. Any reports or publications using app data will present only anonymized and aggregated results.
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>
            6. Policy Updates
          </ThemedText>
          <ThemedText style={styles.text}>
            This Privacy Policy may be updated periodically. You will be notified of any significant changes through the app. Continued use of the app indicates your acceptance of the updated policy.
          </ThemedText>
        </ScrollView>
        
        {/* Radio buttons and action area */}
        <View style={styles.actionArea}>
          <View style={styles.radioContainer}>
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSelectedOption('accept')}
            >
              <View style={styles.radioButton}>
                {selectedOption === 'accept' && <View style={styles.radioButtonSelected} />}
              </View>
              <ThemedText style={styles.radioText}>I accept the terms and conditions</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSelectedOption('decline')}
            >
              <View style={styles.radioButton}>
                {selectedOption === 'decline' && <View style={styles.radioButtonSelected} />}
              </View>
              <ThemedText style={styles.radioText}>I decline the terms and conditions</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.startScanningButton, selectedOption !== 'accept' && styles.disabledButton]} 
              onPress={handleGoToProfile}
              disabled={selectedOption !== 'accept'}
            >
              <ThemedText style={[styles.startScanningButtonText, selectedOption !== 'accept' && styles.disabledButtonText]}>
                Go to Profile
              </ThemedText>
            </TouchableOpacity>
            
            {selectedOption === 'decline' && (
              <TouchableOpacity style={styles.backButton} onPress={onDecline}>
                <ThemedText style={styles.backButtonText}>Back to Sign Up</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  windowContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: Platform.OS === 'web' ? 400 : 300,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
    color: '#333',
  },
  researchTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 8,
    color: '#333',
    fontStyle: 'italic',
  },
  researcher: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  contactInfo: {
    fontSize: 9,
    lineHeight: 13,
    color: '#555',
    marginBottom: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  signature: {
    fontSize: 9,
    lineHeight: 13,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  eulaTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  effectiveDate: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  privacyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 9,
    lineHeight: 13,
    color: '#555',
    marginBottom: 8,
  },
  actionArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  radioContainer: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00630F',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00630F',
  },
  radioText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  startScanningButton: {
    backgroundColor: '#00630F',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  startScanningButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#999999',
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});