type Person = {
    id: number;
    first_name: string;
    last_name: string;
    group_id: null | number;
    created_at: string;
    updated_at: string;
};

export type PersonResult = {
    first_name?: string;
    last_name?: string;
    group_id?: number;
};

export default Person;
