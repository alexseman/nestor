import 'dotenv/config';
import { faker } from '@faker-js/faker';
import DatabaseConnection from '@/database/databaseConnection.js';
import { Connection, RowDataPacket } from 'mysql2/promise';

type NodeBounds = {
    lft: number;
    rgt: number;
};

const getRandomBetween = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

async function insertGroups(
    parentId: null | number | RowDataPacket,
    count: number = 1
): Promise<RowDataPacket[]> {
    const db: Connection = await DatabaseConnection.getInstanceAsync();

    const getParentBounds = async (): Promise<NodeBounds> => {
        if (!parentId) {
            return {
                lft: 0,
                rgt: 1,
            };
        }

        const [result] = await (db.execute(
            `SELECT lft, rgt
             FROM \`groups\`
             WHERE id = ?`,
            [parentId]
        ) as Promise<RowDataPacket[]>);

        if (!(result as []).length) {
            throw new Error(`Parent node with id of ${parentId} not found.`);
        }

        return (result as []).pop();
    };

    const createGroup = async (bounds: NodeBounds) => {
        await db.beginTransaction();
        await db.execute(
            `UPDATE \`groups\`
             SET rgt = rgt + 2
             WHERE rgt >= ?`,
            [bounds.rgt]
        );
        await db.execute(
            `UPDATE \`groups\`
             SET lft = lft + 2
             WHERE lft > ?`,
            [
                bounds.rgt - bounds.lft === 1 || !bounds.lft
                    ? bounds.lft
                    : bounds.rgt,
            ]
        );
        await db.execute(
            `INSERT INTO \`groups\` (lft, rgt, parent_id, name)
             VALUES (?, ?, ?, ?)`,
            [bounds.rgt, bounds.rgt + 1, parentId, faker.person.firstName()]
        );
        await db.commit();
    };

    const parentBounds = await getParentBounds();

    const getGroups = async () => {
        while (count > 0) {
            await createGroup(parentBounds);
            count--;
        }
    };

    await getGroups();
    const result = (
        await db.query(
            `SELECT id
             FROM \`groups\`
             WHERE parent_id ${parentId === null ? ' IS NULL ' : ' = ' + parentId}`
        )
    )[0] as RowDataPacket[];

    return result.map((r) => r.id);
}

async function create(
    depth: number,
    median: number,
    variation: number,
    parentIds: null | [] | RowDataPacket[]
) {
    if (!depth) {
        return;
    }

    if (!parentIds.length) {
        parentIds = await insertGroups(null, 1);
        await create(depth - 1, median, variation, parentIds);
    }

    let newParentsIds: [] | RowDataPacket[] = [];

    for (const parentId of parentIds) {
        const subGroupsCount = getRandomBetween(
            median - variation,
            median + variation
        );
        newParentsIds = await insertGroups(parentId, subGroupsCount);
    }

    await create(depth - 1, median, variation, newParentsIds);
}

async function run(): Promise<void> {
    const groupsHierarchyDept: number = 6;
    const subGroupsCountMedian: number = 3;
    const subGroupsCountVariation: number = 1;

    await create(
        groupsHierarchyDept,
        subGroupsCountMedian,
        subGroupsCountVariation,
        []
    );
}

run();
