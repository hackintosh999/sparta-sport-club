import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

export const linkStudentToGroup = async (userId: string, childName: string, childAge: number, parentPhone: string, email: string) => {
    try {
        const normalizedName = childName.toLowerCase().trim();
        const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
        const cleanPhone = normalizePhone(parentPhone);

        const registryRef = collection(db, 'student_registry');

        console.log(`Attempting to link student: ${childName}, Phone: ${parentPhone} (Clean: ${cleanPhone})`);

        // Strategy 1: Match by Normalized Phone
        let q = query(registryRef, where('normalizedPhone', '==', cleanPhone), where('assignedUid', '==', null));
        let snapshot = await getDocs(q);

        // Fallback: Try exact parentPhone if normalized field missing (legacy data)
        if (snapshot.empty) {
            q = query(registryRef, where('parentPhone', '==', parentPhone), where('assignedUid', '==', null));
            snapshot = await getDocs(q);
        }

        // Strategy 2: Match by Child Name AND Age (Fuzzy but likely correct)
        if (snapshot.empty) {
            console.log("No match by phone, trying Name + Age...");
            q = query(
                registryRef,
                where('normalizedName', '==', normalizedName),
                where('age', '==', childAge),
                where('assignedUid', '==', null)
            );
            snapshot = await getDocs(q);
        }

        // Strategy 3: Match by Child Name only (If unique enough? Maybe too risky, skip for now or use as fallback)
        // skipping for safety.

        if (!snapshot.empty) {
            const match = snapshot.docs[0];
            const data = match.data();
            console.log("Found registry match:", data);

            if (data.targetGroupId) {
                const batch = writeBatch(db);

                // 1. Update User
                const userRef = doc(db, 'users', userId);
                batch.update(userRef, {
                    groupId: data.targetGroupId,
                    isLinked: true, // Internal flag
                    linkedAt: serverTimestamp()
                });

                // 2. Mark Registry as Assigned
                const regRef = doc(db, 'student_registry', match.id);
                batch.update(regRef, {
                    assignedUid: userId,
                    linkedAt: serverTimestamp(),
                    linkedEmail: email
                });

                // 3. Optional: Add to group's student count or log? 
                // Group student count is dynamic usually.

                await batch.commit();
                console.log(`Successfully linked User ${userId} to Group ${data.targetGroupId}`);
                return { success: true, groupId: data.targetGroupId, groupName: data.groupName || 'Unknown' };
            }
        } else {
            console.log("No matching student registry found.");
        }

        return { success: false };
    } catch (error) {
        console.error("Error linking student:", error);
        return { success: false, error };
    }
};
