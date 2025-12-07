/**
 * Script to create 100 fake users via the registration API
 * Run with: npx tsx scripts/createTestUsers.ts
 */

import 'dotenv/config';
import { registerWithEmail } from '../src/services/authService';

// Lists of unique first names and surnames
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

async function createUsers() {
    console.log('Starting to create 100 test users...\n');

    const usedCombos = new Set<string>();
    let created = 0;
    let failed = 0;

    while (created < 100) {
        // Pick random first name and surname
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]!;
        const surname = surnames[Math.floor(Math.random() * surnames.length)]!;
        const combo = `${firstName}.${surname}`;

        // Skip if already used
        if (usedCombos.has(combo.toLowerCase())) {
            continue;
        }
        usedCombos.add(combo.toLowerCase());

        const email = `${firstName.toLowerCase()}.${surname.toLowerCase()}@gmail.com`;
        const name = `${firstName} ${surname}`;

        try {
            await registerWithEmail(email, PASSWORD, name);
            created++;
            console.log(`✓ Created user ${created}: ${name} (${email})`);
        } catch (err: any) {
            if (err.message?.includes('already exists')) {
                console.log(`⚠ User already exists: ${email}`);
            } else {
                failed++;
                console.error(`✗ Failed to create ${email}:`, err.message);
            }
        }
    }

    console.log(`\n========================================`);
    console.log(`Created: ${created} users`);
    console.log(`Failed: ${failed} users`);
    console.log(`========================================`);
    console.log(`\nAll users have password: ${PASSWORD}`);
}

createUsers()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Script failed:', err);
        process.exit(1);
    });
