type Group = {
    id: number;
    name: string;
    parent_id: null | number;
    lft: number;
    rgt: number;
    created_at: string;
    updated_at: string;
};

export type GroupResult = {
    lft: null | number;
    rgt: null | number;
    name?: string;
    parent_id?: number;
    depth?: number;
};

export default Group;
