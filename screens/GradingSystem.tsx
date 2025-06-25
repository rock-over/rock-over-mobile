import { FontAwesome6 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { THEME_COLORS } from '../constants/Theme';

interface GradingSystemProps {
    onComplete: (gradingSystem: string) => void;
}

interface GradingSystemOption {
    id: string;
    name: string;
    description: string;
    examples: string;
}

const gradingSystems: GradingSystemOption[] = [
    {
        id: 'yds',
        name: 'YDS (Yosemite Decimal System)',
        description: 'Most common in USA',
        examples: '5.1 - 5.15d'
    },
    {
        id: 'french',
        name: 'French',
        description: 'Popular in Europe',
        examples: '3a - 9c'
    },
    {
        id: 'uiaa',
        name: 'UIAA',
        description: 'International system',
        examples: 'I - XII+'
    },
    {
        id: 'british',
        name: 'British (E-grade)',
        description: 'UK traditional climbing',
        examples: 'M - E11'
    },
    {
        id: 'v-scale',
        name: 'V-Scale',
        description: 'Bouldering standard',
        examples: 'VB - V17'
    },
    {
        id: 'font',
        name: 'Font (Fontainebleau)',
        description: 'European bouldering',
        examples: '3 - 9A'
    }
];

export default function GradingSystem({ onComplete }: GradingSystemProps) {
    const [selectedSystem, setSelectedSystem] = useState<string>('yds');

    const handleSystemSelect = (systemId: string) => {
        setSelectedSystem(systemId);
    };

    const handleComplete = () => {
        onComplete(selectedSystem);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.bluePrimary} />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>RV</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Choose Grading System</Text>
                <Text style={styles.subtitle}>
                    Select your preferred climbing grade system. You can change this later in settings.
                </Text>

                {/* Grading Systems List */}
                <ScrollView style={styles.systemsList} showsVerticalScrollIndicator={false}>
                    {gradingSystems.map((system) => (
                        <TouchableOpacity
                            key={system.id}
                            style={[
                                styles.systemOption,
                                selectedSystem === system.id && styles.systemOptionSelected
                            ]}
                            onPress={() => handleSystemSelect(system.id)}
                        >
                            <View style={styles.systemContent}>
                                <Text style={[
                                    styles.systemName,
                                    selectedSystem === system.id && styles.systemNameSelected
                                ]}>
                                    {system.name}
                                </Text>
                                <Text style={[
                                    styles.systemDescription,
                                    selectedSystem === system.id && styles.systemDescriptionSelected
                                ]}>
                                    {system.description}
                                </Text>
                                <Text style={[
                                    styles.systemExamples,
                                    selectedSystem === system.id && styles.systemExamplesSelected
                                ]}>
                                    Examples: {system.examples}
                                </Text>
                            </View>
                            <View style={styles.systemIndicator}>
                                {selectedSystem === system.id && (
                                    <FontAwesome6 name="check" size={16} color="#FFF" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Button */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                        <Text style={styles.completeButtonText}>Complete Setup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.bluePrimary,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 16,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'left',
        marginBottom: 32,
        lineHeight: 24,
    },
    systemsList: {
        flex: 1,
        marginBottom: 24,
    },
    systemOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E9ECEF',
    },
    systemOptionSelected: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderColor: THEME_COLORS.bluePrimary,
    },
    systemContent: {
        flex: 1,
    },
    systemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    systemNameSelected: {
        color: '#FFF',
    },
    systemDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    systemDescriptionSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    systemExamples: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    systemExamplesSelected: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    systemIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        // Removed gap since we only have one button now
    },
    completeButton: {
        backgroundColor: THEME_COLORS.bluePrimary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        minHeight: 48,
        justifyContent: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 