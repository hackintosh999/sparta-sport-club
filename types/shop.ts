export interface Product {
    id: string;
    title: string;
    price: number;
    category: string;
    description: string;
    imageUrl: string;
    colors?: string[];
    colorImages?: Record<string, string>; // Maps color name to an image URL
    sizes?: string[]; // S, M, L, XL, etc.
    gallery?: string[]; // Additional images
    specifications?: Record<string, string>; // Material: Cotton, Weight: 200g
    rating?: number;
    reviews?: Review[];
    orderLink?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    createdAt: any;
    updatedAt?: any;
    likes?: string[]; // Array of userIds
    replies?: ReviewReply[];
    photos?: string[];
    video?: string;
}

export interface ReviewReply {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    comment: string;
    createdAt: any;
}

export interface Order {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    productId: string;
    productTitle: string;
    status: 'new' | 'processing' | 'completed' | 'cancelled';
    createdAt: any;
}
export interface User {
    id: string;
    email: string;
    role: 'user' | 'admin';
    status: 'active' | 'deleted';
    parentName: string;
    parentPhone: string;
    childName: string;
    childAge: number;
    childGender?: 'male' | 'female';
    balance: number;
    bonuses: number;
    groupId?: string; // ID of the group
    achievements?: UserAchievement[];
    createdAt: any;
}

export interface Group {
    id: string;
    name: string;
    ageRange: {
        min: number;
        max: number;
    };
    coachId: string;
    schedule: ScheduleItem[];
    createdAt: any;
    // Status Fields
    currentStatus?: 'normal' | 'cancelled' | 'substitute';
    statusMessage?: string; // Reason for cancellation or other note
    substituteCoachId?: string; // ID of the substitute coach
}

export interface ScheduleItem {
    day: string; // "Понедельник"
    time: string; // "18:00"
    activity: string; // "ОФП"
}

export interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    category: string;
    type: '2d' | '3d';
    mediaUrl: string; // Image URL or GLB URL
    rarity: 'common' | 'rare' | 'legendary';
    createdAt: any;
}

export interface UserAchievement {
    id: string; // Unique ID for this specific award
    definitionId: string;
    date: any;
    reason?: string;
    grantedBy?: string;
    isNew?: boolean;
}

// User Profile Extensions
export type ExperienceLevel = 'newbie' | 'amateur' | 'pro';

export interface User {
    // ... existing properties merged ...
    experienceLevel?: ExperienceLevel;
    otherSports?: string;
    preferredSchedule?: {
        days: string[];
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'any';
    };
    ban?: BanDetails;
}

export interface BanDetails {
    isBanned: boolean;
    type: 'account' | 'device' | 'ip';
    reason: string;
    expiresAt: number | null; // Timestamp (null = forever)
    bannedAt: number;
    bannedBy: string;
    deviceFingerprint?: string; // If device ban
    ipAddress?: string; // If ip ban
}

export interface Group {
    // ... existing properties merged ...
    difficultyLevel?: ExperienceLevel;
}
