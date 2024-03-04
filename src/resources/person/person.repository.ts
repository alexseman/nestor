import { RowDataPacket } from 'mysql2/promise';
import Repository from '../../utils/abstractions/repository.abstract.js';
import { PersonResult } from './person.type.js';
import HttpException from '../../utils/exceptions/http.exception.js';
import GroupRepository from '../group/group.repository.js';
import PersonCreateUpdatePayloadType from '../../utils/types/personCreateUpdatePayload.type.js';

class PersonRepository extends Repository {
    static table: string = '`persons`';
    public constructor() {
        super();
    }

    public async groupsAbove(id: number): Promise<string[]> {
        const result = (
            await this.db.execute(
                `SELECT parent.name AS path
                 FROM ${GroupRepository.table} AS node,
                      ${GroupRepository.table} AS parent
                 WHERE node.lft BETWEEN parent.lft AND parent.rgt
                   AND node.id = (SELECT p.group_id
                                  FROM ${PersonRepository.table} p
                                  WHERE p.id = ?)
                 ORDER BY parent.lft;`,
                [id]
            )
        )[0] as RowDataPacket[];

        return result.map((pathItem: RowDataPacket) => pathItem.path);
    }

    public async create(
        payload: PersonCreateUpdatePayloadType
    ): Promise<PersonCreateUpdatePayloadType> {
        await this.db.execute(
            `INSERT INTO ${PersonRepository.table} (first_name, last_name, job_title, group_id)
             VALUES (?, ?, ?, ?)`,
            Object.values(payload)
        );
        return payload;
    }

    public async update(
        id: number,
        fields: PersonCreateUpdatePayloadType
    ): Promise<PersonResult> {
        const [current] = await this.db.execute(
            `SELECT first_name, last_name, group_id
             FROM ${PersonRepository.table}
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

        await this.db.execute(
            `
                UPDATE ${PersonRepository.table}
                SET ${sql}
                WHERE id = ?
            `,
            updatables
        );

        return currentNode;
    }

    public async delete(id: number) {
        await this.db.execute(
            `DELETE
             FROM ${PersonRepository.table}
             WHERE id = ?`,
            [id]
        );
    }
}

export default PersonRepository;
