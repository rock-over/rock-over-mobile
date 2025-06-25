import React, { useState } from 'react';
import GradingSystem from './GradingSystem';
import ProfilePhoto from './ProfilePhoto';

interface ProfileSetupProps {
    onComplete: (profileData: { photoUri: string; gradingSystem: string }) => void;
    onSkip: () => void;
}

export default function ProfileSetup({ onComplete, onSkip }: ProfileSetupProps) {
    const [currentStep, setCurrentStep] = useState<'photo' | 'grading'>('photo');
    const [profileData, setProfileData] = useState<{
        photoUri: string;
        gradingSystem: string;
    }>({
        photoUri: 'illustration_1', // Default to first illustration
        gradingSystem: 'yds'
    });

    const handlePhotoComplete = (photoUri: string) => {
        setProfileData(prev => ({ ...prev, photoUri }));
        setCurrentStep('grading');
    };

    const handlePhotoSkip = () => {
        // Keep default photo and go to grading
        setCurrentStep('grading');
    };

    const handleGradingComplete = (gradingSystem: string) => {
        const finalData = { ...profileData, gradingSystem };
        onComplete(finalData);
    };

    if (currentStep === 'photo') {
        return (
            <ProfilePhoto 
                onContinue={handlePhotoComplete}
                onSkip={handlePhotoSkip}
            />
        );
    }

    return (
        <GradingSystem 
            onComplete={handleGradingComplete}
        />
    );
} 