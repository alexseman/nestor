import Repository from '@/utils/abstractions/repository.abstract';
import { PersonResult } from '@/resources/person/person.type';
import HttpException from '@/utils/exceptions/http.exception';
import { RowDataPacket } from 'mysql2/promise';
import DatabaseConnection from '@/database/databaseConnection';

class PersonRepository extends Repository {
    public constructor() {
        super();
        this.table = '`persons`';
    }

    public async groupsAbove(id: number): Promise<string[]> {
        const db = await DatabaseConnection.getInstanceAsync();
        const result = (
            await db.execute(
                `SELECT parent.name AS path
             FROM \`groups\` AS node,
                  \`groups\` AS parent
             WHERE node.lft BETWEEN parent.lft AND parent.rgt
               AND node.id = (SELECT p.group_id
                              FROM ${this.table} p
                              WHERE p.id = ?)
             ORDER BY parent.lft;`,
                [id]
            )
        )[0] as RowDataPacket[];

        return result.map((pathItem: RowDataPacket) => pathItem.path);
    }

    public async create(firstName: string, lastName: string, groupId: number) {
        const db = await DatabaseConnection.getInstanceAsync();
        await db.execute(
            `INSERT INTO ${this.table} (first_name, last_name, group_id)
             VALUES (?, ?, ?)`,
            [firstName, lastName, groupId]
        );
        return {
            first_name: firstName,
            last_name: lastName,
            group_id: groupId,
        };
    }

    public async update(
        id: number,
        fields: { first_name?: string; last_name?: string; group_id?: number }
    ) {
        const db = await DatabaseConnection.getInstanceAsync();
        const [current] = await db.execute(
            `SELECT first_name, last_name, group_id
             FROM ${this.table}
             WHERE id = ?`,
            [id]
        );

        if (!(current as []).length) {
            throw new HttpException(
                404,
                `Person with id of ${id} does not exist`
            );
        }

        const currentNode: PersonResult = (current as []).pop();
        const updatables: string | number[] = [id];
        const sql = Object.keys(fields)
            .map((field: string) => {
                const fieldValue = (fields as any)[field];
                updatables.push(fieldValue);
                (currentNode as any)[field] = fieldValue;
                return `${field} = ?`;
            })
            .join(',');

        if (updatables.length === 1) {
            throw new HttpException(400, `No fields set to update`);
        }

        await db.execute(
            `
                UPDATE ${this.table}
                SET ${sql}
                WHERE id = ?
            `,
            updatables
        );

        return currentNode;
    }

    public async delete(id: number) {
        const db = await DatabaseConnection.getInstanceAsync();
        await db.execute(
            `DELETE
             FROM ${this.table}
             WHERE id = ?`,
            [id]
        );
    }
}

export default PersonRepository;
