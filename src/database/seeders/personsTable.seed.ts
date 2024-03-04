import 'dotenv/config';
import { Connection, RowDataPacket } from 'mysql2/promise';
import DatabaseConnection from '@/database/databaseConnection.js';
import { faker } from '@faker-js/faker';

const getRandomBetween = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

async function run(): Promise<void> {
    const personsCountMedian: number = 10;
    const personsCountMedianVariation: number = 2;
    const db: Connection = await DatabaseConnection.getInstanceAsync();

    const groupsResult = (
        await db.query(
            `SELECT id
             FROM \`groups\`
            `
        )
    )[0] as RowDataPacket[];

    if (!groupsResult.length) {
        throw Error('No groups are present to associate with persons!');
    }

    groupsResult.map((g) => {
        let count = getRandomBetween(
            personsCountMedian - personsCountMedianVariation,
            personsCountMedian + personsCountMedianVariation
        );

        while (count > 0) {
            db.execute(
                `INSERT INTO \`persons\` (first_name, last_name, job_title, group_id)
                        VALUES (?, ?, ?)`,
                [
                    faker.person.firstName(),
                    faker.person.lastName(),
                    faker.person.jobTitle(),
                    g.id,
                ]
            );
            count--;
        }
    });
}

run();
