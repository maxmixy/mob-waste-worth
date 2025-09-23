import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LogoLoadingAnimation from '@/components/LogoLoadingAnimation';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

interface EducationalContent {
  id: string;
  material_name: string;
  title: string;
  content: string;
  fun_fact: string;
  recycling_tip: string;
  environmental_impact: string;
  created_at: string;
  updated_at: string;
}

interface EducationalContentModalProps {
  visible: boolean;
  onClose: () => void;
  content: EducationalContent | null;
  loading: boolean;
  materialName: string;
}

export default function EducationalContentModal({
  visible,
  onClose,
  content,
  loading,
  materialName,
}: EducationalContentModalProps) {
  // Always use light theme
  const colors = Colors.light;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LogoLoadingAnimation size={100} showBackground={false} />
        </View>
      );
    }

    if (!content) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.text} />
          <ThemedText style={styles.errorText}>
            Unable to load educational content
          </ThemedText>
          <ThemedText style={styles.errorSubtext}>
            Please try again later
          </ThemedText>
        </View>
      );
    }

    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <MaterialIcons name="school" size={24} color={colors.primary} />
          </View>
          <ThemedText style={styles.title}>{content.title}</ThemedText>
        </View>

        {/* Main Content */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>📚 Learn About {content.material_name}</ThemedText>
          <ThemedText style={styles.mainContent}>{content.content}</ThemedText>
        </View>

        {/* Fun Fact */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>💡 Fun Fact</ThemedText>
          <View style={[styles.factContainer, { backgroundColor: colors.primary + '10' }]}>
            <MaterialIcons name="lightbulb-outline" size={20} color={colors.primary} />
            <ThemedText style={styles.factText}>{content.fun_fact}</ThemedText>
          </View>
        </View>

        {/* Recycling Tip */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>♻️ Recycling Tip</ThemedText>
          <View style={[styles.tipContainer, { backgroundColor: colors.tint + '10' }]}>
            <MaterialIcons name="eco" size={20} color={colors.tint} />
            <ThemedText style={styles.tipText}>{content.recycling_tip}</ThemedText>
          </View>
        </View>

        {/* Environmental Impact */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🌍 Environmental Impact</ThemedText>
          <View style={[styles.impactContainer, { backgroundColor: '#4CAF50' + '10' }]}>
            <MaterialIcons name="public" size={20} color="#4CAF50" />
            <ThemedText style={styles.impactText}>{content.environmental_impact}</ThemedText>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Keep learning and making a difference! 🌱
          </ThemedText>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.modalTitle}>Educational Content</ThemedText>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.background }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderContent()}

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mainContent: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  factText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  impactText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
