/**
 * Script to create fake clustered issues for test users
 * Run with: npx tsx scripts/createTestIssues.ts
 */

import 'dotenv/config';
import { loginWithEmail } from '../src/services/authService';
import { createAuthenticatedIssue } from '../src/data/issue';
import { IssueType } from '../src/generated/prisma/enums';
import jwt from 'jsonwebtoken';

// ... (names array unchanged)
const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Advaith', 'Aaryan', 'Dhruv', 'Kabir', 'Ritvik', 'Darsh',
    'Ananya', 'Aadhya', 'Myra', 'Sara', 'Ira', 'Aanya', 'Pari', 'Diya', 'Navya', 'Kiara',
    'Saanvi', 'Anika', 'Prisha', 'Anvi', 'Riya', 'Aarohi', 'Siya', 'Meera', 'Kavya', 'Avni',
    'Rohan', 'Rahul', 'Amit', 'Vikram', 'Sanjay', 'Raj', 'Nikhil', 'Prateek', 'Akash', 'Deepak',
    'Pooja', 'Neha', 'Priya', 'Anjali', 'Shruti', 'Divya', 'Sneha', 'Nisha', 'Kritika', 'Tanvi',
    'Karan', 'Varun', 'Harsh', 'Yash', 'Aryan', 'Dev', 'Manish', 'Suresh', 'Ramesh', 'Gaurav',
    'Simran', 'Jyoti', 'Sakshi', 'Komal', 'Swati', 'Tanya', 'Ritu', 'Megha', 'Pallavi', 'Sonal',
    'Arun', 'Vijay', 'Manoj', 'Rakesh', 'Pankaj', 'Sumit', 'Mohit', 'Ravi', 'Ajay', 'Sandeep',
    'Shivani', 'Rani', 'Geeta', 'Sunita', 'Rekha', 'Asha', 'Lata', 'Seema', 'Usha', 'Vandana',
];

const surnames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Rao', 'Nair', 'Menon',
    'Iyer', 'Agarwal', 'Jain', 'Shah', 'Kapoor', 'Malhotra', 'Chopra', 'Mehra', 'Bhatia', 'Khanna',
    'Saxena', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Shukla', 'Tripathi', 'Rastogi', 'Mathur',
    'Chauhan', 'Yadav', 'Thakur', 'Rajput', 'Rathore', 'Choudhary', 'Joshi', 'Kulkarni', 'Deshpande', 'Patil',
    'Kaur', 'Gandhi', 'Modi', 'Desai', 'Trivedi', 'Mehta', 'Parikh', 'Dave', 'Bhatt', 'Vyas',
    'Pillai', 'Kurup', 'Warrier', 'Das', 'Bose', 'Sen', 'Ghosh', 'Mukherjee', 'Banerjee', 'Chatterjee',
    'Roy', 'Dutta', 'Sarkar', 'Biswas', 'Mitra', 'Ray', 'Majumdar', 'Goswami', 'Nandi', 'Saha',
    'Hegde', 'Shetty', 'Gowda', 'Naidu', 'Varma', 'Chandra', 'Prasad', 'Murthy', 'Swamy', 'Sethi',
    'Arora', 'Tandon', 'Bajaj', 'Luthra', 'Anand', 'Suri', 'Sahni', 'Vohra', 'Grover', 'Bedi',
    'Oberoi', 'Madan', 'Ahuja', 'Dhawan', 'Kohli', 'Gill', 'Sodhi', 'Lamba', 'Walia', 'Narula',
];

const PASSWORD = 'Password@123';
const ISSUE_TYPES = Object.values(IssueType) as IssueType[];

// Delhi Bounding Box
const MIN_LAT = 28.60;
const MAX_LAT = 28.68;
const MIN_LNG = 77.18;
const MAX_LNG = 77.25;

interface Location {
    lat: number;
    lng: number;
}

const existingLocations: Location[] = [];
// ... (rest of the file)


function getRandomLocation(): Location {
    // 30% chance to pick a location near an existing issue (clustering)
    if (existingLocations.length > 0 && Math.random() < 0.3) {
        const base = existingLocations[Math.floor(Math.random() * existingLocations.length)]!;
        // Add small random offset (approx 100-500m)
        // 0.001 deg is roughly 111m
        const offsetLat = (Math.random() - 0.5) * 0.005;
        const offsetLng = (Math.random() - 0.5) * 0.005;

        return {
            lat: Math.max(MIN_LAT, Math.min(MAX_LAT, base.lat + offsetLat)),
            lng: Math.max(MIN_LNG, Math.min(MAX_LNG, base.lng + offsetLng))
        };
    }

    // Uniform random
    return {
        lat: MIN_LAT + Math.random() * (MAX_LAT - MIN_LAT),
        lng: MIN_LNG + Math.random() * (MAX_LNG - MIN_LNG)
    };
}

async function createIssues() {
    console.log('Starting to create clustered issues for 100 users...\n');
    let totalIssues = 0;
    let successCount = 0;
    let failCount = 0;

    const usedCombos = new Set<string>();

    // Optimized: Fetch users directly from DB
    const { prisma } = await import('../src/data/prisma/prismaClient');
    const users = await prisma.user.findMany({
        where: { email: { endsWith: '@gmail.com' } },
        take: 100
    });

    console.log(`Found ${users.length} users in database.`);

    let usersProcessed = 0;
    for (const user of users) {
        try {
            // 2. Create 2 issues
            for (let i = 0; i < 2; i++) {
                const loc = getRandomLocation();
                const type = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)]!;

                await createAuthenticatedIssue(
                    `Reported ${type.replace(/_/g, ' ').toLowerCase()}`,
                    "Test description lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                    loc.lat,
                    loc.lng,
                    type,
                    user.id
                );

                existingLocations.push(loc);
                totalIssues++;
                successCount++;
            }
            usersProcessed++;
            process.stdout.write(`\rProcessed ${usersProcessed}/100 users, Created ${totalIssues} issues...`);

        } catch (err: any) {
            console.error(`\nError for user ${user.email}:`, err.message);
        }
    }

    console.log(`\n========================================`);
    console.log(`Processed: ${usersProcessed} users`);
    console.log(`Total Issues Created: ${totalIssues}`);
    console.log(`========================================`);
}

createIssues()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Script failed:', err);
        process.exit(1);
    });